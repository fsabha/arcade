/**
 * COMETA, the game itself, with no drawing and no DOM: a comet climbs through a nebula while
 * the camera follows it upward. The playfield is 1 unit wide and H units tall (H = screen
 * height / width), y grows upward and the camera bottom sits at camY.
 *
 * Steering is relative: the finger's movement moves the comet's target, wherever the finger is.
 * A tap fires a dash (fast, invulnerable, breaks rocks) that costs one charge; light orbs refill
 * the charges and build a combo that multiplies every point. Black holes pull the comet: brushing
 * their core costs energy, orbiting close and escaping pays a slingshot bonus. Gates pay for
 * flying between their two beacons. Three hits and the run is over.
 */
import { Rng } from '@arcade/shared';

export const COMET_R = 0.022;
export const ORB_R = 0.03;
export const MAX_SHIELD = 3;
export const MAX_CHARGES = 3;
export const DASH_TIME = 0.5;
export const INVULNERABLE = 1.4;
export const COMBO_TIME = 1.8;

export interface Orb { x: number; y: number; taken: boolean; phase: number }
export interface Rock { x: number; y: number; r: number; vx: number; vy: number; spin: number; a: number; seed: number; broken: boolean }
export interface Hole { x: number; y: number; core: number; reach: number; close: number; paid: boolean }
export interface Gate { x1: number; x2: number; y: number; passed: boolean; missed: boolean }

export type EventKind = 'orb' | 'hit' | 'gate' | 'dash' | 'sling' | 'break' | 'over' | 'level';
export interface WorldEvent { kind: EventKind; x: number; y: number; value: number }

export class World {
  readonly W = 1;
  H: number;
  t = 0;
  camY = 0;
  speed = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  comboT = 0;
  shield = MAX_SHIELD;
  charges = 1;
  inv = 0;
  dashT = 0;
  over = false;
  /** sector of the nebula (changes colour every 60 units) */
  sector = 0;
  comet = { x: 0.5, y: 0, tx: 0.5, sy: 0.26, ty: 0.26 };
  orbs: Orb[] = [];
  rocks: Rock[] = [];
  holes: Hole[] = [];
  gates: Gate[] = [];
  events: WorldEvent[] = [];
  private rng: Rng;
  private nextSpawn: number;
  private lastHole = -10;
  private frac = 0;

  constructor(H: number, seed = Date.now()) {
    this.H = H;
    this.rng = new Rng(seed);
    this.comet.y = this.comet.sy * H;
    this.nextSpawn = H * 0.75;
  }

  /** Distance flown, in "km" for the HUD (10 per unit). */
  get distance(): number {
    return Math.floor(this.camY * 10);
  }

  get mult(): number {
    return Math.min(8, 1 + Math.floor(this.combo / 6));
  }

  /** The screen got taller or shorter (rotation, browser bars). */
  resize(H: number): void {
    this.H = H;
  }

  /** Finger moved by (dx, dy) playfield units, dy positive downward on screen. */
  steer(dx: number, dy: number): void {
    if (this.over) return;
    const c = this.comet;
    c.tx = Math.max(0.04, Math.min(0.96, c.tx + dx * 1.25));
    c.ty = Math.max(0.1, Math.min(0.72, c.ty - (dy * 1.25) / this.H));
  }

  /** A tap: dash if a charge is available. */
  tap(): boolean {
    if (this.over || this.dashT > 0 || this.charges < 1) return false;
    this.charges -= 1;
    this.dashT = DASH_TIME;
    this.emit('dash', this.comet.x, this.comet.y, 0);
    return true;
  }

  private emit(kind: EventKind, x: number, y: number, value: number): void {
    this.events.push({ kind, x, y, value });
  }

  private hit(): void {
    if (this.inv > 0 || this.dashT > 0 || this.over) return;
    this.shield -= 1;
    this.inv = INVULNERABLE;
    this.combo = 0;
    this.comboT = 0;
    this.emit('hit', this.comet.x, this.comet.y, this.shield);
    if (this.shield <= 0) {
      this.over = true;
      this.emit('over', this.comet.x, this.comet.y, this.score);
    }
  }

  private add(points: number): number {
    const p = Math.round(points * this.mult);
    this.score += p;
    return p;
  }

  update(dt: number): void {
    // fixed sub-steps keep collisions honest at any frame rate
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h);
  }

  private step(dt: number): void {
    if (this.over) return;
    this.t += dt;
    const c = this.comet;
    const base = Math.min(1.75, 0.55 + this.t * 0.011);
    this.speed = base * (this.dashT > 0 ? 2.1 : 1);
    this.camY += this.speed * dt;
    this.frac += this.speed * dt * 10;
    if (this.frac >= 1) { this.score += Math.floor(this.frac); this.frac -= Math.floor(this.frac); }
    const sector = Math.floor(this.camY / 60);
    if (sector !== this.sector) { this.sector = sector; this.emit('level', c.x, c.y, sector); }

    // black holes pull the target and the comet alike
    for (const hole of this.holes) {
      const dx = hole.x - c.x, dy = hole.y - c.y;
      const d = Math.hypot(dx, dy) || 1e-4;
      if (d < hole.reach) {
        const f = Math.min(2.4, 0.016 / (d * d + 0.003)) * dt;
        c.tx = Math.max(0.04, Math.min(0.96, c.tx + (dx / d) * f));
        c.ty = Math.max(0.1, Math.min(0.72, c.ty + ((dy / d) * f) / this.H));
        c.x += (dx / d) * f * 0.5;
        if (d < hole.reach * 0.5) hole.close += dt;
      }
      if (d < hole.core + COMET_R) {
        this.hit();
        // thrown clear of the core
        const away = c.x < hole.x ? -1 : 1;
        c.tx = Math.max(0.04, Math.min(0.96, hole.x + away * (hole.reach * 0.7)));
        c.x = hole.x + away * (hole.core + COMET_R * 2);
        hole.close = 0;
      } else if (!hole.paid && hole.close > 0.35 && d > hole.reach * 0.5) {
        hole.paid = true;
        const p = this.add(40 + Math.round(hole.close * 120));
        this.emit('sling', c.x, c.y, p);
      }
    }

    // the comet chases its target (critically damped feel)
    const k = 1 - Math.exp(-dt * 16);
    c.x += (c.tx - c.x) * k;
    c.sy += (c.ty - c.sy) * k;
    const prevY = c.y;
    c.y = this.camY + c.sy * this.H;

    for (const o of this.orbs) {
      if (o.taken) continue;
      if (Math.hypot(o.x - c.x, o.y - c.y) < ORB_R + COMET_R + 0.012) {
        o.taken = true;
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.comboT = COMBO_TIME;
        this.charges = Math.min(MAX_CHARGES, this.charges + 0.1);
        const p = this.add(10);
        this.emit('orb', o.x, o.y, p);
      }
    }

    for (const r of this.rocks) {
      if (r.broken) continue;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.a += r.spin * dt;
      if (r.x < -0.1 || r.x > 1.1) r.vx = -r.vx;
      if (Math.hypot(r.x - c.x, r.y - c.y) < r.r * 0.85 + COMET_R) {
        if (this.dashT > 0) {
          r.broken = true;
          const p = this.add(25);
          this.emit('break', r.x, r.y, p);
        } else this.hit();
      }
    }

    for (const g of this.gates) {
      if (g.passed || g.missed) continue;
      if (prevY < g.y && c.y >= g.y) {
        if (c.x > g.x1 && c.x < g.x2) {
          g.passed = true;
          const p = this.add(100);
          this.emit('gate', (g.x1 + g.x2) / 2, g.y, p);
        } else g.missed = true;
      }
    }

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.inv > 0) this.inv -= dt;
    if (this.dashT > 0) this.dashT -= dt;

    while (this.nextSpawn < this.camY + this.H + 0.4) this.spawn(this.nextSpawn);
    const floor = this.camY - 0.35;
    this.orbs = this.orbs.filter((o) => o.y > floor && !(o.taken && o.y < c.y - 0.2));
    this.rocks = this.rocks.filter((r) => r.y > floor - r.r && !r.broken);
    this.holes = this.holes.filter((h2) => h2.y > floor - h2.reach);
    this.gates = this.gates.filter((g) => g.y > floor);
  }

  /** Lays out one band of the course starting at height y. */
  private spawn(y: number): void {
    const rng = this.rng;
    const d = Math.min(1, this.t / 110); // difficulty 0..1
    const early = this.camY < 2;
    const roll = rng.next();
    if (early || roll < 0.38) {
      // a ribbon of light
      const n = rng.int(6, 9), x0 = rng.range(0.2, 0.8), amp = rng.range(0.08, 0.22), ph = rng.range(0, 6.28);
      for (let i = 0; i < n; i++) {
        const x = Math.max(0.06, Math.min(0.94, x0 + Math.sin(ph + i * 0.7) * amp));
        this.orbs.push({ x, y: y + i * 0.075, taken: false, phase: rng.next() * 6.28 });
      }
      if (!early && rng.chance(0.3 + d * 0.4)) this.rock(y + rng.range(0.1, 0.5), d);
      this.nextSpawn = y + n * 0.075 + rng.range(0.15, 0.3);
      return;
    }
    if (roll < 0.62) {
      const n = 1 + rng.int(0, Math.round(1 + d * 2.5));
      for (let i = 0; i < n; i++) this.rock(y + rng.range(0, 0.45), d);
      if (rng.chance(0.5)) this.orbs.push({ x: rng.range(0.1, 0.9), y: y + rng.range(0.1, 0.4), taken: false, phase: 0 });
      this.nextSpawn = y + rng.range(0.38, 0.55) - d * 0.12;
      return;
    }
    if (roll < 0.8 && this.t > 12 && y - this.lastHole > 2.2) {
      const x = rng.range(0.28, 0.72), hy = y + 0.35;
      const hole: Hole = { x, y: hy, core: 0.034, reach: 0.34, close: 0, paid: false };
      this.holes.push(hole);
      this.lastHole = hy;
      // a ring of light around it, to tempt an orbit
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const ox = x + Math.cos(a) * 0.15, oy = hy + Math.sin(a) * 0.15;
        if (ox > 0.05 && ox < 0.95) this.orbs.push({ x: ox, y: oy, taken: false, phase: a });
      }
      this.nextSpawn = hy + 0.6;
      return;
    }
    if (this.t > 6) {
      const gap = 0.3 - d * 0.1, cx = rng.range(0.2 + gap / 2, 0.8 - gap / 2);
      this.gates.push({ x1: cx - gap / 2, x2: cx + gap / 2, y: y + 0.2, passed: false, missed: false });
      this.orbs.push({ x: cx, y: y + 0.2, taken: false, phase: 0 });
      if (d > 0.3) this.rock(y + 0.55, d);
      this.nextSpawn = y + 0.55;
      return;
    }
    this.rock(y + 0.2, d);
    this.nextSpawn = y + 0.4;
  }

  private rock(y: number, d: number): void {
    const rng = this.rng;
    const r = rng.range(0.03, 0.055 + d * 0.03);
    this.rocks.push({
      x: rng.range(0.08, 0.92), y, r,
      vx: rng.range(-1, 1) * (0.02 + d * 0.08), vy: -rng.range(0, 0.05 + d * 0.12),
      spin: rng.range(-1.5, 1.5), a: rng.range(0, 6.28), seed: rng.next(), broken: false,
    });
  }
}
