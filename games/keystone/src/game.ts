import {
  W, WORLD_W, FEET, ROOF, KELLY_W, KELLY_H, DUCK_H, KELLY_SPEED, JUMP_TIME, JUMP_H, HARRY_W, HARRY_H, ESC_MARGIN,
  ELEV_X, ELEV_W, TIMER_START, TIMER_WARN, HIT_PENALTY, KO_TIME, DEATH_TIME, CAUGHT_TIME, START_RESERVE, MAX_RESERVE,
  BONUS_KOP_EVERY, LOOT_POINTS, KELLY_START_X, catchMultiplier, screenOf,
} from './config';
import { Store, Harry, newHarry, updateHarry, rideEscalator, atEscalator, escalatorRange, overlaps, obstacleRect, lootRect, Rect, Walker } from './store';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';
export type Mode = 'run' | 'escalator' | 'elevator' | 'ko' | 'caught' | 'lost';
export type LossReason = 'plane' | 'time' | 'escape' | null;

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export interface Kelly extends Walker {
  mode: Mode;
  t: number;
  jumpT: number; // -1 when on the ground
  ducking: boolean;
  walking: boolean;
  phase: number;
  /** grace period after a KO */
  safe: number;
}

export class Game {
  state: State = 'menu';
  krook = 1;
  store = new Store(1, 1);
  kelly: Kelly = this.newKelly();
  harry: Harry = newHarry();
  score = 0;
  reserve = START_RESERVE;
  timer = TIMER_START;
  lastCatch = 0;
  krooksCaught = 0;
  lossReason: LossReason = null;
  private nextKop = BONUS_KOP_EVERY;
  private stepAcc = 0;

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

  private newKelly(): Kelly {
    return { x: KELLY_START_X, feet: FEET[0], floor: 0, facing: 1, ride: -1, mode: 'run', t: 0, jumpT: -1, ducking: false, walking: false, phase: 0, safe: 0 };
  }

  /** The screen (0..2) the camera shows. */
  get screen(): number {
    return this.kelly.mode === 'elevator' ? screenOf(ELEV_X) : screenOf(this.kelly.x + KELLY_W / 2);
  }

  get kellyRect(): Rect {
    const k = this.kelly;
    const h = k.ducking ? DUCK_H : KELLY_H;
    return { x: k.x + 3, y: k.feet - this.lift - h, w: KELLY_W - 6, h };
  }

  /** Height of the jump above the feet line. */
  get lift(): number {
    const k = this.kelly;
    if (k.jumpT < 0) return 0;
    return Math.sin(Math.PI * Math.min(1, k.jumpT / JUMP_TIME)) * JUMP_H;
  }

  get harryRect(): Rect {
    return { x: this.harry.x + 3, y: this.harry.feet - HARRY_H, w: HARRY_W - 6, h: HARRY_H };
  }

  // ---------- state ----------

  startGame(): void {
    this.krook = 1;
    this.score = 0;
    this.reserve = START_RESERVE;
    this.nextKop = BONUS_KOP_EVERY;
    this.krooksCaught = 0;
    this.startKrook();
    this.setState('playing');
  }

  private startKrook(): void {
    this.store = new Store(this.krook, (this.krook * 7919 + Date.now()) >>> 0);
    this.kelly = this.newKelly();
    this.harry = newHarry();
    this.timer = TIMER_START;
    this.lossReason = null;
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

  private endGame(): void {
    this.highScores = loadHighScores();
    this.qualifiesForRank = qualifies(this.highScores, this.score);
    this.audio.gameOver();
    this.setState('gameover');
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
      switch (MENU_ITEMS[this.menuIndex]) {
        case 'JOGAR': this.startGame(); break;
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
    if (inp.justPressed('pause')) { this.setState('playing'); return; }
    if (inp.justPressed('back')) { this.setState('menu'); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.setState('playing');
      else this.setState('menu');
    }
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.setState('paused');
      return;
    }
    const k = this.kelly;
    k.t += dt;

    if (k.mode === 'caught') {
      if (k.t >= CAUGHT_TIME) { this.krook++; this.startKrook(); }
      return;
    }
    if (k.mode === 'lost') {
      if (k.t >= DEATH_TIME) this.respawn();
      return;
    }

    // the bonus timer
    const before = Math.ceil(this.timer);
    this.timer -= dt;
    const now = Math.ceil(this.timer);
    if (now !== before && now <= TIMER_WARN && now > 0) this.audio.tick();
    if (this.timer <= 0) { this.timer = 0; this.lose('time'); return; }

    const active = k.mode === 'run' || k.mode === 'ko';
    this.store.update(dt, { x: k.x, floor: k.floor, facing: k.facing, active });
    updateHarry(this.harry, dt, this.krook, k.floor === this.harry.floor && k.mode === 'run' ? k.x : null);
    if (this.harry.escaped) { this.lose('escape'); return; }

    switch (k.mode) {
      case 'run': this.updateRun(dt); break;
      case 'escalator':
        if (rideEscalator(k, dt, KELLY_W)) { k.mode = 'run'; k.t = 0; }
        break;
      case 'elevator': this.updateElevator(); break;
      case 'ko':
        if (k.t >= KO_TIME) { k.mode = 'run'; k.t = 0; k.safe = 0.5; }
        break;
    }
    if (k.mode === 'run' || k.mode === 'escalator') this.checkCatch();
  }

  private updateRun(dt: number): void {
    const inp = this.input;
    const k = this.kelly;
    k.safe = Math.max(0, k.safe - dt);
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const onGround = k.jumpT < 0;
    k.ducking = onGround && inp.isDown('down') && !this.elevatorInFront();

    if (onGround && !k.ducking && inp.justPressed('fire')) { k.jumpT = 0; this.audio.jump(); }
    if (k.jumpT >= 0) {
      k.jumpT += dt;
      if (k.jumpT >= JUMP_TIME) k.jumpT = -1;
    }

    k.walking = dir !== 0 && !k.ducking;
    if (k.walking) {
      k.facing = dir as 1 | -1;
      k.x += dir * KELLY_SPEED * dt;
      k.phase += dt * 10;
      this.stepAcc += dt;
      if (this.stepAcc > 0.18 && k.jumpT < 0) { this.stepAcc = 0; this.audio.step(); }
    }
    k.x = Math.max(ESC_MARGIN - 4, Math.min(WORLD_W - ESC_MARGIN - KELLY_W + 4, k.x));

    // the elevator: push up to step in when the doors are open at this floor
    if (onGround && inp.justPressed('up') && this.elevatorInFront()) {
      const e = this.store.elevator;
      if (e.open && e.progress === 0 && e.floor === k.floor) {
        k.mode = 'elevator';
        k.t = 0;
        k.x = ELEV_X - KELLY_W / 2;
        k.walking = false;
        k.ducking = false;
        this.audio.elevator();
        return;
      }
    }

    // escalators go up; jumping onto one skips half the ride
    if (k.floor < ROOF && atEscalator(k, KELLY_W) && k.walking) {
      k.mode = 'escalator';
      k.ride = k.jumpT >= 0 ? 0.5 : 0;
      k.jumpT = -1;
      k.t = 0;
      this.audio.escalator();
      return;
    }

    this.collide();
  }

  private elevatorInFront(): boolean {
    const k = this.kelly;
    return k.floor < ROOF && Math.abs(k.x + KELLY_W / 2 - ELEV_X) <= ELEV_W / 2 - 2;
  }

  private updateElevator(): void {
    const k = this.kelly;
    const e = this.store.elevator;
    k.floor = e.progress === 0 ? e.floor : e.floor;
    k.feet = e.feet;
    if (e.open && this.input.justPressed('down')) {
      k.floor = e.floor;
      k.feet = FEET[k.floor];
      k.mode = 'run';
      k.t = 0;
      k.safe = 0.3;
      this.audio.elevator();
    }
  }

  private collide(): void {
    const k = this.kelly;
    const me = this.kellyRect;
    for (const l of this.store.loot) {
      if (l.taken || l.floor !== k.floor) continue;
      if (overlaps(me, lootRect(l))) {
        l.taken = true;
        this.addScore(LOOT_POINTS);
        this.audio.loot();
      }
    }
    if (k.safe > 0) return;
    for (const o of this.store.obstacles) {
      if (o.floor !== k.floor) continue;
      if (!overlaps(me, obstacleRect(o))) continue;
      if (o.kind === 'plane') { this.lose('plane'); return; }
      this.timer = Math.max(0, this.timer - HIT_PENALTY);
      k.mode = 'ko';
      k.t = 0;
      k.jumpT = -1;
      k.ducking = false;
      k.walking = false;
      this.store.remove(o);
      this.audio.bump();
      return;
    }
  }

  private checkCatch(): void {
    const k = this.kelly;
    const h = this.harry;
    if (h.floor !== k.floor && !(k.mode === 'escalator' && h.ride >= 0)) return;
    if (!overlaps(this.kellyRect, this.harryRect)) return;
    const pts = Math.ceil(this.timer) * catchMultiplier(this.krook);
    this.lastCatch = pts;
    this.addScore(pts);
    this.krooksCaught++;
    k.mode = 'caught';
    k.t = 0;
    k.jumpT = -1;
    k.ducking = false;
    k.ride = -1;
    h.ride = -1;
    this.audio.caught();
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextKop) {
      this.nextKop += BONUS_KOP_EVERY;
      if (this.reserve < MAX_RESERVE) { this.reserve++; this.audio.bonusKop(); }
    }
  }

  lose(reason: Exclude<LossReason, null>): void {
    const k = this.kelly;
    if (k.mode === 'lost' || k.mode === 'caught') return;
    this.lossReason = reason;
    k.mode = 'lost';
    k.t = 0;
    k.jumpT = -1;
    k.ducking = false;
    this.audio.lose();
  }

  private respawn(): void {
    if (this.reserve <= 0) { this.endGame(); return; }
    this.reserve--;
    this.startKrook();
  }

  private updateGameOver(): void {
    const inp = this.input;
    if (this.stateTime < 2) return;
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
        const entry: HighScore = { initials: this.initials.join(''), score: this.score, krooks: this.krooksCaught, date: new Date().toISOString() };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}

export { escalatorRange, W };
