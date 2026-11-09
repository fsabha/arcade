/**
 * RIBOMBA, the game itself, with no drawing and no DOM (design: Lúcio). A sand lane seen from
 * above, 1 unit wide and H tall, y growing DOWN. The Bocão (our toy cannon) rolls along the bottom
 * and fires blue toy soldiers up the lane. Just in front of it stand rows of blocks: gates (×n, +n)
 * that multiply whoever walks through, and numbered crates that eat soldiers until they break and
 * hand the cannon an upgrade. From the canyon at the top the red army pours down like a river whose
 * mouth keeps moving from bank to bank. Blue and red cancel one for one; a red that reaches the
 * cannon's line costs a life. When the river runs dry, the stage's captain comes down (boss.ts).
 *
 * Thousands of units at once, so they live in flat typed arrays and collide through a grid.
 */
import { Rng } from '@arcade/shared';
import { type Boss, BOSSES, startBoss, updateBoss, hitBoss } from './boss';

export const MAX_UNITS = 3500;
export const UNIT_R = 0.0085;
export const CELL = 0.03;
export const INVULNERABLE = 1.6;
/** what a breach sweeps away above the cannon */
export const BREACH_CLEAR = 0.4;
/** soldiers per second from one barrel */
export const BASE_RATE = 7;
export const ADD_COOL = 0.6;
export const BOX_H = 0.05;
export const ROWS = [0.74, 0.5];
export const SLOTS = [0.185, 0.5, 0.815];
export const SLOT_W = 0.29;
export const DOZE_TIME = 12;

export type Upgrade = 'duplo' | 'cadencia' | 'leque' | 'chumbo' | 'mola' | 'doze';
export const UPGRADES: Record<Upgrade, { name: string; text: string }> = {
  duplo: { name: 'CANO DUPLO', text: '+1 cano' },
  cadencia: { name: 'CADÊNCIA', text: '+40% de tiro' },
  leque: { name: 'LEQUE', text: 'canos em leque' },
  chumbo: { name: 'SOLDADO DE CHUMBO', text: 'cada azul aguenta 2' },
  mola: { name: 'MOLA', text: 'soldados mais rápidos' },
  doze: { name: 'DOZE CANOS', text: 'rajada por 12 s' },
};

/** mul: ×n to everyone who walks through · add: lets out n more (then a short cooldown) · box: eats soldiers */
export type BlockKind = 'mul' | 'add' | 'box';
export interface Block {
  kind: BlockKind;
  n: number;
  /** what is left of a crate */
  left: number;
  up?: Upgrade;
  x0: number;
  cx: number;
  w: number;
  /** position along the lane: 0 = the top, 1 = the cannon */
  y: number;
  amp: number;
  speed: number;
  phase: number;
  flash: number;
  cool: number;
  gone: boolean;
  golden?: boolean;
  giant?: boolean;
  ttl?: number;
  /** slides in when a new row arrives (0..1) */
  enter: number;
}

export type TrialKind = 'golden' | 'rapids' | 'avalanche' | 'bridge' | 'ambush' | 'giant' | 'fog' | 'twin';
export const TRIAL_NAMES: Record<TrialKind, [string, string]> = {
  golden: ['CAIXA DOURADA', 'quebre em 6 s: cano duplo grátis'],
  rapids: ['CORREDEIRA', 'o rio acelera!'],
  avalanche: ['AVALANCHE', 'pedras rolando: saia da sombra'],
  bridge: ['A PONTE', 'o rio passa por uma ponte que anda'],
  ambush: ['EMBOSCADA', 'um segundo rio pelo outro lado'],
  giant: ['CAIXA GIGANTE', 'quebre: DOZE CANOS · ou vira exército'],
  fog: ['NEBLINA', 'os portões somem na névoa'],
  twin: ['DUAS CORREDEIRAS', 'dois rios ao mesmo tempo'],
};
export interface Trial { kind: TrialKind; t: number; dur: number; at: number; box?: Block; ok?: boolean }

export interface LevelDef {
  name: string;
  /** reds in the river, how many per second, how fast they walk, how wide the river is */
  river: number;
  rate: number;
  foeSpeed: number;
  riverW: number;
  /** seconds between the river's changes of bank */
  shift: [number, number];
  /** multiplier gates, from the first wave to the last */
  muls: [number, number];
  adds: [number, number];
  /** crates, smallest to largest */
  box: [number, number];
  /** chance the middle block is a crate with nothing inside */
  trap: number;
  slide: boolean;
  /** the captain at the end (index into BOSSES), its warning time and how hard it hits */
  boss: number;
  warn: number;
  trials: TrialKind[];
  /** background: 0 sand, 1 red rock, 2 pebbles, 3 tower, 4 wind, 5 fog, 6 gorge, 7 throne */
  look: number;
  par: number;
}

export interface Hazard {
  /** drop: falls down column x · band: strikes the cannon's line except the gaps · wall: a band that
   * descends with gaps · beam: a column x..w lit at once */
  kind: 'drop' | 'band' | 'wall' | 'beam';
  x: number;
  w: number;
  y: number;
  vy: number;
  warn: number;
  life: number;
  gaps: number[];
  gapW: number;
  gapV: number;
  /** 0 drumstick, 1 rock, 2 note, 3 block, 4 bomb, 5 shell, 6 lance, 7 sceptre, 8 top */
  look: number;
  done?: boolean;
}

export interface Gifts {
  /** fire rate multiplier */
  rate: number;
  lives: number;
  /** crate counts multiplier */
  boxes: number;
  /** the first ×n gate of a stage counts double */
  firstDouble: boolean;
  /** extra warning on attacks */
  warn: number;
  /** river speed multiplier */
  river: number;
  /** weak point damage multiplier */
  weak: number;
}
export const BASE_GIFTS: Gifts = { rate: 1, lives: 3, boxes: 1, firstDouble: false, warn: 0, river: 1, weak: 3 };

/** the cannon's kit, carried through the run */
export interface Kit { barrels: number; cadence: number; fan: boolean; lead: boolean; spring: boolean }
export const BASE_KIT: Kit = { barrels: 1, cadence: 0, fan: false, lead: false, spring: false };

export type EventKind = 'fire' | 'gate' | 'box' | 'break' | 'clash' | 'hit' | 'weak' | 'armor' | 'miss' | 'breach' | 'struck' | 'win' | 'lose'
  | 'warn' | 'attack' | 'boss' | 'fury' | 'half' | 'trial' | 'trialEnd' | 'wave' | 'shift' | 'summon';
export interface WorldEvent { kind: EventKind; x: number; y: number; value: number; text?: string }

export class Crowd {
  n = 0;
  x = new Float32Array(MAX_UNITS);
  y = new Float32Array(MAX_UNITS);
  vx = new Float32Array(MAX_UNITS);
  vy = new Float32Array(MAX_UNITS);
  hp = new Uint8Array(MAX_UNITS);
  /** blue: bit per block crossed */
  seen = new Uint32Array(MAX_UNITS);
  seed = new Float32Array(MAX_UNITS);

  add(x: number, y: number, vx: number, vy: number, hp: number, seen: number, seed: number): number {
    if (this.n >= MAX_UNITS) return -1;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.hp[i] = hp; this.seen[i] = seen; this.seed[i] = seed;
    return i;
  }

  remove(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
    this.hp[i] = this.hp[j]; this.seen[i] = this.seen[j]; this.seed[i] = this.seed[j];
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
  kit: Kit;
  blue = new Crowd();
  red = new Crowd();
  blocks: Block[] = [];
  hazards: Hazard[] = [];
  cannon = { x: 0.5, tx: 0.5, recoil: 0, still: 0 };
  phase: 'river' | 'boss' = 'river';
  boss: Boss | null = null;
  trial: Trial | null = null;
  trialsDone = 0;
  lives: number;
  livesAtStart: number;
  inv = 0;
  riverLeft: number;
  riverTotal: number;
  /** the river's mouth (x), where it is heading, and when it next moves */
  mouth = 0.5;
  mouthTo = 0.5;
  private shiftT = 0;
  /** a second river (ambush, twin) and the narrow bridge */
  mouth2 = -1;
  bridge = 0;
  rapids = 0;
  fog = 0;
  doze = 0;
  wave = 0;
  firstDoubleUsed = false;
  score = 0;
  killed = 0;
  made = 0;
  done: 'win' | 'lose' | null = null;
  events: WorldEvent[] = [];
  rng: Rng;
  private shot = 0;
  private spawnAcc = 0;
  private extraAcc = 0;
  private side = 1;
  private gridR = new Grid();
  private gridB = new Grid();
  private clashBudget = 0;

  constructor(H: number, level: LevelDef, lives = 3, gifts: Gifts = BASE_GIFTS, kit: Kit = BASE_KIT, seed = Date.now()) {
    this.H = H;
    this.level = level;
    this.gifts = gifts;
    this.kit = { ...kit };
    this.rng = new Rng(seed);
    this.lives = lives;
    this.livesAtStart = lives;
    this.riverTotal = level.river;
    this.riverLeft = level.river;
    this.side = this.rng.chance(0.5) ? 1 : -1;
    this.mouth = this.mouthTo = 0.5 + this.side * 0.27;
    this.shiftT = this.rng.range(level.shift[0], level.shift[1]);
    this.buildRows(false);
  }

  get top(): number { return 0.34; }
  get bottom(): number { return this.H - 0.13; }
  /** where the cannon stands */
  get cannonY(): number { return this.bottom + 0.05; }
  get laneLen(): number { return this.bottom - this.top; }
  laneY(f: number): number { return this.top + f * this.laneLen; }
  get riverShare(): number { return this.riverTotal ? (this.riverLeft + this.red.n) / this.riverTotal : 0; }
  get warn(): number { return this.level.warn + this.gifts.warn; }

  resize(H: number): void { this.H = H; }

  aim(x: number): void { this.cannon.tx = Math.max(0.07, Math.min(0.93, x)); }
  nudge(dx: number): void { this.aim(this.cannon.tx + dx); }

  emit(kind: EventKind, x: number, y: number, value: number, text?: string): void {
    this.events.push({ kind, x, y, value, text });
  }

  // ---------- the rows of blocks ----------

  makeBlock(kind: BlockKind, n: number, x: number, w: number, y: number, up?: Upgrade): Block {
    const left = kind === 'box' ? Math.max(1, Math.round(n * this.gifts.boxes)) : 0;
    return { kind, n: kind === 'box' ? left : n, left, up, x0: x, cx: x, w, y, amp: 0, speed: 0, phase: 0, flash: 0, cool: 0, gone: false, enter: 1 };
  }

  /** A row: the middle is always the worst, the best sits on a side that alternates. */
  private row(y: number, k: number): Block[] {
    const lv = this.level, r = this.rng;
    const wv = Math.min(2, this.wave) / 2;
    const mulHi = Math.round(lv.muls[0] + (lv.muls[1] - lv.muls[0]) * wv);
    const mulLo = Math.max(2, Math.round(mulHi * 0.5));
    const add = Math.round(lv.adds[0] + (lv.adds[1] - lv.adds[0]) * wv);
    const boxSize = (big: number) => Math.round(lv.box[0] + (lv.box[1] - lv.box[0]) * Math.min(1, big * 0.6 + wv * 0.4));
    const pickUp = (small: boolean): Upgrade => {
      const pool: Upgrade[] = small ? ['duplo', 'cadencia', 'cadencia', 'duplo'] : ['leque', 'chumbo', 'mola', 'duplo'];
      const ok = pool.filter((u) => !(u === 'leque' && this.kit.fan) && !(u === 'chumbo' && this.kit.lead) && !(u === 'mola' && this.kit.spring) && !(u === 'duplo' && this.kit.barrels >= 4) && !(u === 'cadencia' && this.kit.cadence >= 3));
      return ok.length ? r.pick(ok) : 'cadencia';
    };
    this.side = -this.side;
    const good = this.side > 0 ? 2 : 0, other = 2 - good;
    const out: Block[] = [];
    // the good side: the big multiplier, or a crate worth breaking
    if (k === 0 || r.chance(0.55)) out.push(this.makeBlock('mul', mulHi, SLOTS[good], SLOT_W, y));
    else { const small = r.chance(0.5); out.push(this.makeBlock('box', boxSize(small ? 0 : 0.6), SLOTS[good], SLOT_W, y, pickUp(small))); }
    // the other side: something decent
    if (out[0].kind === 'box' || r.chance(0.45)) { const m = r.chance(0.5); out.push(this.makeBlock(m ? 'mul' : 'add', m ? mulLo : add, SLOTS[other], SLOT_W, y)); }
    else { const small = r.chance(0.6); out.push(this.makeBlock('box', boxSize(small ? 0 : 0.6), SLOTS[other], SLOT_W, y, pickUp(small))); }
    // the middle: a trap (a crate with nothing in it) or a small add
    if (r.chance(lv.trap)) out.push(this.makeBlock('box', Math.round(boxSize(1) * 1.4), SLOTS[1], SLOT_W, y));
    else out.push(this.makeBlock('add', Math.max(2, Math.round(add * 0.3)), SLOTS[1], SLOT_W, y));
    // sliding gates from the third stage
    if (lv.slide) for (const b of out) if (b.kind === 'mul' && b.n === mulHi) { b.amp = 0.12; b.speed = 2.1; b.phase = r.range(0, 6.28); }
    if (this.gifts.firstDouble && !this.firstDoubleUsed) {
      const m = out.find((b) => b.kind === 'mul');
      if (m) { m.n *= 2; this.firstDoubleUsed = true; }
    }
    return out;
  }

  /** New rows roll in (at the start and at each third of the river). */
  buildRows(animate = true): void {
    const keep = this.blocks.filter((b) => b.golden || b.giant);
    this.blocks = [...ROWS.flatMap((y, k) => this.row(y, k)), ...keep];
    if (animate) for (const b of this.blocks) if (!b.golden && !b.giant) b.enter = 0;
    // nobody has crossed the new blocks yet
    for (let i = 0; i < this.blue.n; i++) this.blue.seen[i] = 0;
  }

  // ---------- the river ----------

  private spawnRed(mouth: number, width: number): void {
    const x = Math.max(0.05, Math.min(0.95, mouth + this.rng.range(-width / 2, width / 2)));
    this.red.add(x, this.top - this.rng.range(0, 0.05), 0, 0, 1, 0, this.rng.next());
  }

  /** Reds summoned by a captain or a failed giant crate. */
  summon(n: number, x: number, y = this.top, spread = 0.2): void {
    for (let i = 0; i < n; i++) this.red.add(Math.max(0.05, Math.min(0.95, x + this.rng.range(-spread / 2, spread / 2))), y - this.rng.range(0, 0.08), 0, 0, 1, 0, this.rng.next());
    this.emit('summon', x, y, n);
  }

  private river(dt: number): void {
    const lv = this.level;
    // the mouth changes bank every few seconds; sometimes it crosses the middle
    this.shiftT -= dt;
    if (this.shiftT <= 0) {
      this.shiftT = this.rng.range(lv.shift[0], lv.shift[1]) * (this.bridge > 0 ? 0.35 : 1);
      const from = this.mouthTo;
      this.mouthTo = this.rng.chance(0.2) ? 0.5 : from < 0.5 ? this.rng.range(0.66, 0.82) : this.rng.range(0.18, 0.34);
      if (this.bridge > 0) this.mouthTo = this.rng.range(0.15, 0.85);
      this.emit('shift', this.mouthTo, this.top, 0);
    }
    this.mouth += (this.mouthTo - this.mouth) * Math.min(1, dt * (this.bridge > 0 ? 2.5 : 1.1));
    if (this.riverLeft <= 0) return;
    const width = this.bridge > 0 ? 0.1 : lv.riverW;
    this.spawnAcc += dt * lv.rate * (this.rapids > 0 ? 1.8 : 1);
    while (this.spawnAcc >= 1 && this.riverLeft > 0) {
      this.spawnAcc -= 1;
      this.riverLeft--;
      this.spawnRed(this.mouth, width);
    }
    if (this.mouth2 >= 0) {
      this.extraAcc += dt * lv.rate * 0.6;
      while (this.extraAcc >= 1) { this.extraAcc -= 1; this.spawnRed(this.mouth2, lv.riverW * 0.8); }
    }
    // a new row of blocks at each third
    const w = Math.min(2, Math.floor(((this.riverTotal - this.riverLeft) / this.riverTotal) * 3));
    if (w > this.wave) { this.wave = w; this.buildRows(); this.emit('wave', 0.5, this.laneY(ROWS[1]), w); }
  }

  // ---------- trials ----------

  private trials(dt: number): void {
    const lv = this.level;
    const done = (this.riverTotal - this.riverLeft) / this.riverTotal;
    if (!this.trial && this.trialsDone < lv.trials.length) {
      const at = lv.trials.length === 1 ? 0.45 : this.trialsDone === 0 ? 0.3 : 0.65;
      if (done >= at) this.startTrial(lv.trials[this.trialsDone]);
    }
    const tr = this.trial;
    if (!tr) return;
    tr.t += dt;
    if (tr.kind === 'avalanche') {
      // a rock every 1.3 s, where the cannon is or close to it
      tr.at -= dt;
      if (tr.at <= 0 && tr.t < tr.dur - 1) {
        tr.at = 1.3;
        const x = Math.max(0.1, Math.min(0.9, this.cannon.x + this.rng.range(-0.08, 0.08)));
        this.drop(x, 0.14, 1, 0.9, 1.6);
      }
    }
    if ((tr.kind === 'golden' || tr.kind === 'giant') && tr.box) {
      const b = tr.box;
      if (b.gone && b.left <= 0) { tr.ok = true; this.endTrial(); return; }
      if (b.kind === 'box' && tr.t >= tr.dur) {
        b.gone = true;
        tr.ok = false;
        if (tr.kind === 'giant') this.summon(40, b.cx, this.laneY(b.y), 0.4);
        this.endTrial();
        return;
      }
    }
    if (tr.t >= tr.dur) { tr.ok = true; this.endTrial(); }
  }

  startTrial(kind: TrialKind): void {
    const tr: Trial = { kind, t: 0, dur: 8, at: 0.5 };
    if (kind === 'golden') {
      tr.dur = 6;
      const b = this.makeBlock('box', 15 + this.level.boss * 6, 0.5, 0.2, 0.3, 'duplo');
      b.golden = true; b.amp = 0.3; b.speed = 1.4;
      this.blocks.push(b);
      tr.box = b;
    } else if (kind === 'giant') {
      tr.dur = 12;
      const b = this.makeBlock('box', this.level.boss < 6 ? 300 : 500, 0.5, 0.6, 0.3, 'doze');
      b.giant = true;
      this.blocks.push(b);
      tr.box = b;
    } else if (kind === 'rapids') { tr.dur = 6; this.rapids = 6; }
    else if (kind === 'bridge') { tr.dur = 7; this.bridge = 7; this.shiftT = 0; }
    else if (kind === 'ambush') { tr.dur = 8; this.mouth2 = this.mouth < 0.5 ? 0.85 : 0.15; }
    else if (kind === 'twin') { tr.dur = 8; this.mouthTo = 0.2; this.mouth2 = 0.8; }
    else if (kind === 'fog') { tr.dur = 9; this.fog = 9; }
    else if (kind === 'avalanche') tr.dur = 8;
    this.trial = tr;
    this.emit('trial', 0.5, this.laneY(0.3), 0, kind);
  }

  private endTrial(): void {
    const tr = this.trial!;
    this.trial = null;
    this.trialsDone++;
    if (tr.kind === 'ambush' || tr.kind === 'twin') this.mouth2 = -1;
    if (tr.box && !tr.box.gone) tr.box.gone = true;
    this.blocks = this.blocks.filter((b) => !(b.gone && (b.golden || b.giant)));
    this.emit('trialEnd', 0.5, this.laneY(0.3), tr.ok ? 1 : 0, tr.kind);
  }

  // ---------- harm ----------

  /** A blow on the cannon (a captain's attack, a rock, a breach): one life, then a moment of grace. */
  hurt(x = this.cannon.x, cause = 0): boolean {
    if (this.done || this.inv > 0) return false;
    this.lives--;
    this.inv = INVULNERABLE;
    this.emit('struck', x, this.cannonY, this.lives, cause ? 'breach' : 'blow');
    return true;
  }

  update(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 60) - 1e-6));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
  }

  private step(dt: number): void {
    this.t += dt;
    const C = this.cannon;
    const px = C.x;
    C.x += (C.tx - C.x) * (1 - Math.exp(-dt * 16));
    C.still = Math.abs(C.x - px) < dt * 0.05 ? C.still + dt : 0;
    C.recoil = Math.max(0, C.recoil - dt * 8);
    this.inv = Math.max(0, this.inv - dt);
    this.rapids = Math.max(0, this.rapids - dt);
    this.bridge = Math.max(0, this.bridge - dt);
    this.fog = Math.max(0, this.fog - dt);
    this.doze = Math.max(0, this.doze - dt);
    this.clashBudget = Math.min(40, this.clashBudget + dt * 90);

    if (!this.done) {
      this.fire(dt);
      if (this.phase === 'river') {
        this.river(dt);
        this.trials(dt);
        if (this.riverLeft <= 0 && this.red.n === 0 && !this.trial) {
          this.phase = 'boss';
          this.mouth2 = -1;
          this.boss = startBoss(this, BOSSES[this.level.boss]);
          this.emit('boss', 0.5, this.top, this.level.boss, this.boss.def.name);
        }
      } else if (this.boss) updateBoss(this, this.boss, dt);
    }

    for (const b of this.blocks) {
      if (b.amp) b.cx = Math.max(b.w / 2, Math.min(1 - b.w / 2, b.x0 + Math.sin(this.t * b.speed + b.phase) * b.amp));
      b.flash = Math.max(0, b.flash - dt * 4);
      b.cool = Math.max(0, b.cool - dt);
      b.enter = Math.min(1, b.enter + dt * 2.5);
    }

    this.moveBlue(dt);
    this.moveRed(dt);
    this.clash();
    this.stepHazards(dt);

    if (this.done) return;
    if (this.boss && this.boss.hp <= 0) {
      this.done = 'win';
      this.hazards = [];
      this.red.n = 0;
      this.emit('win', this.boss.x, this.boss.y, this.score);
    } else if (this.lives <= 0) {
      this.lives = 0;
      this.done = 'lose';
      this.emit('lose', C.x, this.cannonY, this.score);
    }
  }

  /** Always firing: the skill is where. */
  get barrels(): number { return this.doze > 0 ? 12 : this.kit.barrels; }
  get fireRate(): number { return BASE_RATE * this.gifts.rate * (1 + 0.4 * this.kit.cadence) * this.barrels; }
  get unitSpeed(): number { return this.kit.spring ? 0.82 : 0.55; }

  private fire(dt: number): void {
    const C = this.cannon;
    this.shot += dt * this.fireRate;
    const n = this.barrels;
    while (this.shot >= 1) {
      this.shot -= 1;
      // round robin over the barrels
      const k = Math.floor(this.rng.next() * n);
      const off = n > 1 ? (k / (n - 1) - 0.5) : 0;
      const fan = this.doze > 0 ? 0.55 : this.kit.fan ? 0.5 : 0;
      const ang = off * fan;
      const sp = this.unitSpeed * 1.2;
      const spread = this.doze > 0 ? 0.05 : 0.016 * n;
      this.blue.add(C.x + off * spread + this.rng.range(-0.004, 0.004), this.bottom - 0.02, Math.sin(ang) * sp + this.rng.range(-0.015, 0.015), -Math.cos(ang) * sp, this.kit.lead ? 2 : 1, 0, this.rng.next());
      C.recoil = 1;
      this.emit('fire', C.x, this.bottom, n);
    }
  }

  private separation(c: Crowd, grid: Grid, i: number): [number, number] {
    let px = 0, py = 0;
    const cx = Math.floor(c.x[i] / CELL), cy = Math.floor(c.y[i] / CELL) + 1;
    const rr = UNIT_R * 2;
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= grid.rows) continue;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= grid.cols) continue;
        for (let j = grid.head[gy * grid.cols + gx]; j !== -1; j = grid.next[j]) {
          if (j === i || j >= c.n) continue;
          const dx = c.x[i] - c.x[j], dy = c.y[i] - c.y[j];
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 1e-10) { const d = Math.sqrt(d2), k = (rr - d) / d; px += dx * k; py += dy * k; }
        }
      }
    }
    return [px, py];
  }

  private moveBlue(dt: number): void {
    const o = this.blue;
    this.gridB.build(o, this.H);
    const hunt = this.red.n > 0;
    if (hunt) this.gridR.build(this.red, this.H);
    const cruise = -this.unitSpeed;
    for (let i = o.n - 1; i >= 0; i--) {
      o.vy[i] += (cruise - o.vy[i]) * Math.min(1, dt * 2.5);
      o.vx[i] *= 1 - Math.min(1, dt * 1.2);
      // soldiers charge the nearest red they can see
      // near the top, during the fight, those who would fly past the captain veer into it
      if (this.boss && this.boss.intro <= 0 && o.y[i] < this.top + 0.4) {
        const dx = this.boss.x - o.x[i];
        if (Math.abs(dx) > this.boss.def.r * 0.85) o.vx[i] += (Math.sign(dx) * 0.35 - o.vx[i]) * Math.min(1, dt * 4);
      }
      if (hunt) {
        const j = this.nearestRed(o.x[i], o.y[i]);
        if (j >= 0) {
          const dx = this.red.x[j] - o.x[i], dy = this.red.y[j] - o.y[i];
          const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
          o.vx[i] += ((dx / d) * this.unitSpeed * 0.9 - o.vx[i]) * Math.min(1, dt * 5);
        }
      }
      const [px, py] = this.separation(o, this.gridB, i);
      const prevY = o.y[i];
      o.x[i] += o.vx[i] * dt + px * 0.5;
      o.y[i] += o.vy[i] * dt + py * 0.3;
      if (o.x[i] < 0.04) { o.x[i] = 0.04; o.vx[i] = Math.abs(o.vx[i]); }
      if (o.x[i] > 0.96) { o.x[i] = 0.96; o.vx[i] = -Math.abs(o.vx[i]); }

      let gone = false;
      for (let g = 0; g < this.blocks.length && g < 32 && !gone; g++) {
        const B = this.blocks[g], bit = 1 << g;
        if (B.gone || (o.seen[i] & bit) || B.enter < 1) continue;
        if (Math.abs(o.x[i] - B.cx) >= B.w / 2) continue;
        const gy = this.laneY(B.y);
        if (B.kind === 'box') {
          if (o.y[i] < gy + BOX_H / 2 && o.y[i] > gy - BOX_H / 2) { this.hitBox(B, o.hp[i], o.x[i]); o.remove(i); gone = true; }
        } else if (prevY > gy && o.y[i] <= gy) {
          o.seen[i] |= bit;
          this.applyGate(B, i);
        }
      }
      if (gone || i >= o.n) continue;
      if (o.y[i] < this.top + 0.01) {
        if (this.phase === 'boss' && this.boss && !this.done) hitBoss(this, this.boss, o.x[i], 1);
        o.remove(i);
      }
    }
  }

  /** The nearest red within two cells ahead of a soldier (or -1). */
  private nearestRed(x: number, y: number): number {
    const g = this.gridR, f = this.red;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL) + 1;
    let best = -1, bd = 0.07 * 0.07;
    for (let gy = cy - 3; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= g.rows) continue;
      for (let gx = cx - 2; gx <= cx + 2; gx++) {
        if (gx < 0 || gx >= g.cols) continue;
        for (let j = g.head[gy * g.cols + gx]; j !== -1; j = g.next[j]) {
          if (j >= f.n || f.y[j] > y + 0.02) continue;
          const dx = f.x[j] - x, dy = f.y[j] - y, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; best = j; }
        }
      }
    }
    return best;
  }

  private hitBox(B: Block, d: number, x: number): void {
    B.left -= d;
    B.flash = 1;
    this.emit('box', x, this.laneY(B.y), Math.max(0, B.left));
    if (B.left <= 0) {
      B.left = 0;
      B.gone = true;
      this.score += B.n * 2;
      if (B.up) this.upgrade(B.up);
      this.emit('break', B.cx, this.laneY(B.y), B.n, B.up);
    }
  }

  upgrade(u: Upgrade): void {
    const k = this.kit;
    if (u === 'duplo') k.barrels = Math.min(4, k.barrels + 1);
    else if (u === 'cadencia') k.cadence = Math.min(3, k.cadence + 1);
    else if (u === 'leque') k.fan = true;
    else if (u === 'chumbo') k.lead = true;
    else if (u === 'mola') k.spring = true;
    else if (u === 'doze') this.doze = DOZE_TIME;
  }

  private applyGate(B: Block, i: number): void {
    const o = this.blue;
    const copy = (n: number) => {
      for (let k = 0; k < n; k++) {
        const a = this.rng.range(-1, 1);
        if (o.add(Math.max(0.04, Math.min(0.96, o.x[i] + a * B.w * 0.3)), o.y[i] - this.rng.range(0, 0.03), a * 0.35, o.vy[i], o.hp[i], o.seen[i], this.rng.next()) < 0) break;
        this.made++;
      }
    };
    if (B.kind === 'add') {
      if (B.cool > 0) return;
      B.cool = ADD_COOL;
      B.flash = 1;
      copy(B.n);
      this.emit('gate', o.x[i], o.y[i], B.n, 'add');
    } else {
      B.flash = 1;
      copy(B.n - 1);
      this.emit('gate', o.x[i], o.y[i], B.n, 'mul');
    }
  }

  private moveRed(dt: number): void {
    const f = this.red;
    this.gridR.build(f, this.H);
    const sp = this.level.foeSpeed * this.gifts.river * (this.rapids > 0 ? 1.4 : 1);
    const bottom = this.bottom - 0.01;
    for (let i = f.n - 1; i >= 0; i--) {
      if (i >= f.n) continue;
      if (f.hp[i] === 0) { f.remove(i); continue; }
      // they march down, keep their column, and near the end lean towards the cannon
      const prog = Math.max(0, Math.min(1, (f.y[i] - this.top) / this.laneLen));
      const chase = prog > 0.8 ? (prog - 0.8) * 2 : 0;
      const tx = (this.cannon.x - f.x[i]) * chase + Math.sin(this.t * 1.3 + f.seed[i] * 20) * 0.02;
      f.vx[i] += (tx - f.vx[i]) * Math.min(1, dt * 2);
      f.vy[i] += (sp - f.vy[i]) * Math.min(1, dt * 3);
      const [px, py] = this.separation(f, this.gridR, i);
      f.x[i] += f.vx[i] * dt + px * 0.5;
      f.y[i] += f.vy[i] * dt + py * 0.2;
      f.x[i] = Math.max(0.04, Math.min(0.96, f.x[i]));
      if (f.y[i] > bottom) {
        const x = f.x[i];
        f.remove(i);
        if (!this.done && this.inv <= 0) this.breach(x);
      }
    }
  }

  /** A red reached the cannon's line: a life, and the reds close behind are swept away. */
  private breach(x: number): void {
    if (!this.hurt(x, 1)) return;
    const f = this.red, lim = this.bottom - BREACH_CLEAR;
    for (let i = f.n - 1; i >= 0; i--) if (f.y[i] > lim) f.remove(i);
    this.emit('breach', x, this.bottom, this.lives);
  }

  private clash(): void {
    const o = this.blue, f = this.red;
    this.gridR.build(f, this.H);
    const grid = this.gridR;
    const rr = UNIT_R * 2 + 0.002;
    for (let i = o.n - 1; i >= 0; i--) {
      const cx = Math.floor(o.x[i] / CELL), cy = Math.floor(o.y[i] / CELL) + 1;
      search:
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= grid.rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= grid.cols) continue;
          for (let j = grid.head[gy * grid.cols + gx]; j !== -1; j = grid.next[j]) {
            if (f.hp[j] === 0) continue;
            const dx = o.x[i] - f.x[j], dy = o.y[i] - f.y[j];
            if (dx * dx + dy * dy > rr * rr) continue;
            f.hp[j] = 0;
            o.hp[i]--;
            this.score += 1;
            this.killed++;
            if (this.clashBudget >= 1) { this.clashBudget--; this.emit('clash', (o.x[i] + f.x[j]) / 2, (o.y[i] + f.y[j]) / 2, 1); }
            if (o.hp[i] === 0) break search;
          }
        }
      }
      if (o.hp[i] === 0) o.remove(i);
    }
    for (let j = f.n - 1; j >= 0; j--) if (f.hp[j] === 0) f.remove(j);
  }

  // ---------- telegraphed attacks ----------

  static slideGaps(h: Hazard, dt: number): void {
    if (!h.gapV) return;
    h.gaps = h.gaps.map((g) => g + h.gapV * dt);
    if (h.gaps.some((g) => g < 0.14 || g > 0.86)) { h.gapV = -h.gapV; h.gaps = h.gaps.map((g) => Math.max(0.14, Math.min(0.86, g))); }
  }

  static inGap(h: Hazard, x: number): boolean {
    return h.gaps.some((g) => Math.abs(x - g) < h.gapW / 2);
  }

  private stepHazards(dt: number): void {
    const C = this.cannon, cy = this.cannonY;
    for (const h of this.hazards) {
      if (h.warn > 0) {
        h.warn -= dt;
        World.slideGaps(h, dt);
        if (h.warn <= 0) this.emit('attack', h.x, h.kind === 'drop' ? this.top : cy, h.look);
        continue;
      }
      World.slideGaps(h, dt);
      if (h.kind === 'drop') {
        h.y += h.vy * dt;
        this.clearBlue((x, y) => Math.abs(x - h.x) < h.w / 2 && Math.abs(y - h.y) < 0.05);
        if (Math.abs(h.y - cy) < 0.05 && Math.abs(C.x - h.x) < h.w / 2 + 0.03) this.hurt(h.x);
        if (h.y > this.H + 0.2) h.done = true;
      } else if (h.kind === 'band') {
        if (!World.inGap(h, C.x)) this.hurt(C.x);
        this.clearBlue((x, y) => y > this.bottom - 0.08 && !World.inGap(h, x));
        h.life -= dt;
        if (h.life <= 0) h.done = true;
      } else if (h.kind === 'wall') {
        const prev = h.y;
        h.y += h.vy * dt;
        this.clearBlue((x, y) => Math.abs(y - h.y) < 0.03 && !World.inGap(h, x));
        if (prev < cy && h.y >= cy && !World.inGap(h, C.x)) this.hurt(C.x);
        if (h.y > this.H + 0.1) h.done = true;
      } else {
        if (Math.abs(C.x - h.x) < h.w / 2 + 0.02) this.hurt(C.x);
        this.clearBlue((x) => Math.abs(x - h.x) < h.w / 2);
        h.life -= dt;
        if (h.life <= 0) h.done = true;
      }
    }
    this.hazards = this.hazards.filter((h) => !h.done);
  }

  private clearBlue(test: (x: number, y: number) => boolean): void {
    const o = this.blue;
    for (let i = o.n - 1; i >= 0; i--) if (test(o.x[i], o.y[i])) o.remove(i);
  }

  drop(x: number, w: number, look: number, warn = this.warn, vy = 2.2): Hazard {
    const h: Hazard = { kind: 'drop', x, w, y: this.top, vy, warn, life: 0, gaps: [], gapW: 0, gapV: 0, look };
    this.hazards.push(h);
    this.emit('warn', x, this.top, look);
    return h;
  }

  band(gaps: number[], gapW: number, look: number, warn = this.warn, life = 0.35, gapV = 0): Hazard {
    const h: Hazard = { kind: 'band', x: 0.5, w: 1, y: this.cannonY, vy: 0, warn, life, gaps, gapW, gapV, look };
    this.hazards.push(h);
    this.emit('warn', 0.5, this.cannonY, look);
    return h;
  }

  wall(gaps: number[], gapW: number, look: number, vy = 0.55, warn = this.warn, gapV = 0): Hazard {
    const h: Hazard = { kind: 'wall', x: 0.5, w: 1, y: this.top, vy, warn, life: 0, gaps, gapW, gapV, look };
    this.hazards.push(h);
    this.emit('warn', 0.5, this.top, look);
    return h;
  }

  beam(x: number, w: number, look: number, warn = this.warn, life = 0.4): Hazard {
    const h: Hazard = { kind: 'beam', x: Math.max(0.05, Math.min(0.95, x)), w, y: this.top, vy: 0, warn, life, gaps: [], gapW: 0, gapV: 0, look };
    this.hazards.push(h);
    this.emit('warn', h.x, this.top, look);
    return h;
  }
}
