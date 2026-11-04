import { COLS, ROWS, TILE } from './config';

// Legend: # wall, . dot, o power pellet, space = open, - ghost house door, ~ tunnel (open, slow).
export const MAP: readonly string[] = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##          ##.######',
  '######.## ###--### ##.######',
  '######.## #      # ##.######',
  '~~~~~~.   #      #   .~~~~~~',
  '######.## #      # ##.######',
  '######.## ######## ##.######',
  '######.##          ##.######',
  '######.## ######## ##.######',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

export type Cell = '#' | '.' | 'o' | ' ' | '-' | '~';

export class Maze {
  /** Current dots: 1 = dot, 2 = power pellet, 0 = none. Indexed [row][col]. */
  dots: Uint8Array = new Uint8Array(COLS * ROWS);
  dotsLeft = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.dotsLeft = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAP[r][c];
        const v = ch === '.' ? 1 : ch === 'o' ? 2 : 0;
        this.dots[r * COLS + c] = v;
        if (v) this.dotsLeft++;
      }
    }
  }

  static cell(c: number, r: number): Cell {
    if (r < 0 || r >= ROWS) return '#';
    if (c < 0 || c >= COLS) return MAP[r][0] === '~' ? '~' : '#'; // tunnel continues off-screen
    return MAP[r][c] as Cell;
  }

  /** Open for movement (walls and the door block; the door is open only for ghosts in/out of the house). */
  static isOpen(c: number, r: number, allowDoor = false): boolean {
    const ch = Maze.cell(c, r);
    if (ch === '#') return false;
    if (ch === '-') return allowDoor;
    return true;
  }

  static isWall(c: number, r: number): boolean {
    return Maze.cell(c, r) === '#';
  }

  static isTunnel(c: number, r: number): boolean {
    return Maze.cell(c, r) === '~' || (r === 14 && (c < 5 || c > 22));
  }

  static isHouse(c: number, r: number): boolean {
    return r >= 13 && r <= 15 && c >= 11 && c <= 16;
  }

  dotAt(c: number, r: number): number {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return this.dots[r * COLS + c];
  }

  /** Removes and returns the dot type at the tile (0 if none). */
  eat(c: number, r: number): number {
    const v = this.dotAt(c, r);
    if (v) {
      this.dots[r * COLS + c] = 0;
      this.dotsLeft--;
    }
    return v;
  }
}

/** Pixel centre of a tile. */
export function tileCenter(c: number): number {
  return c * TILE + TILE / 2;
}

export function toTile(px: number): number {
  return Math.floor(px / TILE);
}
