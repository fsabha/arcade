import {
  W, PLAY_H, SPEED, PLAYER_VX, PLAYER_ACCEL, PLAYER_DECEL, PLAYER_W, PLAYER_H, PLAYER_Y_OFFSET, BULLET_VY, MAX_BULLETS,
  FIRE_COOLDOWN, FUEL_MAX, FUEL_REFILL, FUEL_LOW, POINTS, SECTION_LEN, DYING_TIME, SpeedMode,
} from './config';
import { River, SpawnDef, SpawnKind, difficulty } from './river';
import { aabb, hitsBank, bounceInChannel, Box } from './collision';
import { ScoreKeeper, fuelDrainRate } from './scoring';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { settings, HighScore, Settings } from './storage';

export type State = ShellState;
/** Inside `playing`: flying, or the crash animation before the respawn / game over. */
export type Phase = 'flying' | 'dying';

export interface Enemy {
  id: number;
  kind: SpawnKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  section: number;
}

export interface Bullet extends Box {}

export interface Explosion {
  x: number; // world center
  y: number;
  t: number;
  dur: number;
  big: boolean;
}

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'flying';
  phaseTime = 0;
  river = new River(1);
  camY = 0;
  player: Box = { x: W / 2 - PLAYER_W / 2, y: PLAYER_Y_OFFSET, w: PLAYER_W, h: PLAYER_H };
  bullets: Bullet[] = [];
  enemies: Enemy[] = [];
  explosions: Explosion[] = [];
  private pending: SpawnDef[] = [];
  private pendingIdx = 0;

  fuel = FUEL_MAX;
  score = new ScoreKeeper();
  section = 0;
  speedMode: SpeedMode = 'normal';
  private playerVx = 0;
  refueling = false;
  deathReason = '';

  time = 0;
  private fireCd = 0;
  private lowFuelTimer = 0;
  private refuelTimer = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      settings,
      // no game over jingle: the crash explosion already played
      audio: { blip: () => audio.blip(), gameOver: () => undefined, setMuted: (m) => audio.setMuted(m) },
      onStart: () => this.startGame(),
      onStop: () => audio.engineStop(),
      onResume: () => audio.engineStart(),
      remote: { game: 'riverraid', label: (e) => `SECAO ${e.section}` },
      entry: (initials) => ({ initials, score: this.score.score, section: this.sectionNumber, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score.score, section: this.sectionNumber, date: '' }),
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

  get sectionNumber(): number {
    return this.section + 1;
  }

  // ---------- state transitions ----------

  startGame(): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.river = new River(seed);
    this.score = new ScoreKeeper();
    this.section = 0;
    this.respawn();
  }

  private respawn(): void {
    this.river.ensure((this.section + 1) * SECTION_LEN);
    const sec = this.river.sections[this.section];
    this.camY = sec.startY;
    this.player.x = W / 2 - PLAYER_W / 2;
    this.player.y = this.camY + PLAYER_Y_OFFSET;
    this.fuel = FUEL_MAX;
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.speedMode = 'normal';
    this.playerVx = 0;
    this.fireCd = 0;
    this.lowFuelTimer = 0;
    this.refueling = false;
    this.ensureRiver();
    this.rebuildPending();
    this.phase = 'flying';
    this.phaseTime = 0;
    this.shell.setState('playing');
    this.audio.engineStart();
  }

  private ensureRiver(): void {
    const added = this.river.ensure(this.camY + PLAY_H + 240);
    for (const s of added) this.pending.push(...s.spawns);
  }

  private rebuildPending(): void {
    this.pending = [];
    for (const s of this.river.sections) {
      if (s.index < this.section) continue;
      for (const sp of s.spawns) if (sp.y + sp.h > this.camY) this.pending.push(sp);
    }
    this.pending.sort((a, b) => a.y - b.y);
    this.pendingIdx = 0;
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private updatePlaying(dt: number): void {
    this.phaseTime += dt;
    if (this.phase === 'dying') { this.updateDying(dt); return; }
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }

    // Speed & scroll
    this.speedMode = inp.isDown('up') ? 'fast' : inp.isDown('down') ? 'slow' : 'normal';
    this.audio.engineSet(this.speedMode);
    this.camY += SPEED[this.speedMode] * dt;
    this.ensureRiver();

    // Player lateral movement
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    if (dir !== 0) {
      // reverse quickly, then ramp up to full speed
      if (Math.sign(this.playerVx) !== dir) this.playerVx = 0;
      this.playerVx = Math.min(PLAYER_VX, Math.abs(this.playerVx) + PLAYER_ACCEL * dt) * dir;
    } else {
      const mag = Math.max(0, Math.abs(this.playerVx) - PLAYER_DECEL * dt);
      this.playerVx = mag * Math.sign(this.playerVx);
    }
    this.player.x += this.playerVx * dt;
    this.player.x = Math.max(0, Math.min(W - this.player.w, this.player.x));
    this.player.y = this.camY + PLAYER_Y_OFFSET;

    // Fuel
    this.fuel -= fuelDrainRate(this.speedMode) * dt;
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.die('SEM COMBUSTIVEL');
      return;
    }
    if (this.fuel < FUEL_LOW) {
      this.lowFuelTimer += dt;
      if (this.lowFuelTimer >= 0.55) {
        this.lowFuelTimer = 0;
        this.audio.fuelLow();
      }
    }

    // Shooting
    this.fireCd -= dt;
    if (inp.isDown('fire') && this.fireCd <= 0 && this.bullets.length < MAX_BULLETS) {
      this.fireCd = FIRE_COOLDOWN;
      this.bullets.push({ x: this.player.x + this.player.w / 2 - 1, y: this.player.y + this.player.h - 4, w: 2, h: 6 });
      this.audio.shoot();
    }
    for (const b of this.bullets) b.y += BULLET_VY * dt;
    this.bullets = this.bullets.filter((b) => b.y < this.camY + PLAY_H);

    // Spawn & move enemies
    this.activatePending();
    for (const e of this.enemies) {
      if (e.kind === 'jet') {
        e.x += e.vx * dt;
      } else if (e.vx !== 0) {
        e.x += e.vx * dt;
        const row = this.river.rowAt(Math.floor(e.y + e.h / 2));
        const r = bounceInChannel(e, e.vx, row);
        e.x = r.x;
        e.vx = r.vx;
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.y + e.h < this.camY - 8) return false;
      if (e.kind === 'jet' && (e.x < -e.w - 40 || e.x > W + 40)) return false;
      return true;
    });

    // Bullets vs enemies
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (aabb(b, e)) {
          this.hitEnemy(e);
          b.y = Infinity; // consumed
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.y !== Infinity);
    this.enemies = this.enemies.filter((e) => e.vx !== Infinity);

    // Player vs enemies
    const pBox: Box = { x: this.player.x + 2, y: this.player.y + 1, w: this.player.w - 4, h: this.player.h - 2 };
    this.refueling = false;
    for (const e of this.enemies) {
      if (!aabb(pBox, e)) continue;
      if (e.kind === 'fuel') {
        this.refueling = true;
      } else {
        this.die(e.kind === 'bridge' ? 'BATEU NA PONTE' : 'ABATIDO');
        return;
      }
    }
    if (this.refueling && this.fuel < FUEL_MAX) {
      this.fuel = Math.min(FUEL_MAX, this.fuel + FUEL_REFILL * dt);
      this.refuelTimer += dt;
      if (this.refuelTimer >= 0.12) {
        this.refuelTimer = 0;
        this.audio.refuelTick();
      }
    }

    // Player vs banks
    if (hitsBank(pBox, (y) => this.river.rowAt(y))) {
      this.die('COLISAO COM A MARGEM');
      return;
    }

    this.updateExplosions(dt);
  }

  private activatePending(): void {
    const limit = this.camY + PLAY_H + 4;
    while (this.pendingIdx < this.pending.length) {
      const s = this.pending[this.pendingIdx];
      if (s.y > limit) break;
      this.pendingIdx++;
      this.enemies.push(this.makeEnemy(s));
    }
  }

  private makeEnemy(s: SpawnDef): Enemy {
    const d = difficulty(s.section);
    let vx = 0;
    if (s.kind === 'jet') vx = s.dir * d.jetSpeed;
    else if (s.moving) vx = s.dir * d.enemySpeed;
    return { id: s.id, kind: s.kind, x: s.x, y: s.y, w: s.w, h: s.h, vx, section: s.section };
  }

  private hitEnemy(e: Enemy): void {
    const big = e.kind === 'bridge' || e.kind === 'fuel';
    this.explosions.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0, dur: big ? 0.8 : 0.5, big });
    if (e.kind === 'bridge') {
      this.explosions.push({ x: e.x + 8, y: e.y + e.h / 2, t: -0.1, dur: 0.7, big: true });
      this.explosions.push({ x: e.x + e.w - 8, y: e.y + e.h / 2, t: -0.2, dur: 0.7, big: true });
      this.audio.bridge();
      this.section = e.section + 1;
      this.river.ensure((this.section + 1) * SECTION_LEN);
    } else {
      this.audio.explode(big);
    }
    if (this.score.add(POINTS[e.kind])) this.audio.extraLife();
    e.vx = Infinity; // mark removed
  }

  private updateExplosions(dt: number): void {
    for (const ex of this.explosions) ex.t += dt;
    this.explosions = this.explosions.filter((ex) => ex.t < ex.dur);
  }

  private die(reason: string): void {
    this.deathReason = reason;
    this.explosions.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, t: 0, dur: 1.0, big: true });
    this.audio.explode(true);
    this.audio.engineStop();
    this.speedMode = 'normal';
    this.phase = 'dying';
    this.phaseTime = 0;
  }

  private updateDying(dt: number): void {
    this.updateExplosions(dt);
    if (this.phaseTime < DYING_TIME) return;
    this.score.lives--;
    if (this.score.lives <= 0) this.shell.endGame();
    else this.respawn();
  }
}
