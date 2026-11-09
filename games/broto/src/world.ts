/**
 * BROTO, the game itself, with no drawing and no DOM. One lane seen from above, 1 unit wide and H
 * tall, y growing DOWN. The Sower (a flower) sits at the bottom and lets out seeds of light; each
 * seed costs sap, and a Sower that runs dry wilts for a moment. Gates on the way add, multiply,
 * absorb or halve the seeds; the Ash pours down. Seeds and ash that meet cancel out, hit point for
 * hit point. When the horde is spent the stage's guardian comes down (see boss.ts): its attacks are
 * hazards announced by a red telegraph, and they make the player move and stop firing.
 *
 * Thousands of units at once, so they live in flat typed arrays and collide through a grid.
 */
import { Rng } from '@arcade/shared';
import { type Boss, type Trial, BOSSES, startBoss, updateBoss, hitBoss, updateTrials, type TrialKind } from './boss';

export const MAX_UNITS = 3500;
export const SEED_R = 0.0085;
export const SPROUT_R = 0.024;
export const CELL = 0.03;
/** damage a petal soaks up before it falls */
export const PETAL_HP = 15;
export const SPROUT_HP = 15;
export const DEW_REFILL = 0.8;
/** sap: what each seed costs, how fast it comes back, how long a dry Sower wilts */
export const SAP_MAX = 100;
export const SAP_REFILL = 35;
export const SAP_DELAY = 0.3;
export const WILT_TIME = 3;
export const BURST = 10;
export const INVULNERABLE = 1;

/**
 * add: Orvalho (lets out n seeds when crossed, then refills) · mul: Raiz/Florada/Vento (×n)
 * sub: Espinho (absorbs n, then is spent) · div: Geada (keeps one in n)
 * well: Olho-d'Água (×n through its central 30%, nothing outside)
 */
export type GateOp = 'add' | 'mul' | 'sub' | 'div' | 'well';
export interface GateDef {
  op: GateOp;
  n: number;
  /** centre x and width (0..1) */
  x: number;
  w: number;
  /** position along the lane: 0 = the top, 1 = the Sower */
  y: number;
  amp?: number;
  speed?: number;
  phase?: number;
  /** wilts after this many seeds */
  uses?: number;
}
export interface StoneDef { x: number; y: number; w: number; h: number }
export interface LevelDef {
  name: string;
  gates: GateDef[];
  stones?: StoneDef[];
  horde: number;
  opening: number;
  rate: number;
  foeSpeed: number;
  embers?: number;
  /** the guardian at the end (index into BOSSES) */
  boss: number;
  /** trials during the horde, in order */
  trials: TrialKind[];
  /** telegraph time of every attack, and damage of a direct hit */
  warn: number;
  hit: number;
  dark?: boolean;
  par: number;
}

export interface Gate extends GateDef { x0: number; cx: number; left: number; flash: number; used: number; hidden: number; cool: number; ttl?: number; gone?: boolean; golden?: boolean; burnt?: number; regrow?: number }
export interface Stone extends StoneDef { vx?: number; ttl?: number }

/**
 * Things that hurt the Sower, always announced first (`warn` seconds of red telegraph):
 * drop: something falls down column x (width w) · band: a strike along the Sower's line, except in
 * the gaps · wall: a band that descends the lane with gaps · dust: a strip of lane (y..y+w) where
 * seeds go out.
 */
export interface Hazard {
  kind: 'drop' | 'band' | 'wall' | 'dust';
  x: number;
  w: number;
  y: number;
  vy: number;
  warn: number;
  life: number;
  dmg: number;
  gaps: number[];
  gapW: number;
  gapV: number;
  /** look: 0 ember, 1 stone, 2 serpent, 3 ice, 4 moth, 5 shock ring, 6 dust, 7 ash rock */
  look: number;
  done?: boolean;
}

export interface Gifts {
  rate: number;
  bark: number;
  pollen: number;
  head: number;
  sproutEvery: number;
  /** extra sap */
  sap: number;
}
export const BASE_GIFTS: Gifts = { rate: 10, bark: 0, pollen: 1, head: 0, sproutEvery: 40, sap: 0 };

export type EventKind = 'fire' | 'sprout' | 'gate' | 'well' | 'clash' | 'hit' | 'shield' | 'petal' | 'struck' | 'win' | 'lose'
  | 'wilt' | 'burst' | 'warn' | 'boss' | 'fury' | 'attack' | 'part' | 'reflect' | 'trial' | 'trialEnd' | 'stage' | 'final';
export interface WorldEvent { kind: EventKind; x: number; y: number; value: number; op?: GateOp; text?: string }

export class Crowd {
  n = 0;
  x = new Float32Array(MAX_UNITS);
  y = new Float32Array(MAX_UNITS);
  vx = new Float32Array(MAX_UNITS);
  vy = new Float32Array(MAX_UNITS);
  hp = new Uint8Array(MAX_UNITS);
  big = new Uint8Array(MAX_UNITS);
  /** seeds: bit per gate crossed · ash: 1 = a projectile that keeps its velocity */
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
}

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
      const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(c.x[i] / CELL)));
      const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(c.y[i] / CELL) + 1));
      const k = cy * this.cols + cx;
      this.next[i] = this.head[k];
      this.head[k] = i;
    }
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
  hazards: Hazard[] = [];
  sower = { x: 0.5, tx: 0.5, firing: false, recoil: 0 };
  /** 'horde' until the horde is spent, then 'boss' */
  phase: 'horde' | 'boss' = 'horde';
  boss: Boss | null = null;
  trial: Trial | null = null;
  trialsDone = 0;
  petalHp: number;
  petalsAtStart: number;
  hordeLeft: number;
  hordeTotal: number;
  charge = 0;
  sap = SAP_MAX;
  wilt = 0;
  burst = 0;
  /** seconds the Sower has been firing without a break */
  holdT = 0;
  inv = 0;
  /** effects that trials and bosses switch on */
  drought = 0;
  winter = 0;
  eclipse = 0;
  heat = 0;
  pull = 0;
  score = 0;
  wellHits = 0;
  made = 0;
  done: 'win' | 'lose' | null = null;
  events: WorldEvent[] = [];
  rng: Rng;
  private shot = 0;
  private spawnAcc = 0;
  private releaseT = 0;
  private wasFiring = false;
  private gridA = new Grid();
  private gridS = new Grid();
  private clashBudget = 0;

  constructor(H: number, level: LevelDef, petals = 3, gifts: Gifts = BASE_GIFTS, seed = Date.now()) {
    this.H = H;
    this.level = level;
    this.gifts = gifts;
    this.rng = new Rng(seed);
    this.petalHp = petals * PETAL_HP;
    this.petalsAtStart = petals;
    this.sap = SAP_MAX + gifts.sap;
    this.gates = level.gates.map((g) => this.makeGate(g, !!level.dark));
    this.stones = (level.stones ?? []).map((s) => ({ ...s }));
    const open = Math.min(level.horde, level.opening);
    this.hordeTotal = level.horde;
    this.hordeLeft = level.horde - open;
    for (let i = 0; i < open; i++) this.spawnAsh(this.top + 0.03 + this.rng.range(0, this.laneLen * 0.14));
    for (let i = 0; i < gifts.head; i++) this.seeds.add(this.rng.range(0.25, 0.75), this.bottom - 0.05 - this.rng.range(0, 0.25), 0, -0.36, 1, 0, 0, this.rng.next());
  }

  makeGate(g: GateDef, hidden = false): Gate {
    const cx = g.amp ? Math.max(g.w / 2, Math.min(1 - g.w / 2, g.x + Math.sin(g.phase ?? 0) * g.amp)) : g.x;
    return { ...g, x0: g.x, cx, left: g.op === 'sub' ? g.n : 0, flash: 0, used: 0, hidden: hidden ? 1 : 0, cool: 0 };
  }

  get top(): number { return 0.2; }
  get bottom(): number { return this.H - 0.12; }
  /** where the Sower stands */
  get sowerY(): number { return this.bottom + 0.045; }
  get laneLen(): number { return this.bottom - this.top; }
  laneY(f: number): number { return this.top + f * this.laneLen; }
  get petals(): number { return Math.ceil(this.petalHp / PETAL_HP); }
  get maxSap(): number { return SAP_MAX + this.gifts.sap; }
  /** share of the horde still to deal with */
  get hordeShare(): number { return this.hordeTotal ? (this.hordeLeft + this.ash.n) / this.hordeTotal : 0; }
  get sproutReady(): boolean { return this.charge >= this.gifts.sproutEvery; }
  /** kept for the HUD: the guardian's health */
  get heartHp(): number { return this.boss ? this.boss.hp : 1; }
  get heartMax(): number { return this.boss ? this.boss.max : 1; }

  resize(H: number): void { this.H = H; }

  aim(x: number): void { this.sower.tx = Math.max(0.08, Math.min(0.92, x)); }
  nudge(dx: number): void { this.aim(this.sower.tx + dx); }

  sprout(): boolean {
    if (this.done || !this.sproutReady) return false;
    this.charge = 0;
    this.seeds.add(this.sower.x, this.bottom - 0.04, 0, -0.2, SPROUT_HP, 1, 0xffffffff, this.rng.next());
    this.emit('sprout', this.sower.x, this.bottom, 0);
    return true;
  }

  emit(kind: EventKind, x: number, y: number, value: number, op?: GateOp, text?: string): void {
    this.events.push({ kind, x, y, value, op, text });
  }

  spawnAsh(y: number, x = this.rng.range(0.08, 0.92), ember = this.rng.chance(this.level.embers ?? 0)): void {
    this.ash.add(x, y, 0, 0, ember ? 3 : 1, ember ? 1 : 0, 0, this.rng.next());
  }

  /** A projectile of ash or ember: keeps its velocity. */
  shootAsh(x: number, y: number, vx: number, vy: number, ember = true): void {
    this.ash.add(x, y, vx, vy, ember ? 3 : 1, ember ? 1 : 0, 1, this.rng.next());
  }

  /** Damage to the Sower (petals), with a moment of grace after each blow. */
  hurt(dmg: number, x = this.sower.x): void {
    if (this.done || this.inv > 0 || dmg <= 0) return;
    const before = this.petals;
    this.petalHp -= dmg;
    this.inv = INVULNERABLE;
    this.emit('struck', x, this.sowerY, dmg);
    if (this.petals < before) this.emit('petal', this.sower.x, this.bottom, Math.max(0, this.petals));
  }

  update(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 60) - 1e-6));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
  }

  private step(dt: number): void {
    this.t += dt;
    const S = this.sower;
    // a pull (the whirlpool) drags the Sower to the middle against the finger
    if (this.pull > 0) S.x += Math.sign(0.5 - S.x) * Math.min(Math.abs(0.5 - S.x), this.pull * dt);
    S.x += (S.tx - S.x) * (1 - Math.exp(-dt * (this.pull > 0 ? 5 : 18)));
    S.recoil = Math.max(0, S.recoil - dt * 6);
    this.inv = Math.max(0, this.inv - dt);
    this.drought = Math.max(0, this.drought - dt);
    this.winter = Math.max(0, this.winter - dt);
    this.eclipse = Math.max(0, this.eclipse - dt);
    this.heat = Math.max(0, this.heat - dt);
    this.clashBudget = Math.min(40, this.clashBudget + dt * 90);
    const lv = this.level;

    if (!this.done) {
      this.fire(dt);
      if (this.phase === 'horde') {
        if (this.hordeLeft > 0) {
          this.spawnAcc += dt * lv.rate;
          while (this.spawnAcc >= 1 && this.hordeLeft > 0) { this.spawnAcc -= 1; this.hordeLeft--; this.spawnAsh(this.top + this.rng.range(0, 0.04)); }
        }
        updateTrials(this, dt);
        if (this.hordeLeft <= 0 && this.ash.n === 0 && !this.trial) {
          this.phase = 'boss';
          this.boss = startBoss(this, BOSSES[lv.boss]);
          this.emit('boss', 0.5, this.top, lv.boss, undefined, this.boss.def.name);
        }
      } else if (this.boss) updateBoss(this, this.boss, dt);
    }

    for (const g of this.gates) {
      if (g.amp) g.cx = Math.max(g.w / 2, Math.min(1 - g.w / 2, g.x0 + Math.sin(this.t * (g.speed ?? 1) + (g.phase ?? 0)) * g.amp));
      g.flash = Math.max(0, g.flash - dt * 4);
      g.cool = Math.max(0, g.cool - dt);
      if (g.ttl !== undefined && !g.gone) { g.ttl -= dt; if (g.ttl <= 0) g.gone = true; }
      // a burnt gate grows back
      if (g.regrow !== undefined && g.gone) { g.regrow -= dt; if (g.regrow <= 0) { g.gone = false; g.burnt = 0; g.regrow = undefined; } }
    }
    for (const s of this.stones) {
      if (s.vx) { s.x += s.vx * dt; if (s.x < 0.1 || s.x > 0.9) s.vx = -s.vx; }
      if (s.ttl !== undefined) s.ttl -= dt;
    }
    this.stones = this.stones.filter((s) => s.ttl === undefined || s.ttl > 0);

    this.moveSeeds(dt);
    this.moveAsh(dt);
    this.clash();
    this.stepHazards(dt);

    if (this.done) return;
    if (this.boss && this.boss.hp <= 0) {
      this.done = 'win';
      this.hazards = [];
      for (let i = 0; i < this.ash.n; i++) this.ash.hp[i] = 0;
      this.emit('win', this.boss.x, this.boss.y, this.score);
    } else if (this.petalHp <= 0) {
      this.petalHp = 0;
      this.done = 'lose';
      this.emit('lose', S.x, this.bottom, this.score);
    }
  }

  /** Sap: every seed costs one; letting go refills it; running dry wilts the Sower. */
  private fire(dt: number): void {
    const S = this.sower;
    if (this.wilt > 0) {
      this.wilt -= dt;
      if (this.wilt <= 0) this.sap = 30;
      this.holdT = 0;
      this.wasFiring = false;
      return;
    }
    const firing = S.firing;
    if (firing && !this.wasFiring && this.sap >= this.maxSap - 0.5) { this.burst = BURST; this.emit('burst', S.x, this.bottom, 0); }
    this.wasFiring = firing;
    if (!firing) {
      this.holdT = 0;
      this.releaseT += dt;
      if (this.releaseT >= SAP_DELAY) this.sap = Math.min(this.maxSap, this.sap + dt * SAP_REFILL * (this.drought > 0 ? 0.5 : 1));
      this.shot = Math.min(this.shot, 0.99);
      return;
    }
    this.releaseT = 0;
    this.holdT += dt;
    this.shot += dt * this.gifts.rate;
    while (this.shot >= 1) {
      this.shot -= 1;
      if (this.sap < 1) break;
      this.sap -= 1;
      if (this.charge < this.gifts.sproutEvery) this.charge++;
      S.recoil = 1;
      const strong = this.burst > 0;
      if (strong) this.burst--;
      this.seeds.add(S.x + this.rng.range(-0.006, 0.006), this.bottom - 0.03, this.rng.range(-0.02, 0.02), strong ? -1.4 : -0.7, strong ? 2 : 1, 0, 0, this.rng.next());
      this.emit('fire', S.x, this.bottom, strong ? 2 : 1);
    }
    if (this.sap < 1) { this.sap = 0; this.wilt = WILT_TIME; this.emit('wilt', S.x, this.bottom, 0); }
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
    for (let i = o.n - 1; i >= 0; i--) {
      const big = o.big[i] === 1;
      const r = big ? SPROUT_R : SEED_R;
      const cruise = big ? -0.3 : o.hp[i] >= 2 && o.big[i] === 0 ? -0.75 : -0.5;
      o.vy[i] += (cruise - o.vy[i]) * Math.min(1, dt * 3);
      o.vx[i] *= 1 - Math.min(1, dt * 3);
      const [px, py] = this.separation(o, this.gridS, i, r, SPROUT_R);
      const prevY = o.y[i];
      o.x[i] += o.vx[i] * dt + px * (big ? 0.1 : 0.5);
      o.y[i] += o.vy[i] * dt + py * 0.3;
      if (o.x[i] < 0.03 + r) { o.x[i] = 0.03 + r; o.vx[i] = Math.abs(o.vx[i]); }
      if (o.x[i] > 0.97 - r) { o.x[i] = 0.97 - r; o.vx[i] = -Math.abs(o.vx[i]); }
      this.pushOutOfStones(o, i, r);

      let gone = false;
      for (let g = 0; g < this.gates.length && g < 32 && !gone; g++) {
        const G = this.gates[g], bit = 1 << g;
        if (G.gone || (o.seen[i] & bit)) continue;
        const gy = this.laneY(G.y);
        if (G.hidden > 0 && o.y[i] - gy < this.H * 0.4) G.hidden = 0;
        if (prevY > gy && o.y[i] <= gy && Math.abs(o.x[i] - G.cx) < G.w / 2) {
          o.seen[i] |= bit;
          gone = this.applyGate(G, i);
        }
      }
      if (gone || i >= o.n) continue;
      // trials' targets (cocoons) take seeds on the way
      if (this.trial && this.trial.hitSeed(this, o.x[i], o.y[i], o.hp[i])) { o.remove(i); continue; }
      if (o.y[i] < this.top + 0.01) {
        if (this.phase === 'boss' && this.boss && !this.done) hitBoss(this, this.boss, o.x[i], o.hp[i], o.big[i] === 1);
        else this.emit('shield', o.x[i], this.top, 0);
        o.remove(i);
      }
    }
  }

  private applyGate(G: Gate, i: number): boolean {
    const o = this.seeds;
    if (G.uses !== undefined && G.used >= G.uses) return false;
    G.used++;
    G.flash = 1;
    // the firebird's breath burns the gates the seeds cross
    if (this.heat > 0) {
      G.burnt = (G.burnt ?? 0) + 1;
      if (G.burnt >= 15) { G.gone = true; G.regrow = 8; this.emit('attack', G.cx, this.laneY(G.y), 22); }
    }
    const copy = (n: number) => {
      for (let k = 0; k < n; k++) {
        const a = this.rng.range(-1, 1);
        if (o.add(o.x[i] + a * G.w * 0.22, o.y[i] - this.rng.range(0, 0.025), a * 0.45, o.vy[i], o.hp[i], o.big[i], o.seen[i], this.rng.next()) < 0) break;
        this.made++;
      }
    };
    // winter turns the doubling gates into halving ones
    const op: GateOp = this.winter > 0 && G.op === 'mul' ? 'div' : G.op;
    switch (op) {
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
        G.left = (G.left + 1) % 2;
        if (G.left !== 0) { this.emit('gate', o.x[i], o.y[i], 2, 'div'); o.remove(i); return true; }
        return false;
    }
  }

  pushOutOfStones(c: Crowd, i: number, r: number): void {
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
      if (f.seen[i] === 1) {
        // a projectile: straight on
        f.x[i] += f.vx[i] * dt;
        f.y[i] += f.vy[i] * dt;
        if (f.x[i] < 0.03 || f.x[i] > 0.97) f.vx[i] = -f.vx[i];
      } else {
        // drifts down; only near the bottom does it go for the Sower
        const prog = Math.max(0, Math.min(1, (f.y[i] - this.top) / this.laneLen));
        const chase = prog > 0.65 ? (prog - 0.65) * 2.5 : 0;
        const tx = (this.sower.x - f.x[i]) * chase + Math.sin(this.t * 0.8 + f.seed[i] * 20) * 0.03;
        f.vx[i] += (tx - f.vx[i]) * Math.min(1, dt * 2);
        f.vy[i] += ((big ? sp * 0.75 : sp) - f.vy[i]) * Math.min(1, dt * 3);
        const [px, py] = this.separation(f, this.gridA, i, r, SEED_R * 1.6);
        f.x[i] += f.vx[i] * dt + px * 0.5;
        f.y[i] += f.vy[i] * dt + py * 0.2;
        f.x[i] = Math.max(0.03 + r, Math.min(0.97 - r, f.x[i]));
        this.pushOutOfStones(f, i, r);
      }
      if (this.trial && this.trial.hitAsh(this, f.x[i], f.y[i], f.hp[i], f.seen[i] === 1)) { f.remove(i); continue; }
      if (f.y[i] > this.bottom - 0.02) {
        // what reaches the bottom hits the Sower if it is close, the petals' roots otherwise
        if (!this.done) {
          const before = this.petals;
          this.petalHp -= f.hp[i];
          if (this.petals < before) this.emit('petal', this.sower.x, this.bottom, Math.max(0, this.petals));
        }
        f.remove(i);
      } else if (f.y[i] < -0.2) f.remove(i);
    }
  }

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

  /** Moving gaps slide and bounce off the sides (never jump across). */
  static slideGaps(h: Hazard, dt: number): void {
    if (!h.gapV) return;
    h.gaps = h.gaps.map((g) => g + h.gapV * dt);
    if (h.gaps.some((g) => g < 0.14 || g > 0.86)) { h.gapV = -h.gapV; h.gaps = h.gaps.map((g) => Math.max(0.14, Math.min(0.86, g))); }
  }

  /** Is x inside one of the gaps of a band? */
  static inGap(h: Hazard, x: number): boolean {
    return h.gaps.some((g) => Math.abs(x - g) < h.gapW / 2);
  }

  private stepHazards(dt: number): void {
    const S = this.sower, sy = this.sowerY;
    for (const h of this.hazards) {
      if (h.warn > 0) {
        h.warn -= dt;
        World.slideGaps(h, dt);
        if (h.warn <= 0) this.emit('attack', h.x, h.y, h.look);
        continue;
      }
      World.slideGaps(h, dt);
      if (h.kind === 'drop') {
        h.y += h.vy * dt;
        // stones and the serpent put out the seeds in their way
        if (h.look === 1 || h.look === 2) this.clearSeeds((x, y) => Math.abs(x - h.x) < h.w / 2 && Math.abs(y - h.y) < 0.05);
        if (Math.abs(h.y - sy) < 0.05 && Math.abs(S.x - h.x) < h.w / 2 + 0.03) this.hurt(h.dmg, h.x);
        if (h.y > this.H + 0.2) h.done = true;
      } else if (h.kind === 'band') {
        if (!World.inGap(h, S.x)) this.hurt(h.dmg, S.x);
        h.life -= dt;
        if (h.life <= 0) h.done = true;
      } else if (h.kind === 'wall') {
        const prev = h.y;
        h.y += h.vy * dt;
        this.clearSeeds((x, y) => Math.abs(y - h.y) < 0.03 && !World.inGap(h, x));
        if (prev < sy && h.y >= sy && !World.inGap(h, S.x)) this.hurt(h.dmg, S.x);
        if (h.y > this.H + 0.1) h.done = true;
      } else {
        this.clearSeeds((x, y) => y > h.y && y < h.y + h.w && Math.abs(x - h.x) < h.gapW / 2);
        h.life -= dt;
        if (h.life <= 0) h.done = true;
      }
    }
    this.hazards = this.hazards.filter((h) => !h.done);
  }

  private clearSeeds(test: (x: number, y: number) => boolean): void {
    const o = this.seeds;
    for (let i = o.n - 1; i >= 0; i--) if (o.big[i] === 0 && test(o.x[i], o.y[i])) o.remove(i);
  }

  /** Telegraphed hazards (boss.ts builds them through these). */
  drop(x: number, w: number, dmg: number, look: number, warn = this.level.warn, vy = 2.2, y = this.top): Hazard {
    const h: Hazard = { kind: 'drop', x, w, y, vy, warn, life: 0, dmg, gaps: [], gapW: 0, gapV: 0, look };
    this.hazards.push(h);
    this.emit('warn', x, y, look);
    return h;
  }

  band(gaps: number[], gapW: number, dmg: number, look: number, warn = this.level.warn, life = 0.35, gapV = 0): Hazard {
    const h: Hazard = { kind: 'band', x: 0.5, w: 1, y: this.sowerY, vy: 0, warn, life, dmg, gaps, gapW, gapV, look };
    this.hazards.push(h);
    this.emit('warn', 0.5, this.sowerY, look);
    return h;
  }

  wall(gaps: number[], gapW: number, dmg: number, look: number, vy = 0.5, warn = this.level.warn): Hazard {
    const h: Hazard = { kind: 'wall', x: 0.5, w: 1, y: this.top, vy, warn, life: 0, dmg, gaps, gapW, gapV: 0, look };
    this.hazards.push(h);
    this.emit('warn', 0.5, this.top, look);
    return h;
  }

  dust(y: number, h: number, life: number, warn = this.level.warn, x = 0.5, width = 1): Hazard {
    const z: Hazard = { kind: 'dust', x, w: h, y, vy: 0, warn, life, dmg: 0, gaps: [], gapW: width, gapV: 0, look: 6 };
    this.hazards.push(z);
    this.emit('warn', x, y, 6);
    return z;
  }
}
