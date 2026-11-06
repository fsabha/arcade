import { TILE, COLS, ROWS, speedFactor } from './config';
import { levelMap } from './levels';

export type CritterKind = 'spider' | 'bat' | 'snake' | 'moth';

export interface Critter {
  kind: CritterKind;
  x: number; // left, px
  y: number; // top, px
  w: number;
  h: number;
  dir: 1 | -1;
  baseY: number;
  baseX: number;
  alive: boolean;
  phase: number;
}

export interface Raft {
  x: number;
  y: number; // top of the raft (lava surface)
  w: number;
  dir: 1 | -1;
  minX: number;
  maxX: number;
}

export interface Tentacle {
  x: number;
  y: number;
  minX: number;
  maxX: number;
}

export interface Lantern {
  x: number;
  y: number;
  lit: boolean;
}

export class World {
  tiles: string[][];
  width: number; // tiles
  height: number;
  screensX: number;
  screensY: number;
  critters: Critter[] = [];
  rafts: Raft[] = [];
  tentacles: Tentacle[] = [];
  lanterns: Lantern[] = [];
  dark = new Set<string>(); // screens "sx,sy" that went dark
  start = { x: 0, y: 0 };
  miner = { x: 0, y: 0 };
  burn = new Map<string, number>(); // laser progress on D tiles
  speed: number;

  constructor(public level: number) {
    const map = levelMap(level);
    this.tiles = map.map((r) => r.split(''));
    this.width = this.tiles[0].length;
    this.height = this.tiles.length;
    this.screensX = this.width / COLS;
    this.screensY = this.height / ROWS;
    this.speed = speedFactor(level);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const c = this.tiles[y][x];
        const px = x * TILE;
        const py = y * TILE;
        switch (c) {
          case 'H': this.start = { x: px + 2, y: py }; this.tiles[y][x] = '.'; break;
          case 'X': this.miner = { x: px, y: py }; this.tiles[y][x] = '.'; break;
          case 'P': this.lanterns.push({ x: px, y: py, lit: true }); this.tiles[y][x] = '.'; break;
          case 'S': this.critters.push({ kind: 'spider', x: px + 2, y: py, w: 12, h: 10, dir: 1, baseX: px + 2, baseY: py, alive: true, phase: 0 }); this.tiles[y][x] = '.'; break;
          case 'B': this.critters.push({ kind: 'bat', x: px, y: py + 4, w: 16, h: 8, dir: 1, baseX: px, baseY: py + 4, alive: true, phase: 0 }); this.tiles[y][x] = '.'; break;
          case 'K': this.critters.push({ kind: 'snake', x: px + 1, y: py + 6, w: 14, h: 10, dir: 1, baseX: px, baseY: py + 6, alive: true, phase: 0 }); this.tiles[y][x] = '.'; break;
          case 'T': this.critters.push({ kind: 'moth', x: px + 2, y: py + 4, w: 12, h: 8, dir: 1, baseX: px + 2, baseY: py + 4, alive: true, phase: 0 }); this.tiles[y][x] = '.'; break;
          case 'R': { const span = this.lavaSpan(x, y); this.rafts.push({ x: px, y: py, w: 32, dir: 1, minX: span[0] * TILE, maxX: (span[1] + 1) * TILE - 32 }); this.tiles[y][x] = 'L'; break; }
          case '~': { const span = this.lavaSpan(x, y); this.tentacles.push({ x: px, y: py, minX: span[0] * TILE, maxX: (span[1] + 1) * TILE - 16 }); this.tiles[y][x] = 'L'; break; }
        }
      }
    }
  }

  /** Leftmost and rightmost lava column of the stretch containing (x, y). */
  private lavaSpan(x: number, y: number): [number, number] {
    const isLava = (c: string) => c === 'L' || c === 'R' || c === '~';
    let a = x;
    let b = x;
    while (a > 0 && isLava(this.tiles[y][a - 1])) a--;
    while (b < this.width - 1 && isLava(this.tiles[y][b + 1])) b++;
    return [a, b];
  }

  tile(tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return '#';
    return this.tiles[ty][tx];
  }

  isSolid(tx: number, ty: number): boolean {
    const c = this.tile(tx, ty);
    return c === '#' || c === 'D' || c === 'M';
  }

  isDeadly(tx: number, ty: number): boolean {
    const c = this.tile(tx, ty);
    return c === 'M' || c === 'L';
  }

  /** Does the box touch any solid tile? */
  hitsSolid(x: number, y: number, w: number, h: number): boolean {
    const x0 = Math.floor(x / TILE);
    const x1 = Math.floor((x + w - 1) / TILE);
    const y0 = Math.floor(y / TILE);
    const y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.isSolid(tx, ty)) return true;
    return false;
  }

  hitsDeadly(x: number, y: number, w: number, h: number): boolean {
    const x0 = Math.floor(x / TILE);
    const x1 = Math.floor((x + w - 1) / TILE);
    const y0 = Math.floor(y / TILE);
    const y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.isDeadly(tx, ty)) return true;
    return false;
  }

  /** Destroys every D tile within radius px of (cx, cy); returns how many. */
  blast(cx: number, cy: number, radius: number): number {
    let n = 0;
    const r = Math.ceil(radius / TILE) + 1;
    const tx0 = Math.floor(cx / TILE);
    const ty0 = Math.floor(cy / TILE);
    for (let ty = ty0 - r; ty <= ty0 + r; ty++) {
      for (let tx = tx0 - r; tx <= tx0 + r; tx++) {
        if (this.tile(tx, ty) !== 'D') continue;
        const dx = tx * TILE + TILE / 2 - cx;
        const dy = ty * TILE + TILE / 2 - cy;
        if (dx * dx + dy * dy <= radius * radius) { this.tiles[ty][tx] = '.'; n++; }
      }
    }
    return n;
  }

  screenOf(x: number, y: number): { sx: number; sy: number } {
    return { sx: Math.max(0, Math.min(this.screensX - 1, Math.floor(x / (COLS * TILE)))), sy: Math.max(0, Math.min(this.screensY - 1, Math.floor(y / (ROWS * TILE)))) };
  }

  update(dt: number): void {
    const s = this.speed;
    for (const c of this.critters) {
      if (!c.alive) continue;
      c.phase += dt;
      switch (c.kind) {
        case 'spider': {
          // drops down its thread up to three tiles and climbs back
          c.y += c.dir * 36 * s * dt;
          if (c.y > c.baseY + 3 * TILE || this.hitsSolid(c.x, c.y + c.h, c.w, 1)) { c.y = Math.min(c.y, c.baseY + 3 * TILE); c.dir = -1; }
          if (c.y <= c.baseY) { c.y = c.baseY; c.dir = 1; }
          break;
        }
        case 'bat': {
          c.x += c.dir * 56 * s * dt;
          if (this.hitsSolid(c.x, c.y, c.w, c.h) || Math.abs(c.x - c.baseX) > 6 * TILE) { c.x -= c.dir * 56 * s * dt; c.dir = c.dir === 1 ? -1 : 1; }
          break;
        }
        case 'moth': {
          c.x = c.baseX + Math.sin(c.phase * 2.2 * s) * 20;
          c.y = c.baseY + Math.sin(c.phase * 3.1 * s) * 10;
          break;
        }
        case 'snake': break;
      }
    }
    for (const r of this.rafts) {
      r.x += r.dir * 40 * dt;
      if (r.x <= r.minX) { r.x = r.minX; r.dir = 1; }
      if (r.x >= r.maxX) { r.x = r.maxX; r.dir = -1; }
    }
  }

  /** Tentacles crawl along the lava toward x. */
  updateTentacles(dt: number, targetX: number): void {
    for (const t of this.tentacles) {
      const d = targetX - t.x;
      if (Math.abs(d) > 2) t.x += Math.sign(d) * 24 * this.speed * dt;
      t.x = Math.max(t.minX, Math.min(t.maxX, t.x));
    }
  }

  raftUnder(x: number, w: number, feetY: number): Raft | null {
    for (const r of this.rafts) {
      if (x + w > r.x && x < r.x + r.w && feetY >= r.y - 2 && feetY <= r.y + 6) return r;
    }
    return null;
  }
}

export function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
