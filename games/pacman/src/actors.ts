import { TILE, W, Dir, DX, DY } from './config';

export const EPS = 0.01;

/** An actor moving along the tile grid. Position is the sprite centre in pixels. */
export class Actor {
  x: number;
  y: number;
  dir: Dir;

  constructor(x: number, y: number, dir: Dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
  }

  get col(): number {
    return Math.floor(this.x / TILE);
  }

  get row(): number {
    return Math.floor(this.y / TILE);
  }

  /** Offset from the current tile centre along the movement axis (negative = before centre). */
  centerOffset(): number {
    const c = this.col * TILE + TILE / 2;
    const r = this.row * TILE + TILE / 2;
    return this.dir === 'left' ? c - this.x : this.dir === 'right' ? this.x - c : this.dir === 'up' ? r - this.y : this.y - r;
  }

  atCenter(): boolean {
    return Math.abs(this.x - (this.col * TILE + TILE / 2)) < EPS && Math.abs(this.y - (this.row * TILE + TILE / 2)) < EPS;
  }

  snapToCenter(): void {
    this.x = this.col * TILE + TILE / 2;
    this.y = this.row * TILE + TILE / 2;
  }

  /** Tile ahead in direction d (defaults to current). */
  ahead(d: Dir = this.dir, n = 1): { c: number; r: number } {
    return { c: this.col + DX[d] * n, r: this.row + DY[d] * n };
  }

  /**
   * Move `dist` px along `dir`, stopping at every tile centre to let `atCenter` pick a new
   * direction or block (return false). `canEnter(c, r)` says whether the next tile is open.
   * Returns the distance actually moved.
   */
  advance(dist: number, canEnter: (c: number, r: number) => boolean, atCenter?: () => boolean): number {
    let moved = 0;
    let guard = 0;
    while (dist > EPS && guard++ < 64) {
      if (this.atCenter()) {
        this.snapToCenter();
        if (atCenter && !atCenter()) break;
        const n = this.ahead();
        if (!canEnter(n.c, n.r)) break;
      }
      // distance to the next centre along the axis
      const nextC = this.nextCenter();
      const toNext = Math.abs(nextC - (this.dir === 'left' || this.dir === 'right' ? this.x : this.y));
      const d = Math.min(dist, toNext);
      this.x += DX[this.dir] * d;
      this.y += DY[this.dir] * d;
      dist -= d;
      moved += d;
      if (d >= toNext - EPS) {
        if (this.dir === 'left' || this.dir === 'right') this.x = nextC;
        else this.y = nextC;
      }
      this.wrap();
    }
    return moved;
  }

  /** Coordinate (on the movement axis) of the next tile centre ahead, including the current one if not yet reached. */
  private nextCenter(): number {
    const horiz = this.dir === 'left' || this.dir === 'right';
    const pos = horiz ? this.x : this.y;
    const sign = horiz ? DX[this.dir] : DY[this.dir];
    const tileIdx = Math.floor(pos / TILE);
    const center = tileIdx * TILE + TILE / 2;
    if (sign > 0) return pos < center - EPS ? center : center + TILE;
    return pos > center + EPS ? center : center - TILE;
  }

  /** Tunnel wrap-around: there are two hidden tiles on each side. */
  private wrap(): void {
    const limit = 2 * TILE;
    if (this.x < -limit) this.x += W + 2 * limit;
    else if (this.x > W + limit) this.x -= W + 2 * limit;
  }
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}
