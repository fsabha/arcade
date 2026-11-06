import { W, TILE, PERIOD, WRAP_MARGIN, speedFactor, SNAKE_FROM_LEVEL, CROC_FROM_LEVEL, OTTER_FROM_LEVEL } from './config';
import { Rng } from '@arcade/shared';

export type Kind = 'car' | 'dozer' | 'racer' | 'truck' | 'turtle' | 'log' | 'croc' | 'snake' | 'otter';

export interface LaneDef {
  row: number;
  kind: Kind;
  dir: 1 | -1;
  speed: number; // px/s at level 1
  count: number;
  /** tiles wide (a turtle group of 3 is 3 tiles) */
  width: number;
  /** turtle groups: which of the `count` groups dive */
  divers?: number[];
}

/** The arcade layout, bottom road lane first. Rows 9-13 are road, 3-7 river. */
export const LANES: LaneDef[] = [
  { row: 13, kind: 'car', dir: -1, speed: 24, count: 3, width: 1 },
  { row: 12, kind: 'dozer', dir: 1, speed: 20, count: 3, width: 1 },
  { row: 11, kind: 'car', dir: -1, speed: 28, count: 3, width: 1 },
  { row: 10, kind: 'racer', dir: 1, speed: 64, count: 1, width: 1 },
  { row: 9, kind: 'truck', dir: -1, speed: 22, count: 2, width: 2 },
  { row: 7, kind: 'turtle', dir: -1, speed: 26, count: 4, width: 3, divers: [1] },
  { row: 6, kind: 'log', dir: 1, speed: 24, count: 3, width: 3 },
  { row: 5, kind: 'log', dir: 1, speed: 40, count: 2, width: 6 },
  { row: 4, kind: 'turtle', dir: -1, speed: 30, count: 4, width: 2, divers: [0, 2] },
  { row: 3, kind: 'log', dir: 1, speed: 28, count: 3, width: 4 },
];

export interface Mover {
  kind: Kind;
  row: number;
  /** left edge in world px; may be off screen */
  x: number;
  w: number;
  dir: 1 | -1;
  speed: number;
  /** turtles: diving cycle phase in seconds, -1 for non-divers */
  dive: number;
  /** crocodile: the head is the leading tile */
  phase: number;
}

export const DIVE_CYCLE = { up: 4, sinking: 1, under: 2, rising: 1 } as const;
export const DIVE_TOTAL = DIVE_CYCLE.up + DIVE_CYCLE.sinking + DIVE_CYCLE.under + DIVE_CYCLE.rising;

/** 0 = fully surfaced .. 1 = fully under. */
export function submersion(m: Mover): number {
  if (m.dive < 0) return 0;
  const t = m.dive % DIVE_TOTAL;
  if (t < DIVE_CYCLE.up) return 0;
  if (t < DIVE_CYCLE.up + DIVE_CYCLE.sinking) return (t - DIVE_CYCLE.up) / DIVE_CYCLE.sinking;
  if (t < DIVE_CYCLE.up + DIVE_CYCLE.sinking + DIVE_CYCLE.under) return 1;
  return 1 - (t - DIVE_CYCLE.up - DIVE_CYCLE.sinking - DIVE_CYCLE.under) / DIVE_CYCLE.rising;
}

export function isRiver(row: number): boolean {
  return row >= 3 && row <= 7;
}

export function isRoad(row: number): boolean {
  return row >= 9 && row <= 13;
}

/** Everything that moves on the road, the river and the median. */
export class Traffic {
  movers: Mover[] = [];

  constructor(public level: number, seed: number) {
    const rng = new Rng(seed);
    const k = speedFactor(level);
    for (const lane of LANES) {
      const spacing = PERIOD / lane.count;
      const offset = rng.range(0, spacing);
      for (let i = 0; i < lane.count; i++) {
        let kind = lane.kind;
        if (kind === 'log' && lane.width === 6 && i === 0 && level >= CROC_FROM_LEVEL) kind = 'croc';
        this.movers.push({
          kind, row: lane.row, x: offset + i * spacing - WRAP_MARGIN, w: lane.width * TILE, dir: lane.dir, speed: lane.speed * k,
          dive: lane.divers?.includes(i) ? rng.range(0, DIVE_TOTAL) : -1, phase: rng.next() * 10,
        });
      }
    }
    if (level >= SNAKE_FROM_LEVEL) {
      this.movers.push({ kind: 'snake', row: 8, x: rng.range(0, W), w: 2 * TILE, dir: 1, speed: 30 * k, dive: -1, phase: 0 });
    }
    if (level >= OTTER_FROM_LEVEL) {
      this.movers.push({ kind: 'otter', row: 6, x: -WRAP_MARGIN, w: TILE, dir: 1, speed: 36 * k, dive: -1, phase: 0 });
      this.movers.push({ kind: 'otter', row: 4, x: W, w: TILE, dir: -1, speed: 36 * k, dive: -1, phase: 5 });
    }
  }

  update(dt: number): void {
    for (const m of this.movers) {
      m.x += m.dir * m.speed * dt;
      if (m.dir > 0 && m.x > W + WRAP_MARGIN - m.w + m.w) m.x -= PERIOD + m.w;
      if (m.dir < 0 && m.x + m.w < -WRAP_MARGIN) m.x += PERIOD + m.w;
      if (m.dive >= 0) m.dive += dt;
      m.phase += dt;
      if (m.kind === 'snake') {
        // the snake slithers back and forth along the median
        if (m.x <= 0) { m.x = 0; m.dir = 1; }
        if (m.x + m.w >= W) { m.x = W - m.w; m.dir = -1; }
      }
    }
  }

  inRow(row: number): Mover[] {
    return this.movers.filter((m) => m.row === row);
  }

  /** The platform (log, turtles, croc) under a point of the river, or null. */
  platformAt(row: number, cx: number): Mover | null {
    for (const m of this.inRow(row)) {
      if (m.kind !== 'log' && m.kind !== 'turtle' && m.kind !== 'croc') continue;
      if (cx >= m.x && cx < m.x + m.w) return m;
    }
    return null;
  }

  /** Does a deadly thing overlap the frog box? */
  deadlyAt(row: number, x0: number, x1: number): Mover | null {
    for (const m of this.inRow(row)) {
      let dx0 = m.x;
      let dx1 = m.x + m.w;
      if (m.kind === 'log' || m.kind === 'turtle') continue;
      if (m.kind === 'croc') {
        // only the open jaws at the front
        const head = m.dir > 0 ? m.x + m.w - TILE : m.x;
        if (Math.floor(m.phase) % 3 !== 0) continue; // jaws closed two thirds of the time
        dx0 = head + 4; dx1 = head + TILE - 2;
      } else if (m.kind === 'otter') {
        dx0 = m.x + 3; dx1 = m.x + m.w - 3;
      } else {
        dx0 = m.x + 2; dx1 = m.x + m.w - 2;
      }
      if (x0 < dx1 && x1 > dx0) return m;
    }
    return null;
  }
}
