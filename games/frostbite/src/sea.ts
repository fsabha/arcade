import { W, ROWS, FLOES_PER_ROW, floeWidth, floeSpeed, FISH_POINTS } from './config';
import { Rng } from '@arcade/shared';

export type Creature = 'goose' | 'crab' | 'clam' | 'fish';

export interface Group {
  kind: Creature;
  xs: number[]; // left edges, wrap around W
  dir: 1 | -1;
  speed: number;
  w: number;
  alive: boolean[]; // fish can be eaten
  respawn: number[]; // seconds until an eaten fish returns
}

export interface Row {
  dir: 1 | -1;
  offset: number; // scroll position of the floe pattern
  white: boolean;
  group: Group | null;
}

const CREATURE_W: Record<Creature, number> = { goose: 16, crab: 16, clam: 16, fish: 16 };

/** Which creatures ride each row at a given level (null = empty row). */
export function hazardsFor(level: number, rng: Rng): (Creature | null)[] {
  if (level === 1) return [null, 'goose', null, null];
  if (level === 2) return [null, 'goose', null, 'crab'];
  if (level === 3) return ['goose', 'fish', 'crab', 'clam'];
  // from level 4 every row is busy; one row carries fish
  const kinds: Creature[] = rng.shuffle(['goose', 'crab', 'clam']);
  const fishRow = rng.int(0, ROWS - 1);
  const out: (Creature | null)[] = [];
  for (let r = 0; r < ROWS; r++) out.push(r === fishRow ? 'fish' : kinds[r % kinds.length]);
  return out;
}

export class Sea {
  rows: Row[] = [];
  floeW: number;
  speed: number;

  constructor(public level: number, seed: number) {
    const rng = new Rng(seed);
    this.floeW = floeWidth(level);
    this.speed = floeSpeed(level);
    const kinds = hazardsFor(level, rng);
    for (let r = 0; r < ROWS; r++) {
      const dir: 1 | -1 = r % 2 === 0 ? -1 : 1;
      let group: Group | null = null;
      const kind = kinds[r];
      if (kind) {
        const n = kind === 'fish' ? 1 : Math.min(3, 2 + Math.floor((level - 1) / 3));
        const gap = 36;
        const start = rng.range(0, W);
        const xs = Array.from({ length: n }, (_, i) => (start + i * gap) % W);
        group = { kind, xs, dir, speed: this.speed * (kind === 'fish' ? 0.9 : 1.25), w: CREATURE_W[kind], alive: xs.map(() => true), respawn: xs.map(() => 0) };
      }
      this.rows.push({ dir, offset: rng.range(0, W), white: true, group });
    }
  }

  update(dt: number): void {
    for (const row of this.rows) {
      row.offset = mod(row.offset + row.dir * this.speed * dt, W);
      const g = row.group;
      if (!g) continue;
      for (let i = 0; i < g.xs.length; i++) {
        g.xs[i] = mod(g.xs[i] + g.dir * g.speed * dt, W);
        if (!g.alive[i]) {
          g.respawn[i] -= dt;
          if (g.respawn[i] <= 0) g.alive[i] = true;
        }
      }
    }
  }

  reverse(r: number): void {
    this.rows[r].dir = this.rows[r].dir === 1 ? -1 : 1;
  }

  /** Left edges of the floes in a row (each may wrap past W). */
  floes(r: number): number[] {
    const step = W / FLOES_PER_ROW;
    return Array.from({ length: FLOES_PER_ROW }, (_, i) => mod(this.rows[r].offset + i * step, W));
  }

  /** Is there ice under the x range [a, b] on row r? (range may wrap) */
  hasIce(r: number, a: number, b: number): boolean {
    for (const x of this.floes(r)) {
      for (const base of [x - W, x, x + W]) {
        if (a >= base && b <= base + this.floeW) return true;
      }
    }
    return false;
  }

  /** The creature index on row r overlapping the x range, or -1. */
  creatureAt(r: number, a: number, b: number): number {
    const g = this.rows[r].group;
    if (!g) return -1;
    for (let i = 0; i < g.xs.length; i++) {
      if (!g.alive[i]) continue;
      for (const base of [g.xs[i] - W, g.xs[i], g.xs[i] + W]) {
        if (a < base + g.w && b > base) return i;
      }
    }
    return -1;
  }

  /** Eats fish i on row r; returns the points. */
  eatFish(r: number, i: number): number {
    const g = this.rows[r].group!;
    g.alive[i] = false;
    g.respawn[i] = 6;
    return FISH_POINTS;
  }

  get allBlue(): boolean {
    return this.rows.every((r) => !r.white);
  }

  resetWhite(): void {
    for (const r of this.rows) r.white = true;
  }
}

export function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}
