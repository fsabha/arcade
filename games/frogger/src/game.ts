import {
  W, TILE, COLS, ROW_HOME, ROW_START, ROW_MEDIAN, HOME_X, HOME_TOLERANCE, HOMES, FROG_START_COL, FROG_W, HOP_TIME, TIME_LIMIT, TIME_WARN,
  START_LIVES, EXTRA_LIFE_AT, POINTS, DEATH_TIME, LEVEL_CLEAR_TIME, HOME_CROC_FROM_LEVEL, LADY_FROM_LEVEL, FLY_SHOW, FLY_HIDE,
  HOME_CROC_SHOW, HOME_CROC_HIDE,
} from './config';
import { Traffic, isRiver, isRoad, submersion, Mover } from './lanes';
import { Rng, Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type FrogMode = 'idle' | 'hop' | 'dead' | 'home' | 'clear';
export type Death = 'splat' | 'drown' | 'time' | null;

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

export interface Frog {
  x: number; // left edge of the 16 px cell
  row: number;
  facing: 0 | 1 | 2 | 3; // up right down left
  mode: FrogMode;
  t: number;
  fromX: number; fromRow: number;
  toX: number; toRow: number;
  /** highest row reached by this frog (lowest number) */
  bestRow: number;
  carryingLady: boolean;
}

export interface Lady {
  active: boolean;
  platform: Mover | null;
  /** offset inside the platform */
  offset: number;
  taken: boolean;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  level = 1;
  traffic = new Traffic(1, 1);
  frog: Frog = this.newFrog();
  homes: boolean[] = Array(HOMES).fill(false);
  score = 0;
  lives = START_LIVES;
  timeLeft = TIME_LIMIT;
  death: Death = null;
  fly = { bay: -1, t: 0 };
  homeCroc = { bay: -1, t: 0, open: false };
  lady: Lady = { active: false, platform: null, offset: 0, taken: false };
  lastHomeBonus = 0;
  frogsHome = 0;
  private extraLifeGiven = false;
  private rng = new Rng(1);
  private warnAcc = 0;

  time = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onStop: () => this.audio.musicStop(),
      onMusic: (on) => this.audio.setMusicEnabled(on),
      onResume: () => this.audio.musicStart(),
      entry: (initials) => ({ initials, score: this.score, level: this.level, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.level, date: '' }),
    });
  }

  // the shell owns the screens around the game; these keep the renderer and tests simple
  get state(): State { return this.shell.state; }
  get stateTime(): number { return this.shell.stateTime; }
  get menuIndex(): number { return this.shell.menuIndex; }
  get pauseIndex(): number { return this.shell.pauseIndex; }
  get initials(): string[] { return this.shell.initials; }
  get initialsPos(): number { return this.shell.initialsPos; }
  get qualifiesForRank(): boolean { return this.shell.qualifiesForRank; }
  get settings(): Settings { return this.shell.settings; }
  get highScores(): HighScore[] { return this.shell.highScores; }

  private newFrog(): Frog {
    const x = FROG_START_COL * TILE + TILE / 2;
    return { x, row: ROW_START, facing: 0, mode: 'idle', t: 0, fromX: x, fromRow: ROW_START, toX: x, toRow: ROW_START, bestRow: ROW_START, carryingLady: false };
  }

  /** Frog centre x. */
  get cx(): number {
    return this.frog.x + TILE / 2;
  }

  // ---------- state ----------

  startGame(): void {
    this.level = 1;
    this.score = 0;
    this.lives = START_LIVES;
    this.frogsHome = 0;
    this.extraLifeGiven = false;
    this.rng = new Rng((Date.now() & 0xffff) + 1);
    this.startLevel();
    this.shell.setState('playing');
    this.audio.setMusicEnabled(this.shell.settings.music !== false);
    this.audio.musicStart();
  }

  private startLevel(): void {
    this.traffic = new Traffic(this.level, (this.level * 7919 + Date.now()) >>> 0);
    this.homes = Array(HOMES).fill(false);
    this.fly = { bay: -1, t: FLY_HIDE * 0.5 };
    this.homeCroc = { bay: -1, t: HOME_CROC_HIDE, open: false };
    this.lady = { active: false, platform: null, offset: 0, taken: false };
    this.resetFrog();
  }

  private resetFrog(): void {
    this.frog = this.newFrog();
    this.timeLeft = TIME_LIMIT;
    this.death = null;
    this.warnAcc = 0;
    if (this.level >= LADY_FROM_LEVEL) this.spawnLady();
  }

  private spawnLady(): void {
    const logs = this.traffic.movers.filter((m) => m.kind === 'log' && (m.row === 3 || m.row === 5 || m.row === 6));
    if (!logs.length) return;
    const p = this.rng.pick(logs);
    this.lady = { active: true, platform: p, offset: Math.floor(this.rng.range(0, p.w / TILE)) * TILE, taken: false };
  }

  private endGame(): void {
    this.shell.endGame();
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    const f = this.frog;
    f.t += dt;

    if (f.mode === 'clear') {
      if (f.t >= LEVEL_CLEAR_TIME) { this.level++; this.startLevel(); }
      return;
    }
    if (f.mode === 'dead') {
      if (f.t >= DEATH_TIME) this.respawn();
      return;
    }
    if (f.mode === 'home') {
      if (f.t >= 0.6) this.resetFrog();
      return;
    }

    this.traffic.update(dt);
    this.updateBays(dt);

    // the clock
    this.timeLeft -= dt;
    if (this.timeLeft <= TIME_WARN) {
      this.warnAcc += dt;
      if (this.warnAcc >= 1) { this.warnAcc = 0; this.audio.tick(); }
    }
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.die('time'); return; }

    if (f.mode === 'hop') {
      const k = Math.min(1, f.t / HOP_TIME);
      f.x = f.fromX + (f.toX - f.fromX) * k;
      if (k >= 1) {
        f.row = f.toRow;
        f.x = f.toX;
        f.mode = 'idle';
        f.t = 0;
        this.land();
        if (f.mode !== 'idle') return;
      }
    }
    if (f.mode === 'idle') {
      this.ride(dt);
      this.hazards();
      if (f.mode !== 'idle') return;
      const dir = inp.justPressed('up') ? 0 : inp.justPressed('right') ? 1 : inp.justPressed('down') ? 2 : inp.justPressed('left') ? 3 : -1;
      if (dir >= 0) this.hop(dir as 0 | 1 | 2 | 3);
    }
  }

  private hop(dir: 0 | 1 | 2 | 3): void {
    const f = this.frog;
    let toX = f.x;
    let toRow = f.row;
    if (dir === 0) toRow--;
    if (dir === 2) toRow++;
    if (dir === 1) toX += TILE;
    if (dir === 3) toX -= TILE;
    if (toRow > ROW_START || toRow < ROW_HOME) return;
    if (toX < 0 || toX > W - TILE) return;
    f.facing = dir;
    f.mode = 'hop';
    f.t = 0;
    f.fromX = f.x; f.fromRow = f.row;
    f.toX = toX; f.toRow = toRow;
    this.audio.hop();
  }

  /** Just landed on a row. */
  private land(): void {
    const f = this.frog;
    if (f.row < f.bestRow && f.row > ROW_HOME) {
      f.bestRow = f.row;
      this.addScore(POINTS.hop);
    }
    if (f.row === ROW_HOME) { this.arriveHome(); return; }
    if (isRiver(f.row)) {
      const p = this.traffic.platformAt(f.row, this.cx);
      if (!p || submersion(p) >= 0.99) { this.die('drown'); return; }
      // the lady frog waits on a log
      const l = this.lady;
      if (l.active && !l.taken && l.platform === p && Math.abs(p.x + l.offset + TILE / 2 - this.cx) < TILE * 0.75) {
        l.taken = true;
        f.carryingLady = true;
        this.audio.lady();
      }
    }
  }

  private arriveHome(): void {
    const f = this.frog;
    let bay = -1;
    for (let i = 0; i < HOMES; i++) {
      if (Math.abs(HOME_X[i] + TILE / 2 - this.cx) <= HOME_TOLERANCE) bay = i;
    }
    if (bay < 0 || this.homes[bay] || (this.homeCroc.bay === bay && this.homeCroc.open)) { this.die('splat'); return; }
    this.homes[bay] = true;
    f.x = HOME_X[bay];
    f.mode = 'home';
    f.t = 0;
    let bonus = POINTS.home + Math.floor(this.timeLeft * 2) * POINTS.halfSecond;
    if (this.fly.bay === bay) { bonus += POINTS.fly; this.fly = { bay: -1, t: 0 }; this.audio.fly(); }
    if (f.carryingLady) { bonus += POINTS.lady; this.lady.active = false; }
    this.lastHomeBonus = bonus;
    this.addScore(bonus);
    this.frogsHome++;
    this.audio.home();
    if (this.homes.every(Boolean)) {
      this.addScore(POINTS.allHome);
      f.mode = 'clear';
      f.t = 0;
      this.audio.levelClear();
    }
  }

  /** Carried by the platform under the frog, and off the screen means drowning. */
  private ride(dt: number): void {
    const f = this.frog;
    if (!isRiver(f.row)) return;
    const p = this.traffic.platformAt(f.row, this.cx);
    if (!p) { this.die('drown'); return; }
    if (submersion(p) >= 0.99) { this.die('drown'); return; }
    f.x += p.dir * p.speed * dt;
    if (f.x < -TILE / 2 || f.x > W - TILE / 2) this.die('drown');
  }

  private hazards(): void {
    const f = this.frog;
    const x0 = f.x + (TILE - FROG_W) / 2;
    const x1 = x0 + FROG_W;
    if (isRoad(f.row) || f.row === ROW_MEDIAN || isRiver(f.row)) {
      const m = this.traffic.deadlyAt(f.row, x0, x1);
      if (m) this.die('splat');
    }
  }

  /** The fly and the crocodile head that visit the empty bays. */
  private updateBays(dt: number): void {
    const empty = this.homes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
    const fl = this.fly;
    fl.t -= dt;
    if (fl.t <= 0) {
      if (fl.bay >= 0) { fl.bay = -1; fl.t = FLY_HIDE * (0.6 + this.rng.next() * 0.8); }
      else if (empty.length) { fl.bay = this.rng.pick(empty); fl.t = FLY_SHOW; }
      else fl.t = FLY_HIDE;
    }
    if (this.level >= HOME_CROC_FROM_LEVEL) {
      const c = this.homeCroc;
      c.t -= dt;
      if (c.t <= 0) {
        if (c.bay >= 0) { c.bay = -1; c.open = false; c.t = HOME_CROC_HIDE * (0.6 + this.rng.next() * 0.8); }
        else {
          const free = empty.filter((i) => i !== fl.bay);
          if (free.length) { c.bay = this.rng.pick(free); c.open = false; c.t = HOME_CROC_SHOW; }
          else c.t = HOME_CROC_HIDE;
        }
      }
      // the head peeks first, then the jaws open: only the open jaws kill
      if (c.bay >= 0) c.open = c.t < HOME_CROC_SHOW * 0.6;
    }
  }

  private addScore(n: number): void {
    this.score += n;
    if (!this.extraLifeGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraLifeGiven = true;
      this.lives++;
      this.audio.extraLife();
    }
  }

  die(how: Exclude<Death, null>): void {
    const f = this.frog;
    if (f.mode === 'dead') return;
    this.death = how;
    f.mode = 'dead';
    f.t = 0;
    if (f.carryingLady) { f.carryingLady = false; this.lady.active = false; }
    if (how === 'drown') this.audio.drown();
    else this.audio.splat();
  }

  private respawn(): void {
    this.lives--;
    if (this.lives <= 0) { this.endGame(); return; }
    this.resetFrog();
  }
}

export { COLS };
