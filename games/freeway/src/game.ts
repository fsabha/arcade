import {
  W, LANE_H, laneTop, CHICKEN_X, CHICKEN_W, CHICKEN_H, CHICKEN_SPEED, CHICKEN_START_Y, CHICKEN_GOAL_Y, KNOCK_TIME,
  MATCH_TIME, FLASH_TIME, ROAD_BOTTOM,
} from './config';
import { Traffic, Vehicle } from './traffic';
import { Difficulty, gameSpec } from './games';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'timeup' | 'initials';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Game {
  state: State = 'menu';
  gameNumber = 1;
  difficulty: Difficulty = 'B';
  traffic = new Traffic(1, 1);

  chickenY = CHICKEN_START_Y;
  walking = false;
  walkPhase = 0;
  knockT = 0; // > 0 while tumbling after a hit
  knockFrom = 0;
  knockTo = 0;
  score = 0;
  timeLeft = MATCH_TIME;
  crossings = 0;
  hits = 0;
  private stepTimer = 0;
  private lastSecond = -1;

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

  get spec() {
    return gameSpec(this.gameNumber);
  }

  get chickenBox(): Box {
    return { x: CHICKEN_X, y: this.chickenY, w: CHICKEN_W, h: CHICKEN_H };
  }

  get flashing(): boolean {
    return this.state === 'playing' && this.timeLeft <= FLASH_TIME;
  }

  // ---------- state transitions ----------

  startGame(): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.traffic = new Traffic(this.gameNumber, seed);
    this.chickenY = CHICKEN_START_Y;
    this.score = 0;
    this.crossings = 0;
    this.hits = 0;
    this.timeLeft = MATCH_TIME;
    this.knockT = 0;
    this.lastSecond = -1;
    this.setState('playing');
    this.audio.humStart();
  }

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
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
    this.audio.humStop();
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
      case 'timeup': this.updateTimeUp(); break;
      case 'initials': this.updateInitials(); break;
    }
  }

  private updateMenu(): void {
    const inp = this.input;
    const n = MENU_ITEMS.length;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; this.audio.blip(); }
    const item = MENU_ITEMS[this.menuIndex];
    const delta = (inp.justPressed('right') ? 1 : 0) - (inp.justPressed('left') ? 1 : 0);
    if (delta !== 0 && item === 'JOGO') { this.gameNumber = ((this.gameNumber - 1 + delta + 8) % 8) + 1; this.audio.blip(); }
    if (delta !== 0 && item === 'DIFICULDADE') { this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (item) {
        case 'JOGAR': this.startGame(); break;
        case 'JOGO': this.gameNumber = (this.gameNumber % 8) + 1; break;
        case 'DIFICULDADE': this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; break;
        case 'COMO JOGAR': this.setState('howto'); break;
        case 'RANKING': this.highScores = loadHighScores(); this.setState('ranking'); break;
        case 'CRT': this.toggleCrt(); break;
        case 'SOM': this.toggleSound(); break;
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
    this.audio.humStart();
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.audio.humStop();
      this.setState('paused');
      return;
    }

    // Clock
    this.timeLeft -= dt;
    const sec = Math.ceil(this.timeLeft);
    if (this.timeLeft <= FLASH_TIME && sec !== this.lastSecond) {
      this.lastSecond = sec;
      this.audio.tick();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.traffic.frozen = true;
      this.audio.humStop();
      this.audio.timeUp();
      this.highScores = loadHighScores();
      this.qualifiesForRank = qualifies(this.highScores, this.score);
      this.setState('timeup');
      return;
    }

    this.traffic.update(dt);

    // Chicken
    if (this.knockT > 0) {
      this.knockT -= dt;
      const k = 1 - Math.max(0, this.knockT) / KNOCK_TIME;
      this.chickenY = this.knockFrom + (this.knockTo - this.knockFrom) * k;
      this.walking = false;
      if (this.knockT <= 0) this.chickenY = this.knockTo;
      return;
    }
    const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
    this.walking = dy !== 0;
    if (this.walking) {
      this.chickenY = Math.max(CHICKEN_GOAL_Y, Math.min(CHICKEN_START_Y, this.chickenY + dy * CHICKEN_SPEED * dt));
      this.walkPhase += dt * 8;
      this.stepTimer += dt;
      if (this.stepTimer >= 0.12) { this.stepTimer = 0; this.audio.step(); }
    }

    // Reached the far curb
    if (this.chickenY <= CHICKEN_GOAL_Y + 0.01) {
      this.score++;
      this.crossings++;
      this.audio.score();
      this.chickenY = CHICKEN_START_Y;
      return;
    }

    // Collisions
    const box = { x: CHICKEN_X + 2, y: this.chickenY + 2, w: CHICKEN_W - 4, h: CHICKEN_H - 4 };
    for (const v of this.traffic.vehicles) {
      if (overlaps(box, v)) { this.hit(v); break; }
    }
  }

  private hit(v: Vehicle): void {
    this.hits++;
    this.audio.hit();
    this.knockT = KNOCK_TIME;
    this.knockFrom = this.chickenY;
    if (this.difficulty === 'A') {
      this.knockTo = CHICKEN_START_Y;
    } else {
      // back one lane: land on the lane below the vehicle's (or the curb)
      const below = v.lane - 1;
      this.knockTo = below >= 1 ? laneTop(below) + (LANE_H - CHICKEN_H) / 2 : CHICKEN_START_Y;
      if (v.lane === 6) this.knockTo = laneTop(5) + (LANE_H - CHICKEN_H) / 2 + 2; // across the median
      this.knockTo = Math.min(CHICKEN_START_Y, Math.max(this.knockTo, ROAD_BOTTOM - 10 * LANE_H));
    }
  }

  private updateTimeUp(): void {
    const inp = this.input;
    if (this.stateTime < 2.5) return;
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
        const entry: HighScore = { initials: this.initials.join(''), score: this.score, level: this.gameNumber, date: new Date().toISOString() };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}

export { W };
