/**
 * BROTO, the game itself, with no drawing and no DOM. One lane seen from above, 1 unit wide and H
 * tall, y growing DOWN. The Sower (a flower) sits at the bottom and lets out a stream of seeds of
 * light; gates on the way add, multiply, absorb or halve them; the Ash pours down from a Dry Heart
 * at the top. Seeds and ash that meet cancel out, hit point for hit point. Once the heart's horde
 * is spent, seeds that reach it crack it open; ash that reaches the Sower tears its petals.
 *
 * Thousands of units at once, so they live in flat typed arrays and collide through a grid.
 */
import { Rng } from '@arcade/shared';

export const MAX_UNITS = 3500;
export const SEED_R = 0.0085;
export const SPROUT_R = 0.024;
export const CELL = 0.03;
/** ash hit points a petal soaks up before it falls */
export const PETAL_HP = 15;
export const SPROUT_HP = 15;
export const DEW_REFILL = 0.8;

/**
 * add: Orvalho (lets out n seeds when crossed, then refills for 0.8 s) · mul: Raiz/Florada/Vento (×n) · sub: Espinho (absorbs n, then is spent)
 * div: Geada (keeps one in n) · well: Olho-d'Água (×n through its central 30%, nothing outside)
 */
export type GateOp = 'add' | 'mul' | 'sub' | 'div' | 'well';
export interface GateDef {
  op: GateOp;
  n: number;
  /** centre x and width (0..1) */
  x: number;
  w: number;
  /** position along the lane: 0 = the heart, 1 = the Sower */
  y: number;
  /** horizontal sway: amplitude and speed (rad/s) */
  amp?: number;
  speed?: number;
  phase?: number;
  /** wilts after this many seeds */
  uses?: number;
}
/** Stones: block both crowds. y and h are fractions of the lane. */
export interface StoneDef { x: number; y: number; w: number; h: number }
export interface LevelDef {
  name: string;
  gates: GateDef[];
  stones?: StoneDef[];
  /** ash in the horde, how much is already on the lane, and how fast the rest comes */
  horde: number;
  opening: number;
  rate: number;
  foeSpeed: number;
  /** share of the ash that are embers (3 hit points) */
  embers?: number;
  heartHp: number;
  /** a sudden extra wave when half the horde is out */
  surge?: number;
  /** the heart has this many stages; each new stage releases `stageWave` ash and shields it again */
  stages?: number;
  stageWave?: number;
  /** night: gates are hidden until seeds come close */
  dark?: boolean;
  /** target time in seconds (finishing faster scores) */
  par: number;
}

export interface Gate extends GateDef { x0: number; cx: number; left: number; flash: number; used: number; hidden: number; cool: number }
export type Stone = StoneDef;

/** What the gifts between stages change. */
export interface Gifts {
  /** seeds per second */
  rate: number;
  /** chance a seed survives a clash */
  bark: number;
  /** multiplier on Orvalho gates */
  pollen: number;
  /** seeds already on the lane at the start */
  head: number;
  /** seeds to fill the sprout meter */
  sproutEvery: number;
}
export const BASE_GIFTS: Gifts = { rate: 10, bark: 0, pollen: 1, head: 0, sproutEvery: 40 };

export type EventKind = 'fire' | 'sprout' | 'gate' | 'well' | 'clash' | 'hit' | 'shield' | 'petal' | 'crack' | 'stage' | 'surge' | 'win' | 'lose' | 'open';
export interface WorldEvent { kind: EventKind; x: number; y: number; value: number; op?: GateOp }

/** A pool of units in flat arrays; removal swaps the last one in. */
export class Crowd {
  n = 0;
  x = new Float32Array(MAX_UNITS);
  y = new Float32Array(MAX_UNITS);
  vx = new Float32Array(MAX_UNITS);
  vy = new Float32Array(MAX_UNITS);
  hp = new Uint8Array(MAX_UNITS);
  big = new Uint8Array(MAX_UNITS);
  /** bit per gate already crossed (seeds only) */
  seen = new Uint32Array(MAX_UNITS);
  seed = new Float32Array(MAX_UNITS);

  add(x: number, y: number, vx: number, vy: number, hp: number, big: number, seen: number, seed: number): number {
    if (this.n >= MAX_UNITS) return -1;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.hp[i] = hp; this.big[i] = big; this.seen[i] = seen; this.seed[i] = seed;
    return i;
  }

  remove(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
    this.hp[i] = this.hp[j]; this.big[i] = this.big[j]; this.seen[i] = this.seen[j]; this.seed[i] = this.seed[j];
  }

  hpTotal(): number {
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.hp[i];
    return s;
  }
}

/** A uniform grid over the lane; cells hold linked lists of unit indices. */
class Grid {
  cols = 1;
  rows = 1;
  head = new Int32Array(1);
  next = new Int32Array(MAX_UNITS);

  build(c: Crowd, H: number): void {
    this.cols = Math.ceil(1 / CELL) + 1;
    this.rows = Math.ceil(H / CELL) + 3;
    const size = this.cols * this.rows;
    if (this.head.length < size) this.head = new Int32Array(size);
    this.head.fill(-1, 0, size);
    for (let i = 0; i < c.n; i++) {
      const k = this.cell(c.x[i], c.y[i]);
      this.next[i] = this.head[k];
      this.head[k] = i;
    }
  }

  cell(x: number, y: number): number {
    const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(x / CELL)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(y / CELL) + 1));
    return cy * this.cols + cx;
  }
}

export class World {
  readonly W = 1;
  H: number;
  t = 0;
  level: LevelDef;
  gifts: Gifts;
  seeds = new Crowd();
  ash = new Crowd();
  gates: Gate[] = [];
  stones: Stone[] = [];
  sower = { x: 0.5, tx: 0.5, firing: false, recoil: 0 };
  heartHp: number;
  heartMax: number;
  /** stage of the heart (0-based) */
  stage = 0;
  /** ash hit points the petals can still take */
  petalHp: number;
  petalsAtStart: number;
  /** ash still to come out of the heart */
  hordeLeft: number;
  charge = 0;
  score = 0;
  /** seeds through a well's centre (for the perfect-bloom bonus) */
  wellHits = 0;
  made = 0;
  done: 'win' | 'lose' | null = null;
  events: WorldEvent[] = [];
  private rng: Rng;
  private shot = 0;
  private spawnAcc = 0;
  private surged = false;
  private wasOpen = false;
  private gridA = new Grid();
  private gridS = new Grid();
  private clashBudget = 0;

  constructor(H: number, level: LevelDef, petals = 3, gifts: Gifts = BASE_GIFTS, seed = Date.now()) {
    this.H = H;
    this.level = level;
    this.gifts = gifts;
    this.rng = new Rng(seed);
    this.heartHp = this.heartMax = level.heartHp;
    this.petalHp = petals * PETAL_HP;
    this.petalsAtStart = petals;
    this.gates = level.gates.map((g) => ({ ...g, x0: g.x, cx: g.amp ? Math.max(g.w / 2, Math.min(1 - g.w / 2, g.x + Math.sin(g.phase ?? 0) * g.amp)) : g.x, left: g.op === 'sub' ? g.n : 0, flash: 0, used: 0, hidden: level.dark ? 1 : 0, cool: 0 }));
    this.stones = (level.stones ?? []).map((s) => ({ ...s }));
    const open = Math.min(level.horde, level.opening);
    this.hordeLeft = level.horde - open;
    for (let i = 0; i < open; i++) this.spawnAsh(this.top + 0.03 + this.rng.range(0, this.laneLen * 0.14));
    for (let i = 0; i < gifts.head; i++) this.seeds.add(this.rng.range(0.25, 0.75), this.bottom - 0.05 - this.rng.range(0, 0.25), 0, -0.36, 1, 0, 0, this.rng.next());
  }

  get top(): number { return 0.2; }
  get bottom(): number { return this.H - 0.12; }
  get laneLen(): number { return this.bottom - this.top; }
  laneY(f: number): number { return this.top + f * this.laneLen; }
  get petals(): number { return Math.ceil(this.petalHp / PETAL_HP); }
  /** The heart only cracks once its horde is spent. */
  get open(): boolean { return this.hordeLeft <= 0 && this.ash.n === 0; }
  get sproutReady(): boolean { return this.charge >= this.gifts.sproutEvery; }

  resize(H: number): void { this.H = H; }

  aim(x: number): void { this.sower.tx = Math.max(0.08, Math.min(0.92, x)); }
  nudge(dx: number): void { this.aim(this.sower.tx + dx); }

  /** Second finger: lets out a Sprout when the meter is full. */
  sprout(): boolean {
    if (this.done || !this.sproutReady) return false;
    this.charge = 0;
    // a sprout skips the gates: it is not multiplied
    this.seeds.add(this.sower.x, this.bottom - 0.04, 0, -0.2, SPROUT_HP, 1, 0xffffffff, this.rng.next());
    this.emit('sprout', this.sower.x, this.bottom, 0);
    return true;
  }

  private emit(kind: EventKind, x: number, y: number, value: number, op?: GateOp): void {
    this.events.push({ kind, x, y, value, op });
  }

  private spawnAsh(y: number): void {
    const ember = this.rng.chance(this.level.embers ?? 0);
    this.ash.add(this.rng.range(0.08, 0.92), y, 0, 0, ember ? 3 : 1, ember ? 1 : 0, 0, this.rng.next());
  }

  update(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 60) - 1e-6));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
  }

  private step(dt: number): void {
    this.t += dt;
    const S = this.sower;
    S.x += (S.tx - S.x) * (1 - Math.exp(-dt * 18));
    S.recoil = Math.max(0, S.recoil - dt * 6);
    this.clashBudget = Math.min(40, this.clashBudget + dt * 90);
    const lv = this.level;

    if (!this.done) {
      if (S.firing) {
        this.shot += dt * this.gifts.rate;
        while (this.shot >= 1) {
          this.shot -= 1;
          if (this.charge < this.gifts.sproutEvery) this.charge++;
          S.recoil = 1;
          this.seeds.add(S.x + this.rng.range(-0.006, 0.006), this.bottom - 0.03, this.rng.range(-0.02, 0.02), -0.7, 1, 0, 0, this.rng.next());
          this.emit('fire', S.x, this.bottom, 0);
        }
      } else this.shot = Math.min(this.shot, 0.99);

      // the heart lets its horde out
      if (this.hordeLeft > 0) {
        this.spawnAcc += dt * lv.rate;
        while (this.spawnAcc >= 1 && this.hordeLeft > 0) { this.spawnAcc -= 1; this.hordeLeft--; this.spawnAsh(this.top + this.rng.range(0, 0.04)); }
        if (lv.surge && !this.surged && this.hordeLeft <= (lv.horde - lv.opening) / 2) {
          this.surged = true;
          for (let i = 0; i < lv.surge; i++) this.spawnAsh(this.top + this.rng.range(0, 0.12));
          this.emit('surge', 0.5, this.top, lv.surge);
        }
      }
      const open = this.open;
      if (open && !this.wasOpen) this.emit('open', 0.5, this.top, 0);
      this.wasOpen = open;
    }

    for (const g of this.gates) {
      if (g.amp) g.cx = Math.max(g.w / 2, Math.min(1 - g.w / 2, g.x0 + Math.sin(this.t * (g.speed ?? 1) + (g.phase ?? 0)) * g.amp));
      g.flash = Math.max(0, g.flash - dt * 4);
      g.cool = Math.max(0, g.cool - dt);
    }

    this.moveSeeds(dt);
    this.moveAsh(dt);
    this.clash();

    if (this.done) return;
    // stages of the heart
    const stages = lv.stages ?? 1;
    if (stages > 1) {
      const next = this.stage + 1;
      if (next < stages && this.heartHp <= this.heartMax * (1 - next / stages)) {
        this.stage = next;
        this.heartHp = Math.round(this.heartMax * (1 - next / stages));
        this.hordeLeft += lv.stageWave ?? 300;
        this.wasOpen = false;
        this.emit('stage', 0.5, this.top, next);
      }
    }
    if (this.heartHp <= 0) {
      this.heartHp = 0;
      this.done = 'win';
      for (let i = 0; i < this.ash.n; i++) this.ash.hp[i] = 0;
      this.emit('win', 0.5, this.top, this.score);
    } else if (this.petalHp <= 0) {
      this.petalHp = 0;
      this.done = 'lose';
      this.emit('lose', S.x, this.bottom, this.score);
    }
  }

  private separation(c: Crowd, grid: Grid, i: number, r: number, bigR: number): [number, number] {
    let px = 0, py = 0;
    const cx = Math.floor(c.x[i] / CELL), cy = Math.floor(c.y[i] / CELL) + 1;
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= grid.rows) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= grid.cols) continue;
        for (let j = grid.head[gy * grid.cols + gx]; j !== -1; j = grid.next[j]) {
          if (j === i || j >= c.n) continue;
          const dx = c.x[i] - c.x[j], dy = c.y[i] - c.y[j];
          const rr = r + (c.big[j] ? bigR : SEED_R);
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 1e-10) { const d = Math.sqrt(d2), k = (rr - d) / d; px += dx * k; py += dy * k; }
        }
      }
    }
    return [px, py];
  }

  private moveSeeds(dt: number): void {
    const o = this.seeds;
    this.gridS.build(o, this.H);
    const open = this.open;
    for (let i = o.n - 1; i >= 0; i--) {
      const big = o.big[i] === 1;
      const r = big ? SPROUT_R : SEED_R;
      o.vy[i] += ((big ? -0.22 : -0.36) - o.vy[i]) * Math.min(1, dt * 3);
      o.vx[i] *= 1 - Math.min(1, dt * 3);
      const [px, py] = this.separation(o, this.gridS, i, r, SPROUT_R);
      const prevY = o.y[i];
      o.x[i] += o.vx[i] * dt + px * (big ? 0.1 : 0.5);
      o.y[i] += o.vy[i] * dt + py * 0.3;
      if (o.x[i] < 0.03 + r) { o.x[i] = 0.03 + r; o.vx[i] = Math.abs(o.vx[i]); }
      if (o.x[i] > 0.97 - r) { o.x[i] = 0.97 - r; o.vx[i] = -Math.abs(o.vx[i]); }
      this.pushOutOfStones(o, i, r);

      // gates: each acts once per seed (its copies inherit that)
      let gone = false;
      for (let g = 0; g < this.gates.length && !gone; g++) {
        const G = this.gates[g], bit = 1 << g;
        if (o.seen[i] & bit) continue;
        const gy = this.laneY(G.y);
        // at night a gate shows itself once seeds come within 40% of the screen
        if (G.hidden > 0 && o.y[i] - gy < this.H * 0.4) G.hidden = 0;
        if (prevY > gy && o.y[i] <= gy && Math.abs(o.x[i] - G.cx) < G.w / 2) {
          o.seen[i] |= bit;
          gone = this.applyGate(G, i);
        }
      }
      if (gone || i >= o.n) continue;
      if (o.y[i] < this.top + 0.01) {
        if (open && !this.done) {
          const dmg = o.hp[i];
          this.heartHp -= dmg;
          this.score += dmg * 10;
          this.emit('hit', o.x[i], this.top, dmg);
          if (this.rng.chance(0.08)) this.emit('crack', o.x[i], this.top, 0);
        } else this.emit('shield', o.x[i], this.top, 0);
        o.remove(i);
      }
    }
  }

  /** Returns true when seed i is gone. */
  private applyGate(G: Gate, i: number): boolean {
    const o = this.seeds;
    if (G.uses !== undefined && G.used >= G.uses) return false; // wilted
    G.used++;
    G.flash = 1;
    const copy = (n: number) => {
      for (let k = 0; k < n; k++) {
        const a = this.rng.range(-1, 1);
        if (o.add(o.x[i] + a * G.w * 0.22, o.y[i] - this.rng.range(0, 0.025), a * 0.45, o.vy[i], o.hp[i], o.big[i], o.seen[i], this.rng.next()) < 0) break;
        this.made++;
      }
    };
    switch (G.op) {
      case 'add':
        if (G.cool > 0) return false;
        G.cool = DEW_REFILL;
        copy(Math.round(G.n * this.gifts.pollen));
        this.emit('gate', o.x[i], o.y[i], G.n, 'add');
        return false;
      case 'mul': copy(G.n - 1); this.emit('gate', o.x[i], o.y[i], G.n, 'mul'); return false;
      case 'well':
        if (Math.abs(o.x[i] - G.cx) < G.w * 0.15) { copy(G.n - 1); this.wellHits++; this.emit('well', o.x[i], o.y[i], G.n, 'well'); }
        return false;
      case 'sub':
        if (G.left > 0) { G.left--; this.emit('gate', o.x[i], o.y[i], G.left, 'sub'); o.remove(i); return true; }
        return false;
      case 'div':
        G.left = (G.left + 1) % G.n;
        if (G.left !== 0) { this.emit('gate', o.x[i], o.y[i], G.n, 'div'); o.remove(i); return true; }
        return false;
    }
  }

  private pushOutOfStones(c: Crowd, i: number, r: number): void {
    for (const s of this.stones) {
      const hh = (s.h * this.laneLen) / 2, hw = s.w / 2;
      const cy = this.laneY(s.y) + hh;
      const dx = c.x[i] - s.x, dy = c.y[i] - cy;
      const ox = hw + r - Math.abs(dx), oy = hh + r - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        if (ox < oy) { c.x[i] += Math.sign(dx || 1) * ox; c.vx[i] = Math.sign(dx || 1) * 0.25; }
        else c.y[i] += Math.sign(dy || 1) * oy;
      }
    }
  }

  private moveAsh(dt: number): void {
    const f = this.ash;
    this.gridA.build(f, this.H);
    const sp = this.level.foeSpeed;
    for (let i = f.n - 1; i >= 0; i--) {
      if (f.hp[i] === 0) { f.remove(i); continue; }
      const big = f.big[i] === 1;
      const r = big ? SEED_R * 1.6 : SEED_R;
      // drifts down and is drawn to the Sower's light, more and more as it comes closer
      const prog = Math.max(0, Math.min(1, (f.y[i] - this.top) / this.laneLen));
      const tx = (this.sower.x - f.x[i]) * (0.12 + 0.7 * prog) + Math.sin(this.t * 0.8 + f.seed[i] * 20) * 0.02;
      f.vx[i] += (tx - f.vx[i]) * Math.min(1, dt * 2);
      f.vy[i] += ((big ? sp * 0.75 : sp) - f.vy[i]) * Math.min(1, dt * 3);
      const [px, py] = this.separation(f, this.gridA, i, r, SEED_R * 1.6);
      f.x[i] += f.vx[i] * dt + px * 0.5;
      f.y[i] += f.vy[i] * dt + py * 0.2;
      f.x[i] = Math.max(0.03 + r, Math.min(0.97 - r, f.x[i]));
      this.pushOutOfStones(f, i, r);
      if (f.y[i] > this.bottom - 0.02) {
        if (!this.done) {
          const before = this.petals;
          this.petalHp -= f.hp[i];
          if (this.petals < before) this.emit('petal', this.sower.x, this.bottom, this.petals);
        }
        f.remove(i);
      }
    }
  }

  /** Where seeds and ash meet, they cancel out hit point for hit point. */
  private clash(): void {
    const o = this.seeds, f = this.ash;
    this.gridA.build(f, this.H);
    const grid = this.gridA;
    for (let i = o.n - 1; i >= 0; i--) {
      const ri = o.big[i] ? SPROUT_R : SEED_R;
      const cx = Math.floor(o.x[i] / CELL), cy = Math.floor(o.y[i] / CELL) + 1;
      search:
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= grid.rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= grid.cols) continue;
          for (let j = grid.head[gy * grid.cols + gx]; j !== -1; j = grid.next[j]) {
            if (f.hp[j] === 0) continue;
            const rr = ri + (f.big[j] ? SEED_R * 1.6 : SEED_R) + 0.002;
            const dx = o.x[i] - f.x[j], dy = o.y[i] - f.y[j];
            if (dx * dx + dy * dy > rr * rr) continue;
            const d = Math.min(o.hp[i], f.hp[j]);
            f.hp[j] -= d;
            // bark: sometimes a seed shrugs the blow off
            if (!(o.big[i] === 0 && this.gifts.bark > 0 && this.rng.chance(this.gifts.bark))) o.hp[i] -= d;
            this.score += d;
            if (this.clashBudget >= 1) { this.clashBudget--; this.emit('clash', (o.x[i] + f.x[j]) / 2, (o.y[i] + f.y[j]) / 2, d); }
            if (o.hp[i] === 0) break search;
          }
        }
      }
      if (o.hp[i] === 0) o.remove(i);
    }
    for (let j = f.n - 1; j >= 0; j--) if (f.hp[j] === 0) f.remove(j);
  }
}
