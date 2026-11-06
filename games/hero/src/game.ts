import {
  TILE, HERO_W, HERO_H, WALK_SPEED, FLY_SPEED, RISE_SPEED, FALL_SPEED, LASER_RANGE, LASER_BURN_TIME, DYNAMITE_PER_LIFE,
  FUSE_TIME, BLAST_RADIUS, BLAST_SHOW, POWER_MAX, POWER_DRAIN, START_RESERVE, MAX_RESERVE, EXTRA_LIFE_EVERY, MAX_SCORE,
  POINTS, powerUnitValue, GAME_STARTS, LAST_LEVEL, DEATH_TIME, RESCUE_TIME,
} from './config';
import { World, overlaps } from './world';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type HeroMode = 'alive' | 'dead' | 'rescue';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export interface Hero {
  x: number;
  y: number;
  vy: number;
  facing: 1 | -1;
  flying: boolean;
  grounded: boolean;
  walking: boolean;
  mode: HeroMode;
  t: number;
  phase: number;
}

export interface Dynamite {
  x: number;
  y: number;
  fuse: number;
}

export interface Blast {
  x: number;
  y: number;
  t: number;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  gameNumber = 1; // 1..5
  level = 1;
  world = new World(1);
  hero: Hero = this.newHero();
  laser = false;
  laserHit: { x: number; y: number } | null = null;
  dynamite: Dynamite | null = null;
  blast: Blast | null = null;
  sticks = DYNAMITE_PER_LIFE;
  power = POWER_MAX;
  powerRunning = false;
  score = 0;
  reserve = START_RESERVE;
  minersRescued = 0;
  rescueBonus = 0;
  levelIntro = 0; // seconds the level number stays in place of the score
  private nextLife = EXTRA_LIFE_EVERY;
  private powerAcc = 0;

  time = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item, delta) => { if (item === 'JOGO') this.gameNumber = ((this.gameNumber - 1 + (delta || 1) + 5) % 5) + 1; },
      remote: { game: 'hero', label: (e) => `NIVEL ${e.level} ${e.mode}` },
      entry: (initials) => ({ initials, score: this.score, level: this.level, mode: this.modeLabel, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.level, mode: this.modeLabel, date: '' }),
      onStop: () => this.audio.laserStop(),
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

  /** The variation stored with a ranking entry. */
  get modeLabel(): string {
    return `JOGO ${this.gameNumber}`;
  }

  private newHero(): Hero {
    return { x: 0, y: 0, vy: 0, facing: 1, flying: false, grounded: false, walking: false, mode: 'alive', t: 0, phase: 0 };
  }

  /** Level label: number, PRO after 20, nothing in game 5. */
  get levelLabel(): string {
    if (this.gameNumber === 5) return '';
    return this.level > LAST_LEVEL ? 'PRO' : String(this.level);
  }

  get screen(): { sx: number; sy: number } {
    return this.world.screenOf(this.hero.x + HERO_W / 2, this.hero.y + HERO_H / 2);
  }

  get isDark(): boolean {
    const s = this.screen;
    return this.world.dark.has(`${s.sx},${s.sy}`);
  }

  // ---------- state ----------

  startGame(): void {
    this.level = GAME_STARTS[this.gameNumber - 1];
    this.score = 0;
    this.reserve = START_RESERVE;
    this.minersRescued = 0;
    this.nextLife = EXTRA_LIFE_EVERY;
    this.startLevel();
    this.shell.setState('playing');
  }

  private startLevel(): void {
    const mapLevel = this.gameNumber === 5 ? 1 + ((this.level * 7 + 3) % 20) : this.level;
    this.world = new World(mapLevel);
    this.resetHero();
    this.levelIntro = 2;
  }

  private resetHero(): void {
    this.hero = this.newHero();
    this.hero.x = this.world.start.x;
    this.hero.y = this.world.start.y;
    this.sticks = DYNAMITE_PER_LIFE;
    this.power = POWER_MAX;
    this.powerAcc = 0;
    this.powerRunning = false;
    this.dynamite = null;
    this.blast = null;
    this.laser = false;
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
    const h = this.hero;
    h.t += dt;
    if (this.levelIntro > 0) this.levelIntro -= dt;

    if (h.mode === 'rescue') {
      if (h.t >= RESCUE_TIME) {
        this.level++;
        this.startLevel();
      }
      return;
    }
    if (h.mode === 'dead') {
      if (h.t >= DEATH_TIME) this.respawn();
      return;
    }

    const w = this.world;
    w.update(dt);
    w.updateTentacles(dt, h.x);
    this.updateDynamite(dt);

    // input
    const dx = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const up = inp.isDown('up');
    if ((dx !== 0 || up || inp.isDown('down') || inp.isDown('fire')) && !this.powerRunning) this.powerRunning = true;

    // power
    if (this.powerRunning) {
      this.powerAcc += POWER_DRAIN * dt;
      const units = Math.floor(this.powerAcc);
      if (units > 0) { this.powerAcc -= units; this.power = Math.max(0, this.power - units); }
      if (this.power <= 0) { this.die(); return; }
    }

    // horizontal
    if (dx !== 0) {
      h.facing = dx as 1 | -1;
      const nx = h.x + dx * (h.grounded ? WALK_SPEED : FLY_SPEED) * dt;
      if (!w.hitsSolid(nx, h.y, HERO_W, HERO_H)) h.x = nx;
    }
    h.walking = h.grounded && dx !== 0;
    if (h.walking) h.phase += dt * 10;

    // vertical: prop-pack up, otherwise a slow descent
    h.flying = up;
    const vy = up ? -RISE_SPEED : FALL_SPEED;
    const ny = h.y + vy * dt;
    if (w.hitsSolid(h.x, ny, HERO_W, HERO_H)) {
      // snap to the tile edge
      if (vy > 0) { h.y = Math.floor((ny + HERO_H) / TILE) * TILE - HERO_H; h.grounded = true; }
      else { h.y = Math.floor(ny / TILE + 1) * TILE; h.grounded = false; }
    } else {
      h.y = ny;
      h.grounded = false;
    }
    // rafts carry him
    const raft = w.raftUnder(h.x, HERO_W, h.y + HERO_H);
    if (raft && vy > 0 && !up) {
      h.y = raft.y - HERO_H;
      h.grounded = true;
      const rx = h.x + raft.dir * 40 * dt;
      if (!w.hitsSolid(rx, h.y, HERO_W, HERO_H)) h.x = rx;
    }
    if (h.flying) h.phase += dt * 20;

    // dynamite: pull down while standing
    if (inp.justPressed('down') && h.grounded && !this.dynamite && this.sticks > 0) {
      this.sticks--;
      this.dynamite = { x: h.x + HERO_W / 2 + h.facing * 10, y: h.y + HERO_H - 6, fuse: FUSE_TIME };
      this.audio.fuse();
    }

    // laser
    const firing = inp.isDown('fire');
    if (firing !== this.laser) { this.laser = firing; if (firing) this.audio.laserStart(); else this.audio.laserStop(); }
    this.laserHit = null;
    if (firing) this.fireLaser(dt);

    // hazards
    if (w.hitsDeadly(h.x + 2, h.y + 2, HERO_W - 4, HERO_H - 4)) { this.die(); return; }
    for (const c of w.critters) {
      if (c.alive && overlaps(h.x + 2, h.y + 2, HERO_W - 4, HERO_H - 4, c.x, c.y, c.w, c.h)) { this.die(); return; }
    }
    for (const t of w.tentacles) {
      if (overlaps(h.x + 2, h.y + 2, HERO_W - 4, HERO_H - 4, t.x, t.y - 16, 16, 20)) { this.die(); return; }
    }
    for (const l of w.lanterns) {
      if (l.lit && overlaps(h.x, h.y, HERO_W, HERO_H, l.x + 4, l.y, 8, 12)) this.breakLantern(l);
    }
    if (this.blast && this.blast.t < BLAST_SHOW * 0.6) {
      const cx = h.x + HERO_W / 2;
      const cy = h.y + HERO_H / 2;
      if ((cx - this.blast.x) ** 2 + (cy - this.blast.y) ** 2 < BLAST_RADIUS * BLAST_RADIUS) { this.die(); return; }
    }
    // the miner
    const m = w.miner;
    if (overlaps(h.x, h.y, HERO_W, HERO_H, m.x, m.y, 16, 16)) this.rescue();
  }

  private fireLaser(dt: number): void {
    const h = this.hero;
    const w = this.world;
    const y = h.y + 6;
    const x0 = h.facing > 0 ? h.x + HERO_W : h.x;
    for (let d = 0; d < LASER_RANGE; d += 4) {
      const x = x0 + h.facing * d;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      for (const c of w.critters) {
        if (c.alive && x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) {
          c.alive = false;
          this.addScore(POINTS.critter);
          this.audio.zap();
          this.laserHit = { x, y };
          return;
        }
      }
      for (const l of w.lanterns) {
        if (l.lit && x >= l.x + 4 && x < l.x + 12 && y >= l.y && y < l.y + 12) { this.breakLantern(l); this.laserHit = { x, y }; return; }
      }
      const t = w.tile(tx, ty);
      if (t === 'D') {
        const key = `${tx},${ty}`;
        const burn = (w.burn.get(key) ?? 0) + dt;
        if (burn >= LASER_BURN_TIME) { w.tiles[ty][tx] = '.'; w.burn.delete(key); this.audio.crumble(); }
        else w.burn.set(key, burn);
        this.laserHit = { x, y };
        return;
      }
      if (t === '#' || t === 'M') { this.laserHit = { x, y }; return; }
    }
  }

  private updateDynamite(dt: number): void {
    if (this.blast) {
      this.blast.t += dt;
      if (this.blast.t >= BLAST_SHOW) this.blast = null;
    }
    const d = this.dynamite;
    if (!d) return;
    d.fuse -= dt;
    if (d.fuse <= 0) {
      const n = this.world.blast(d.x, d.y, BLAST_RADIUS);
      if (n > 0) this.addScore(POINTS.wall);
      for (const c of this.world.critters) {
        if (c.alive && (c.x + c.w / 2 - d.x) ** 2 + (c.y + c.h / 2 - d.y) ** 2 < BLAST_RADIUS * BLAST_RADIUS) { c.alive = false; this.addScore(POINTS.critter); }
      }
      this.blast = { x: d.x, y: d.y, t: 0 };
      this.dynamite = null;
      this.audio.explode();
    }
  }

  private breakLantern(l: { lit: boolean; x: number; y: number }): void {
    l.lit = false;
    const s = this.world.screenOf(l.x, l.y);
    this.world.dark.add(`${s.sx},${s.sy}`);
    this.audio.dark();
  }

  private rescue(): void {
    const h = this.hero;
    h.mode = 'rescue';
    h.t = 0;
    this.laser = false;
    this.audio.laserStop();
    const bonus = POINTS.miner + this.sticks * POINTS.dynamite + this.power * powerUnitValue(this.level);
    this.rescueBonus = bonus;
    this.addScore(bonus);
    this.minersRescued++;
    this.audio.rescue();
  }

  private addScore(n: number): void {
    this.score = Math.min(MAX_SCORE, this.score + n);
    while (this.score >= this.nextLife) {
      this.nextLife += EXTRA_LIFE_EVERY;
      if (this.reserve < MAX_RESERVE) { this.reserve++; this.audio.extraLife(); }
    }
  }

  die(): void {
    const h = this.hero;
    if (h.mode !== 'alive') return;
    h.mode = 'dead';
    h.t = 0;
    this.laser = false;
    this.audio.laserStop();
    this.audio.die();
  }

  private respawn(): void {
    if (this.reserve <= 0) { this.endGame(); return; }
    this.reserve--;
    this.resetHero();
  }
}
