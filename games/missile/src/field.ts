import {
  W, SKY_TOP, GROUND_Y, BASE_X, CITY_X, EXPLOSION_R, EXPLOSION_GROW, EXPLOSION_HOLD, EXPLOSION_SHRINK, CHAIN_R,
  CRUISE_ALT_MIN, CRUISE_ALT_MAX, CRUISE_SPEED, CRUISE_EVADE_R, CRUISE_EVADE_SPEED, MIRV_FROM_WAVE, MIRV_CHANCE,
  waveMissiles, icbmSpeed, maxInFlight, spawnGap, CRUISE_FROM_WAVE,
} from './config';
import { Rng } from '@arcade/shared';

export interface Icbm {
  x0: number; y0: number; // where the trail starts
  x: number; y: number; // head
  tx: number; ty: number; // target
  vx: number; vy: number;
  /** index into targets: 0..5 city, 6 base */
  target: number;
  mirvAt: number; // y where it splits, or -1
  alive: boolean;
}

export interface Cruise {
  x: number; y: number;
  dir: 1 | -1;
  tx: number;
  target: number;
  diving: boolean;
  smart: boolean;
  alive: boolean;
  trail: { x: number; y: number }[];
}

export interface Abm {
  x: number; y: number;
  tx: number; ty: number;
  vx: number; vy: number;
  alive: boolean;
}

export interface Explosion {
  x: number; y: number;
  t: number;
  max: number;
  alive: boolean;
}

export function explosionRadius(e: Explosion): number {
  if (e.t < EXPLOSION_GROW) return e.max * (e.t / EXPLOSION_GROW);
  if (e.t < EXPLOSION_GROW + EXPLOSION_HOLD) return e.max;
  const k = (e.t - EXPLOSION_GROW - EXPLOSION_HOLD) / EXPLOSION_SHRINK;
  return Math.max(0, e.max * (1 - k));
}

export function targetX(target: number): number {
  return target >= 6 ? BASE_X : CITY_X[target];
}

export interface WaveEvents {
  icbmKilled: number;
  cruiseKilled: number;
  cityHit: number[];
  baseHit: boolean;
}

/** The sky: enemy missiles, ABMs and explosions of one wave. */
export class Field {
  icbms: Icbm[] = [];
  cruises: Cruise[] = [];
  abms: Abm[] = [];
  explosions: Explosion[] = [];
  /** enemy missiles still to launch */
  queue: number;
  cruiseQueue: number;
  private spawnT = 0.6;
  private rng: Rng;

  constructor(public wave: number, public children: boolean, public smartCruise: boolean, seed: number) {
    this.rng = new Rng(seed);
    this.queue = waveMissiles(wave, children);
    this.cruiseQueue = wave >= CRUISE_FROM_WAVE ? Math.min(4, 1 + Math.floor((wave - CRUISE_FROM_WAVE) / 2)) : 0;
  }

  get enemiesLeft(): number {
    return this.queue + this.cruiseQueue + this.icbms.filter((m) => m.alive).length + this.cruises.filter((c) => c.alive).length;
  }

  get done(): boolean {
    return this.enemiesLeft === 0 && this.explosions.every((e) => !e.alive);
  }

  /** Drops whatever is still to come (all cities gone). */
  abort(): void {
    this.queue = 0;
    this.cruiseQueue = 0;
    for (const m of this.icbms) m.alive = false;
    for (const c of this.cruises) c.alive = false;
  }

  private pickTarget(cities: boolean[]): number {
    const alive = cities.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    alive.push(6); // the base is always worth hitting
    return this.rng.pick(alive);
  }

  launchIcbm(cities: boolean[], x0?: number, y0 = SKY_TOP): void {
    const target = this.pickTarget(cities);
    const tx = targetX(target);
    const sx = x0 ?? this.rng.range(8, W - 8);
    const dx = tx - sx;
    const dy = GROUND_Y - y0;
    const len = Math.hypot(dx, dy);
    const v = icbmSpeed(this.wave, this.children) * (0.85 + this.rng.next() * 0.3);
    const mirv = this.wave >= MIRV_FROM_WAVE && y0 === SKY_TOP && this.rng.chance(MIRV_CHANCE) ? this.rng.range(60, 130) : -1;
    this.icbms.push({ x0: sx, y0, x: sx, y: y0, tx, ty: GROUND_Y, vx: (dx / len) * v, vy: (dy / len) * v, target, mirvAt: mirv, alive: true });
  }

  launchCruise(cities: boolean[]): void {
    const target = this.pickTarget(cities);
    const dir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
    const x = dir > 0 ? -6 : W + 6;
    const y = this.rng.range(CRUISE_ALT_MIN, CRUISE_ALT_MAX);
    this.cruises.push({ x, y, dir, tx: targetX(target), target, diving: false, smart: this.smartCruise, alive: true, trail: [] });
  }

  fire(x: number, y: number, speed: number): void {
    const dx = x - BASE_X;
    const dy = y - GROUND_Y;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.abms.push({ x: BASE_X, y: GROUND_Y, tx: x, ty: y, vx: (dx / len) * speed, vy: (dy / len) * speed, alive: true });
  }

  get abmsFlying(): number {
    return this.abms.filter((a) => a.alive).length;
  }

  explode(x: number, y: number, max = EXPLOSION_R): void {
    this.explosions.push({ x, y, t: 0, max, alive: true });
  }

  private inExplosion(x: number, y: number): boolean {
    for (const e of this.explosions) {
      if (!e.alive) continue;
      const r = explosionRadius(e);
      if ((x - e.x) ** 2 + (y - e.y) ** 2 <= r * r) return true;
    }
    return false;
  }

  update(dt: number, cities: boolean[]): WaveEvents {
    const ev: WaveEvents = { icbmKilled: 0, cruiseKilled: 0, cityHit: [], baseHit: false };

    // launches
    this.spawnT -= dt;
    const flying = this.icbms.filter((m) => m.alive).length + this.cruises.filter((c) => c.alive).length;
    if (this.spawnT <= 0 && flying < maxInFlight(this.wave, this.children)) {
      if (this.queue > 0) {
        this.queue--;
        this.launchIcbm(cities);
        this.spawnT = spawnGap(this.wave, this.children) * (0.6 + this.rng.next() * 0.8);
      } else if (this.cruiseQueue > 0) {
        this.cruiseQueue--;
        this.launchCruise(cities);
        this.spawnT = spawnGap(this.wave, this.children) * 2;
      }
    }

    // ABMs
    for (const a of this.abms) {
      if (!a.alive) continue;
      const step = Math.hypot(a.vx, a.vy) * dt;
      const left = Math.hypot(a.tx - a.x, a.ty - a.y);
      if (left <= step) {
        a.x = a.tx; a.y = a.ty; a.alive = false;
        this.explode(a.tx, a.ty);
      } else {
        a.x += a.vx * dt; a.y += a.vy * dt;
      }
    }

    // explosions
    for (const e of this.explosions) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.t >= EXPLOSION_GROW + EXPLOSION_HOLD + EXPLOSION_SHRINK) e.alive = false;
    }

    // enemy ICBMs
    const spawned: Icbm[] = [];
    for (const m of this.icbms) {
      if (!m.alive) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.mirvAt > 0 && m.y >= m.mirvAt) {
        m.mirvAt = -1;
        const n = this.rng.int(1, 2);
        for (let i = 0; i < n; i++) spawned.push(this.makeIcbm(cities, m.x, m.y));
      }
      if (this.inExplosion(m.x, m.y)) {
        m.alive = false;
        ev.icbmKilled++;
        this.explode(m.x, m.y, CHAIN_R);
        continue;
      }
      if (m.y >= GROUND_Y) {
        m.alive = false;
        if (m.target >= 6) ev.baseHit = true;
        else ev.cityHit.push(m.target);
        this.explode(m.tx, GROUND_Y - 2, 10);
      }
    }
    this.icbms.push(...spawned);

    // cruise missiles
    for (const c of this.cruises) {
      if (!c.alive) continue;
      if (!c.diving) {
        c.x += c.dir * CRUISE_SPEED * dt;
        if (c.smart) {
          // sidestep the nearest live explosion
          for (const e of this.explosions) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - c.x, e.y - c.y);
            if (d < CRUISE_EVADE_R) {
              c.y += (c.y < e.y ? -1 : 1) * CRUISE_EVADE_SPEED * dt;
              c.y = Math.max(SKY_TOP + 6, Math.min(GROUND_Y - 30, c.y));
            }
          }
        }
        if ((c.dir > 0 && c.x >= c.tx) || (c.dir < 0 && c.x <= c.tx)) c.diving = true;
        if (c.x < -10 || c.x > W + 10) { c.diving = true; }
      } else {
        c.y += CRUISE_SPEED * 1.6 * dt;
        if (c.y >= GROUND_Y) {
          c.alive = false;
          if (c.target >= 6) ev.baseHit = true;
          else ev.cityHit.push(c.target);
          this.explode(c.tx, GROUND_Y - 2, 10);
          continue;
        }
      }
      c.trail.push({ x: c.x, y: c.y });
      if (c.trail.length > 24) c.trail.shift();
      if (this.inExplosion(c.x, c.y)) {
        c.alive = false;
        ev.cruiseKilled++;
        this.explode(c.x, c.y, CHAIN_R);
      }
    }

    this.icbms = this.icbms.filter((m) => m.alive);
    this.cruises = this.cruises.filter((c) => c.alive);
    this.abms = this.abms.filter((a) => a.alive);
    this.explosions = this.explosions.filter((e) => e.alive);
    return ev;
  }

  private makeIcbm(cities: boolean[], x0: number, y0: number): Icbm {
    const before = this.icbms.length;
    this.launchIcbm(cities, x0, y0);
    const m = this.icbms.pop()!;
    void before;
    return m;
  }
}
