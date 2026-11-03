import {
  MAX_SPEED, ACCEL, BRAKE, DECEL, OFFROAD_MAX, OFFROAD_DECEL, STEER, STEER_MIN, CENTRIFUGAL,
  ICE_RESPONSE, ICE_CENTRIFUGAL, ROAD_HALF, GRASS_LIMIT, CAR_W, HIT_DX, PLAYER_Z_OFF, SPAWN_AHEAD, SEG_LEN,
  CRASH_COOLDOWN, CRASH_SPEED_KEEP, DAY_LEN, UNITS_PER_KM, BANNER_TIME,
} from './config';
import { Road } from './road';
import { Traffic, Car } from './traffic';
import { conditionsAt, Conditions } from './daycycle';
import { quotaFor } from './scoring';
import type { Input } from './input';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore,
  loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export class Game {
  state: State = 'menu';
  road = new Road(1);
  traffic = new Traffic(1, PLAYER_Z_OFF + 6000);

  camZ = 0;
  playerX = 0; // lateral offset from the road centre (world units)
  playerVx = 0;
  speed = 0;
  braking = false;
  onGrass = false;

  day = 1;
  remaining = quotaFor(1); // cars still to pass today
  distance = 0; // world units travelled
  dayTime = 0; // seconds into the current day
  cond: Conditions = conditionsAt(0, 1);

  shake = 0;
  crashCd = 0;
  bannerT = 0;
  bannerText = '';
  mountainOff = 0;
  gameOverReason = '';

  time = 0;
  stateTime = 0;

  menuIndex = 0;
  pauseIndex = 0;
  initials = ['A', 'A', 'A'];
  initialsPos = 0;
  qualifiesForRank = false;

  settings: Settings = loadSettings();
  highScores: HighScore[] = loadHighScores();

  constructor(private input: Input, private audio: SoundFx) {
    this.audio.setMuted(!this.settings.sound);
  }

  get playerZ(): number {
    return this.camZ + PLAYER_Z_OFF;
  }

  get km(): number {
    return this.distance / UNITS_PER_KM;
  }

  get flags(): boolean {
    return this.remaining <= 0;
  }

  get speedPct(): number {
    return this.speed / MAX_SPEED;
  }

  // ---------- state transitions ----------

  startGame(): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.road = new Road(seed);
    this.traffic = new Traffic((seed ^ 0x9e3779b9) >>> 0, PLAYER_Z_OFF + 6000);
    this.camZ = 0;
    this.playerX = 0;
    this.playerVx = 0;
    this.speed = 0;
    this.day = 1;
    this.remaining = quotaFor(1);
    this.distance = 0;
    this.dayTime = 0;
    this.cond = conditionsAt(0, 1);
    this.shake = 0;
    this.crashCd = 0;
    this.mountainOff = 0;
    this.showBanner('DIA 1');
    this.setState('playing');
    this.audio.engineStart();
  }

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.bannerT = BANNER_TIME;
  }

  toggleCrt(): void {
    this.settings = { ...this.settings, crt: !this.settings.crt };
    saveSettings(this.settings);
  }

  toggleSound(): void {
    this.settings = { ...this.settings, sound: !this.settings.sound };
    saveSettings(this.settings);
    this.audio.setMuted(!this.settings.sound);
  }

  private goMenu(): void {
    this.audio.engineStop();
    this.setState('menu');
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    this.stateTime += dt;
    const inp = this.input;
    if (inp.justPressed('mute')) this.toggleSound();
    if (inp.justPressed('crt')) this.toggleCrt();

    switch (this.state) {
      case 'menu': this.updateMenu(); break;
      case 'howto':
      case 'ranking':
        if (inp.justPressed('confirm') || inp.justPressed('fire') || inp.justPressed('back') || inp.justPressed('pause')) {
          this.audio.blip();
          this.setState('menu');
        }
        break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused': this.updatePaused(); break;
      case 'gameover': this.updateGameOver(); break;
      case 'initials': this.updateInitials(); break;
    }
  }

  private updateMenu(): void {
    const inp = this.input;
    const n = MENU_ITEMS.length;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (this.menuIndex) {
        case 0: this.startGame(); break;
        case 1: this.setState('howto'); break;
        case 2: this.highScores = loadHighScores(); this.setState('ranking'); break;
        case 3: this.toggleCrt(); break;
        case 4: this.toggleSound(); break;
      }
    }
  }

  private updatePaused(): void {
    const inp = this.input;
    const n = PAUSE_ITEMS.length;
    if (inp.justPressed('up')) { this.pauseIndex = (this.pauseIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.pauseIndex = (this.pauseIndex + 1) % n; this.audio.blip(); }
    if (inp.justPressed('pause')) { this.resume(); return; }
    if (inp.justPressed('back')) { this.goMenu(); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.resume();
      else this.goMenu();
    }
  }

  private resume(): void {
    this.setState('playing');
    this.audio.engineStart();
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.audio.engineStop();
      this.setState('paused');
      return;
    }

    // Throttle / brake
    const accel = inp.isDown('up') || inp.isDown('fire');
    this.braking = inp.isDown('down');
    if (this.braking) this.speed -= BRAKE * dt;
    else if (accel) this.speed += ACCEL * dt;
    else this.speed -= DECEL * dt;

    this.onGrass = Math.abs(this.playerX) + CAR_W / 2 > ROAD_HALF;
    if (this.onGrass && this.speed > OFFROAD_MAX) {
      this.speed -= OFFROAD_DECEL * dt;
      this.shake = Math.max(this.shake, 0.08);
    }
    this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed));
    const pct = this.speedPct;

    // Steering (with inertia on ice)
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const target = dir * STEER * (STEER_MIN + (1 - STEER_MIN) * pct);
    if (this.cond.icy > 0.5) this.playerVx += (target - this.playerVx) * Math.min(1, ICE_RESPONSE * dt);
    else this.playerVx = target;
    this.playerX += this.playerVx * dt;

    // Curves push the car outwards
    const curve = this.road.curveAt(this.playerZ);
    const cent = CENTRIFUGAL * (1 + this.cond.icy * (ICE_CENTRIFUGAL - 1));
    this.playerX -= curve * this.speed * cent * dt;
    this.playerX = Math.max(-GRASS_LIMIT, Math.min(GRASS_LIMIT, this.playerX));

    // Forward motion
    const step = this.speed * dt;
    this.camZ += step;
    this.distance += step;
    this.mountainOff += curve * pct * 40 * dt;
    this.road.ensure(this.camZ + SPAWN_AHEAD + SEG_LEN * 4);

    // Traffic
    this.traffic.spawn(this.camZ + SPAWN_AHEAD, this.day);
    const r = this.traffic.update(dt, this.playerZ, this.camZ);
    if (!this.flags) {
      if (r.passed > 0) {
        this.remaining -= r.passed;
        this.audio.pass();
        if (this.remaining <= 0) {
          this.remaining = 0;
          this.audio.flags();
        }
      }
      if (r.passedBy > 0 && !this.flags) this.remaining += r.passedBy;
    }

    this.crashCd -= dt;
    if (this.crashCd <= 0) {
      const c = this.traffic.collision(this.playerZ, this.playerX);
      if (c) this.crash(c);
    }

    // Clock
    this.dayTime += dt;
    this.cond = conditionsAt(this.dayTime / DAY_LEN, this.day);
    if (this.dayTime >= DAY_LEN) {
      if (this.flags) this.nextDay();
      else { this.endGame(); return; }
    }

    this.shake = Math.max(0, this.shake - dt);
    this.bannerT -= dt;
    this.audio.engineSet(pct, this.onGrass && this.speed > 400);
  }

  private crash(c: Car): void {
    this.speed = Math.min(this.speed, c.speed) * CRASH_SPEED_KEEP;
    const side = this.playerX >= c.x ? 1 : -1;
    this.playerX = Math.max(-GRASS_LIMIT, Math.min(GRASS_LIMIT, c.x + side * (HIT_DX + 30)));
    this.playerVx = side * 600;
    c.z += 120;
    this.crashCd = CRASH_COOLDOWN;
    this.shake = 0.5;
    this.audio.crash();
  }

  private nextDay(): void {
    this.day++;
    this.remaining = quotaFor(this.day);
    this.dayTime = 0;
    this.cond = conditionsAt(0, this.day);
    this.showBanner(`DIA ${this.day}`);
    this.audio.newDay();
  }

  private endGame(): void {
    this.audio.engineStop();
    this.audio.gameOver();
    this.gameOverReason = `FALTARAM ${this.remaining} CARROS`;
    this.highScores = loadHighScores();
    this.qualifiesForRank = qualifies(this.highScores, this.day, this.km);
    this.setState('gameover');
  }

  private updateGameOver(): void {
    const inp = this.input;
    if (this.stateTime < 1.5) return;
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      if (this.qualifiesForRank) {
        this.initials = ['A', 'A', 'A'];
        this.initialsPos = 0;
        this.setState('initials');
      } else {
        this.setState('menu');
      }
    }
  }

  private updateInitials(): void {
    const inp = this.input;
    const i = this.initialsPos;
    const cur = LETTERS.indexOf(this.initials[i]);
    if (inp.justPressed('up')) { this.initials[i] = LETTERS[(cur + 1) % LETTERS.length]; this.audio.blip(); }
    if (inp.justPressed('down')) { this.initials[i] = LETTERS[(cur + LETTERS.length - 1) % LETTERS.length]; this.audio.blip(); }
    if (inp.justPressed('left') || inp.justPressed('back')) { this.initialsPos = Math.max(0, i - 1); this.audio.blip(); }
    if (inp.justPressed('right')) { this.initialsPos = Math.min(2, i + 1); this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      if (i < 2) {
        this.initialsPos = i + 1;
      } else {
        const entry: HighScore = {
          initials: this.initials.join(''),
          day: this.day,
          km: Math.round(this.km * 10) / 10,
          date: new Date().toISOString(),
        };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}
