import {
  WORLD_W, GROUND_Y, SKY_TOP, TRUCKS, TRUCK_W, TRUCK_H, TRUCK_GAP, TRUCK_SPEED, ENEMIES_PER_WAVE, HELI_W, HELI_H, JET_W, JET_H,
  MISSILE_SPEED, MISSILE_SPLIT_TIME, MISSILE_LIFE, BULLET_SPEED, BULLET_LIFE, CHOPPER_W, CHOPPER_H, Level, heliSpeed, jetSpeed,
  fireRate, jetsInWave, wrapX, deltaX,
} from './config';
import { Rng } from '@arcade/shared';

export interface Rect { x: number; y: number; w: number; h: number }

/** Overlap on the looping x axis. */
export function hits(a: Rect, b: Rect): boolean {
  const dx = deltaX(a.x, b.x);
  if (!(dx < a.w && dx > -b.w)) return false;
  return a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface Truck { x: number; alive: boolean }

export interface Enemy {
  kind: 'heli' | 'jet';
  x: number; y: number;
  dir: 1 | -1;
  speed: number;
  targetY: number;
  fireT: number;
  alive: boolean;
  phase: number;
}

export interface Missile {
  x: number; y: number;
  vx: number; vy: number;
  t: number;
  split: boolean;
  alive: boolean;
}

export interface Bullet { x: number; y: number; vx: number; t: number; alive: boolean }

export function enemyRect(e: Enemy): Rect {
  return e.kind === 'heli' ? { x: e.x, y: e.y, w: HELI_W, h: HELI_H } : { x: e.x, y: e.y, w: JET_W, h: JET_H };
}

export function truckRect(t: Truck): Rect {
  return { x: t.x, y: GROUND_Y - TRUCK_H, w: TRUCK_W, h: TRUCK_H };
}

export class Field {
  trucks: Truck[] = [];
  enemies: Enemy[] = [];
  missiles: Missile[] = [];
  bullets: Bullet[] = [];
  private rng: Rng;

  constructor(public wave: number, public level: Level, seed: number, chopperX: number) {
    this.rng = new Rng(seed);
    // the convoy starts a little ahead of the chopper
    const x0 = chopperX + 120;
    for (let i = 0; i < TRUCKS; i++) this.trucks.push({ x: wrapX(x0 + i * TRUCK_GAP), alive: true });
    // the formation is spread around the loop, out of sight at first
    const jets = jetsInWave(wave);
    for (let i = 0; i < ENEMIES_PER_WAVE; i++) {
      const kind = i < jets ? 'jet' : 'heli';
      const x = wrapX(chopperX + 400 + this.rng.range(0, WORLD_W - 700));
      const y = this.rng.range(SKY_TOP + 10, GROUND_Y - 40);
      const speed = kind === 'jet' ? jetSpeed(wave, level) : heliSpeed(wave, level);
      this.enemies.push({ kind, x, y, dir: -1, speed, targetY: y, fireT: this.rng.range(1, 4), alive: true, phase: this.rng.next() * 7 });
    }
  }

  get trucksAlive(): number {
    return this.trucks.filter((t) => t.alive).length;
  }

  get enemiesAlive(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  fire(x: number, y: number, dir: 1 | -1): void {
    this.bullets.push({ x: dir > 0 ? x + CHOPPER_W : x - 4, y: y + CHOPPER_H / 2, vx: dir * BULLET_SPEED, t: 0, alive: true });
  }

  /** Returns points scored and whether the chopper was hit. */
  update(dt: number, chopper: { x: number; y: number; alive: boolean }): { points: number; chopperHit: boolean; truckLost: boolean } {
    const out = { points: 0, chopperHit: false, truckLost: false };
    const cRect: Rect = { x: chopper.x + 2, y: chopper.y + 1, w: CHOPPER_W - 4, h: CHOPPER_H - 2 };

    for (const t of this.trucks) if (t.alive) t.x = wrapX(t.x - TRUCK_SPEED * dt);

    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.phase += dt;
      e.x = wrapX(e.x + e.dir * e.speed * dt);
      // drift towards a new altitude now and then; kamikazes aim at the chopper when close
      const dx = deltaX(e.x, chopper.x);
      const near = Math.abs(dx) < 200;
      if (near && chopper.alive && this.rng.chance(dt * (0.25 + this.wave * 0.05))) e.targetY = chopper.y;
      else if (this.rng.chance(dt * 0.3)) e.targetY = this.rng.range(SKY_TOP + 10, GROUND_Y - 30);
      e.y += Math.sign(e.targetY - e.y) * Math.min(Math.abs(e.targetY - e.y), 50 * dt);
      // they fire multi-warhead missiles when the chopper or the convoy is within reach
      e.fireT -= dt * fireRate(this.wave, this.level) * 4;
      if (e.fireT <= 0 && near && chopper.alive) {
        e.fireT = this.rng.range(2, 5);
        const toward = Math.sign(dx) || -1;
        this.missiles.push({ x: e.x + 8, y: e.y + 4, vx: toward * MISSILE_SPEED, vy: 20, t: 0, split: false, alive: true });
      }
      if (chopper.alive && hits(enemyRect(e), cRect)) { e.alive = false; out.chopperHit = true; }
    }

    for (const m of this.missiles) {
      if (!m.alive) continue;
      m.t += dt;
      m.x = wrapX(m.x + m.vx * dt);
      m.y += m.vy * dt;
      if (!m.split && m.t >= MISSILE_SPLIT_TIME) {
        // the warhead splits in two: one keeps diving, the other climbs
        m.split = true;
        this.missiles.push({ x: m.x, y: m.y, vx: m.vx, vy: -60, t: m.t, split: true, alive: true });
        m.vy = 70;
      }
      if (m.t > MISSILE_LIFE || m.y < SKY_TOP) m.alive = false;
      const r: Rect = { x: m.x, y: m.y, w: 4, h: 2 };
      if (m.alive && chopper.alive && hits(r, cRect)) { m.alive = false; out.chopperHit = true; }
      if (m.alive && m.y >= GROUND_Y - TRUCK_H) {
        m.alive = false;
        for (const t of this.trucks) {
          if (t.alive && hits(r, truckRect(t))) { t.alive = false; out.truckLost = true; }
        }
      }
    }

    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.t += dt;
      b.x = wrapX(b.x + b.vx * dt);
      if (b.t > BULLET_LIFE) { b.alive = false; continue; }
      const r: Rect = { x: b.x, y: b.y, w: 4, h: 1 };
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (hits(r, enemyRect(e))) {
          e.alive = false;
          b.alive = false;
          out.points += e.kind === 'jet' ? 200 : 100;
          break;
        }
      }
    }

    // the chopper crashing into the convoy takes a truck with it
    if (chopper.alive) {
      for (const t of this.trucks) {
        if (t.alive && hits(cRect, truckRect(t))) { t.alive = false; out.truckLost = true; out.chopperHit = true; }
      }
    }

    this.missiles = this.missiles.filter((m) => m.alive);
    this.bullets = this.bullets.filter((b) => b.alive);
    return out;
  }
}
