import { SHIELD_W, SHIELD_H, SHIELD_Y, SHIELD_GAP, SHIELDS, W } from './config';
import type { Box } from './collision';

export const SHIELD_SHAPE = [
  '....XXXXXXXXXXXXXX....',
  '...XXXXXXXXXXXXXXXX...',
  '..XXXXXXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXX........XXXXXXX',
  'XXXXXX..........XXXXXX',
  'XXXXX............XXXXX',
  'XXXXX............XXXXX',
];

/** Blast mask applied around an impact point (center = row 2, col 2). */
const BLAST = [
  '.X.X.X',
  'XXXXXX',
  'XXXXXX',
  'XXXXXX',
  '.X.X..',
];
const BLAST_CX = 2;
const BLAST_CY = 2;

export class Barricade {
  readonly x: number;
  readonly y: number;
  readonly w = SHIELD_W;
  readonly h = SHIELD_H;
  readonly cells: Uint8Array;
  dirty = true;

  constructor(x: number, y: number = SHIELD_Y) {
    this.x = x;
    this.y = y;
    this.cells = new Uint8Array(SHIELD_W * SHIELD_H);
    for (let r = 0; r < SHIELD_H; r++) {
      for (let c = 0; c < SHIELD_W; c++) this.cells[r * SHIELD_W + c] = SHIELD_SHAPE[r][c] === 'X' ? 1 : 0;
    }
  }

  get box(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get(c: number, r: number): boolean {
    if (c < 0 || r < 0 || c >= this.w || r >= this.h) return false;
    return this.cells[r * this.w + c] === 1;
  }

  pixelCount(): number {
    let n = 0;
    for (const v of this.cells) n += v;
    return n;
  }

  /**
   * Finds the first solid pixel inside the box, scanning from the given vertical direction
   * (dir = -1 scans bottom-up for shots travelling up; dir = 1 scans top-down). Returns local (c, r) or null.
   */
  firstHit(box: Box, dir: 1 | -1): { c: number; r: number } | null {
    const c0 = Math.max(0, Math.floor(box.x - this.x));
    const c1 = Math.min(this.w - 1, Math.ceil(box.x + box.w - this.x) - 1);
    const r0 = Math.max(0, Math.floor(box.y - this.y));
    const r1 = Math.min(this.h - 1, Math.ceil(box.y + box.h - this.y) - 1);
    if (c0 > c1 || r0 > r1) return null;
    if (dir === -1) {
      for (let r = r1; r >= r0; r--) for (let c = c0; c <= c1; c++) if (this.get(c, r)) return { c, r };
    } else {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.get(c, r)) return { c, r };
    }
    return null;
  }

  /** Erase a blast around a local pixel. */
  blast(c: number, r: number): void {
    for (let br = 0; br < BLAST.length; br++) {
      for (let bc = 0; bc < BLAST[br].length; bc++) {
        if (BLAST[br][bc] !== 'X') continue;
        const cc = c + bc - BLAST_CX;
        const rr = r + br - BLAST_CY;
        if (cc < 0 || rr < 0 || cc >= this.w || rr >= this.h) continue;
        this.cells[rr * this.w + cc] = 0;
      }
    }
    this.dirty = true;
  }

  /** Erase every pixel overlapped by the box (invaders marching through). Returns erased count. */
  carve(box: Box): number {
    const c0 = Math.max(0, Math.floor(box.x - this.x));
    const c1 = Math.min(this.w - 1, Math.ceil(box.x + box.w - this.x) - 1);
    const r0 = Math.max(0, Math.floor(box.y - this.y));
    const r1 = Math.min(this.h - 1, Math.ceil(box.y + box.h - this.y) - 1);
    let n = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * this.w + c;
        if (this.cells[i]) {
          this.cells[i] = 0;
          n++;
        }
      }
    }
    if (n) this.dirty = true;
    return n;
  }
}

export function makeBarricades(): Barricade[] {
  const gap = Math.floor(SHIELD_GAP);
  const offset = Math.floor((W - (SHIELDS * SHIELD_W + (SHIELDS + 1) * gap)) / 2);
  const out: Barricade[] = [];
  for (let i = 0; i < SHIELDS; i++) out.push(new Barricade(offset + gap + i * (SHIELD_W + gap)));
  return out;
}
