import {
  ROWS, COLS, CELL_W, CELL_H, STEP_X, STEP_DOWN, FORMATION_MARGIN, W,
  TICK_MAX, TICK_MIN, WAVE_SPEEDUP, FORMATION_X0, FORMATION_Y0, FORMATION_Y_PER_WAVE, FORMATION_Y_MAX,
} from './config';
import type { Box } from './collision';

export type InvaderKind = 'squid' | 'crab' | 'octopus';
export const KIND_SIZE: Record<InvaderKind, [number, number]> = { squid: [8, 8], crab: [11, 8], octopus: [12, 8] };

export function kindForRow(row: number): InvaderKind {
  return row === 0 ? 'squid' : row <= 2 ? 'crab' : 'octopus';
}

export interface Invader {
  row: number;
  col: number;
  kind: InvaderKind;
  alive: boolean;
}

export function startY(wave: number): number {
  return Math.min(FORMATION_Y_MAX, FORMATION_Y0 + (wave - 1) * FORMATION_Y_PER_WAVE);
}

/** Seconds between formation ticks: slower with many invaders, faster with few, faster on later waves. */
export function tickInterval(alive: number, wave: number): number {
  const t = Math.max(0, Math.min(1, (alive - 1) / (ROWS * COLS - 1)));
  const base = TICK_MIN + (TICK_MAX - TICK_MIN) * Math.pow(t, 1.6);
  const waveMul = Math.max(0.55, 1 - (wave - 1) * WAVE_SPEEDUP);
  return base * waveMul;
}

/**
 * The invader grid. (x, y) is the top-left of the formation box; each invader occupies a CELL_W x CELL_H cell
 * and its sprite is centered horizontally inside the cell.
 */
export class Formation {
  x: number;
  y: number;
  dir: 1 | -1 = 1;
  frame = 0;
  readonly invaders: Invader[] = [];
  readonly wave: number;

  constructor(wave: number, x = FORMATION_X0, y = startY(wave)) {
    this.wave = wave;
    this.x = x;
    this.y = y;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) this.invaders.push({ row: r, col: c, kind: kindForRow(r), alive: true });
    }
  }

  get aliveCount(): number {
    let n = 0;
    for (const i of this.invaders) if (i.alive) n++;
    return n;
  }

  at(row: number, col: number): Invader {
    return this.invaders[row * COLS + col];
  }

  rect(inv: Invader): Box {
    const [w, h] = KIND_SIZE[inv.kind];
    return {
      x: this.x + inv.col * CELL_W + Math.floor((CELL_W - w) / 2),
      y: this.y + inv.row * CELL_H + (CELL_H - h),
      w,
      h,
    };
  }

  /** Pixel bounds of the alive invaders (null when none alive). */
  bounds(): { left: number; right: number; top: number; bottom: number } | null {
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const r = this.rect(inv);
      left = Math.min(left, r.x);
      right = Math.max(right, r.x + r.w);
      top = Math.min(top, r.y);
      bottom = Math.max(bottom, r.y + r.h);
    }
    return left === Infinity ? null : { left, right, top, bottom };
  }

  /** Advance one tick. Returns true when the formation dropped a row (hit an edge). */
  step(): boolean {
    const b = this.bounds();
    this.frame ^= 1;
    if (!b) return false;
    const nextLeft = b.left + this.dir * STEP_X;
    const nextRight = b.right + this.dir * STEP_X;
    if (nextLeft < FORMATION_MARGIN || nextRight > W - FORMATION_MARGIN) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.y += STEP_DOWN;
      return true;
    }
    this.x += this.dir * STEP_X;
    return false;
  }

  interval(): number {
    return tickInterval(this.aliveCount, this.wave);
  }

  /** Bottom-most alive invader of each column (candidates to shoot). */
  shooters(): Invader[] {
    const out: Invader[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        const inv = this.at(r, c);
        if (inv.alive) {
          out.push(inv);
          break;
        }
      }
    }
    return out;
  }

  /** First alive invader whose rect overlaps the box, or null. */
  hitTest(box: Box): Invader | null {
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const r = this.rect(inv);
      if (box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y) return inv;
    }
    return null;
  }
}
