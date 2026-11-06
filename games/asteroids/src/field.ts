import {
  W, H, FIELD_TOP, FIELD_H, Size, RADIUS, SPEED_SLOW, FAST_FACTOR, SHOT_SPEED, SHOT_LIFE, SATELLITE_SPEED, UFO_SPEED,
  SAUCER_SHOT_SPEED, SATELLITE_FIRE_EVERY, UFO_FIRE_EVERY, SATELLITE_AIM_ERROR, UFO_AIM_ERROR,
} from './config';
import { Rng } from '@arcade/shared';

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: Size;
  shape: number; // 0 or 1
  r: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
}

export type SaucerKind = 'satellite' | 'ufo';

export interface Saucer {
  kind: SaucerKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fireT: number;
  wobbleT: number;
  r: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function wrapX(x: number): number {
  return ((x % W) + W) % W;
}

export function wrapY(y: number): number {
  return FIELD_TOP + ((((y - FIELD_TOP) % FIELD_H) + FIELD_H) % FIELD_H);
}

/** Shortest wrapped distance squared between two points on the torus. */
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  if (dx > W / 2) dx = W - dx;
  if (dy > FIELD_H / 2) dy = FIELD_H - dy;
  return dx * dx + dy * dy;
}

export class Field {
  asteroids: Asteroid[] = [];
  shots: Shot[] = [];
  saucer: Saucer | null = null;
  debris: Debris[] = [];
  rng: Rng;

  constructor(seed: number, public fast: boolean) {
    this.rng = new Rng(seed);
  }

  private speedFor(size: Size): number {
    const base = SPEED_SLOW[size] * (this.fast ? FAST_FACTOR : 1);
    return base * this.rng.range(0.75, 1.25);
  }

  /** New wave: n large asteroids away from the centre. */
  spawnWave(n: number): void {
    for (let i = 0; i < n; i++) {
      let x = 0;
      let y = 0;
      do {
        x = this.rng.range(0, W);
        y = this.rng.range(FIELD_TOP, H);
      } while (dist2(x, y, W / 2, FIELD_TOP + FIELD_H / 2) < 70 * 70);
      this.push('large', x, y);
    }
  }

  private push(size: Size, x: number, y: number): void {
    const a = this.rng.range(0, Math.PI * 2);
    const s = this.speedFor(size);
    this.asteroids.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size, shape: this.rng.int(0, 1), r: RADIUS[size] });
  }

  /** Breaks an asteroid: large -> 2 medium, medium -> 2 small, small -> dust. */
  split(a: Asteroid, kids: boolean): void {
    const i = this.asteroids.indexOf(a);
    if (i >= 0) this.asteroids.splice(i, 1);
    this.burst(a.x, a.y, a.r);
    if (a.size === 'small' || (kids && a.size === 'medium')) return;
    const next: Size = a.size === 'large' ? 'medium' : 'small';
    for (let k = 0; k < 2; k++) this.push(next, a.x, a.y);
  }

  burst(x: number, y: number, r: number, color = '#dfe6ee'): void {
    const n = 6 + Math.floor(r / 2);
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(20, 70);
      this.debris.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: this.rng.range(0.3, 0.8), color });
    }
  }

  fire(x: number, y: number, angle: number, enemy: boolean, baseVx = 0, baseVy = 0): void {
    this.shots.push({ x, y, vx: Math.cos(angle) * SHOT_SPEED + baseVx, vy: Math.sin(angle) * SHOT_SPEED + baseVy, life: SHOT_LIFE, enemy });
  }

  spawnSaucer(kind: SaucerKind): void {
    const fromLeft = this.rng.chance(0.5);
    const speed = kind === 'satellite' ? SATELLITE_SPEED : UFO_SPEED;
    this.saucer = {
      kind,
      x: fromLeft ? -12 : W + 12,
      y: this.rng.range(FIELD_TOP + 20, H - 20),
      vx: fromLeft ? speed : -speed,
      vy: 0,
      fireT: kind === 'satellite' ? SATELLITE_FIRE_EVERY : UFO_FIRE_EVERY,
      wobbleT: this.rng.range(1, 2.5),
      r: kind === 'satellite' ? 9 : 6,
    };
  }

  update(dt: number, ship: { x: number; y: number; alive: boolean } | null): void {
    for (const a of this.asteroids) {
      a.x = wrapX(a.x + a.vx * dt);
      a.y = wrapY(a.y + a.vy * dt);
    }
    for (const s of this.shots) {
      s.x = wrapX(s.x + s.vx * dt);
      s.y = wrapY(s.y + s.vy * dt);
      s.life -= dt;
    }
    this.shots = this.shots.filter((s) => s.life > 0);
    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0);

    const u = this.saucer;
    if (u) {
      u.wobbleT -= dt;
      if (u.wobbleT <= 0) { u.wobbleT = this.rng.range(0.8, 2.2); u.vy = this.rng.pick([-1, 0, 0, 1]) * Math.abs(u.vx) * 0.6; }
      u.x += u.vx * dt;
      u.y = wrapY(u.y + u.vy * dt);
      if (u.x < -16 || u.x > W + 16) { this.saucer = null; return; }
      u.fireT -= dt;
      if (u.fireT <= 0 && ship && ship.alive) {
        u.fireT = u.kind === 'satellite' ? SATELLITE_FIRE_EVERY : UFO_FIRE_EVERY;
        let dx = ship.x - u.x;
        let dy = ship.y - u.y;
        if (Math.abs(dx) > W / 2) dx -= Math.sign(dx) * W;
        if (Math.abs(dy) > FIELD_H / 2) dy -= Math.sign(dy) * FIELD_H;
        const err = u.kind === 'satellite' ? SATELLITE_AIM_ERROR : UFO_AIM_ERROR;
        const ang = Math.atan2(dy, dx) + this.rng.range(-err, err);
        this.shots.push({ x: u.x, y: u.y, vx: Math.cos(ang) * SAUCER_SHOT_SPEED, vy: Math.sin(ang) * SAUCER_SHOT_SPEED, life: 1.1, enemy: true });
      }
    }
  }

  /** The asteroid hit by a point (shot or ship centre with extra radius), if any. */
  asteroidAt(x: number, y: number, extra = 0): Asteroid | null {
    for (const a of this.asteroids) {
      const r = a.r + extra;
      if (dist2(x, y, a.x, a.y) <= r * r) return a;
    }
    return null;
  }

  saucerAt(x: number, y: number, extra = 0): boolean {
    const u = this.saucer;
    if (!u) return false;
    const r = u.r + extra;
    return dist2(x, y, u.x, u.y) <= r * r;
  }

  clearNear(x: number, y: number, radius: number): boolean {
    for (const a of this.asteroids) if (dist2(x, y, a.x, a.y) < (radius + a.r) ** 2) return false;
    if (this.saucer && dist2(x, y, this.saucer.x, this.saucer.y) < (radius + 12) ** 2) return false;
    for (const s of this.shots) if (s.enemy && dist2(x, y, s.x, s.y) < radius * radius) return false;
    return true;
  }
}
