import type { FruitKind } from './levels';
import type { GhostName } from './ghostai';
import type { Dir } from './config';

export const GHOST_COLORS: Record<GhostName, string> = {
  blinky: '#ff0000',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb852',
};
export const FRIGHT_BLUE = '#2121ff';
export const FRIGHT_FACE = '#ffb8ae';
export const PAC_YELLOW = '#ffff00';

const P: Record<string, string> = {
  R: '#ff0000', r: '#b00000', G: '#00ff00', g: '#00a000', W: '#ffffff', Y: '#ffff00', O: '#ffb852', o: '#d08030',
  B: '#2121ff', C: '#00ffff', P: '#ffb8ff', K: '#000000', T: '#ffb8ae', M: '#ff00ff', L: '#e0e0e0', '.': '',
};

// 14x14 ghost body (two skirt frames), B = body colour (tinted)
const GHOST_BODY: string[][] = [
  [
    '.....BBBB.....',
    '...BBBBBBBB...',
    '..BBBBBBBBBB..',
    '.BBBBBBBBBBBB.',
    '.BBBBBBBBBBBB.',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BB.BBB..BBB.BB',
    'B...BB..BB...B',
  ],
  [
    '.....BBBB.....',
    '...BBBBBBBB...',
    '..BBBBBBBBBB..',
    '.BBBBBBBBBBBB.',
    '.BBBBBBBBBBBB.',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBB',
    '.BBB.BBBB.BBB.',
    '..B...BB...B..',
  ],
];

// Eyes: whites 4x5 at two positions, pupils 2x2 shifted by direction
const EYE_OFFSETS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const FRUITS: Record<FruitKind, string[]> = {
  cherry: [
    '..........gg',
    '........gg..',
    '.......g....',
    '......g.....',
    '..RRR.g.....',
    '.RRRRRg.....',
    'RRRRRRR.RRR.',
    'RRRRRRRRRRRR',
    'RWRRRRRRRRRR',
    '.RRRRRWRRRRR',
    '..RRR.RRRRR.',
    '.......RRR..',
  ],
  strawberry: [
    '.....gg.....',
    '..gggGGggg..',
    '....RRRR....',
    '..RRWRRRRR..',
    '.RRRRRRWRRR.',
    '.RWRRRRRRRR.',
    'RRRRRWRRRWRR',
    'RRRRRRRRRRRR',
    '.RRWRRRRRRR.',
    '.RRRRRWRRRR.',
    '..RRRRRRRR..',
    '....RRRR....',
  ],
  orange: [
    '......gg....',
    '.....gg.....',
    '....oo......',
    '..OOOOOOOO..',
    '.OOOOOOOOOO.',
    'OOOOOOOOOOOO',
    'OOOOOOOOOOOO',
    'OOOOOOOOOOOO',
    'OOOOOOOOOOOO',
    '.OOOOOOOOOO.',
    '..OOOOOOOO..',
    '............',
  ],
  apple: [
    '.....oo.....',
    '....og......',
    '..RRRRRRRR..',
    '.RRRRRRRRRR.',
    'RRRRRRRRRRRR',
    'RRWRRRRRRRRR',
    'RRWRRRRRRRRR',
    'RRRRRRRRRRRR',
    'RRRRRRRRRRRR',
    '.RRRRRRRRRR.',
    '..RRRR.RRR..',
    '............',
  ],
  melon: [
    '......oo....',
    '.....oo.....',
    '..gGgGgGg...',
    '.gGgGgGgGg..',
    'gGgGgGgGgGg.',
    'gGgGgGgGgGg.',
    'gGgGgGgGgGg.',
    'gGgGgGgGgGg.',
    '.gGgGgGgGg..',
    '..gGgGgGg...',
    '............',
    '............',
  ],
  galaxian: [
    '.....RR.....',
    '.....RR.....',
    'Y...RRRR...Y',
    'YY.RRRRRR.YY',
    'YYYRRRRRRYYY',
    'YYYYRRRRYYYY',
    '.YYYYRRYYYY.',
    '..YYYRRYYY..',
    '...YYRRYY...',
    '....YRRY....',
    '.....RR.....',
    '.....BB.....',
  ],
  bell: [
    '.....YY.....',
    '....YYYY....',
    '...YYYYYY...',
    '..YYYYYYYY..',
    '..YYYYYYYY..',
    '.YYYYYYYYYY.',
    '.YYYYYYYYYY.',
    '.YYYYYYYYYY.',
    'YYYYYYYYYYYY',
    'LLLLLLLLLLLL',
    '....LLLL....',
    '....LLLL....',
  ],
  key: [
    '....CCCC....',
    '...CC..CC...',
    '...CC..CC...',
    '....CCCC....',
    '.....CC.....',
    '.....CC.....',
    '.....CCC....',
    '.....CC.....',
    '.....CCC....',
    '.....CC.....',
    '.....CCC....',
    '............',
  ],
};

export function spriteMaps(): Record<string, string[]> {
  return { ...FRUITS, ghost0: GHOST_BODY[0], ghost1: GHOST_BODY[1] };
}

const cache = new Map<string, HTMLCanvasElement>();

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function paint(ctx: CanvasRenderingContext2D, rows: string[], tint?: string): void {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const col = ch === 'B' && tint ? tint : P[ch] ?? '';
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function fruitSprite(kind: FruitKind): HTMLCanvasElement {
  const key = `fruit:${kind}`;
  let s = cache.get(key);
  if (!s) {
    const [c, ctx] = make(12, 12);
    paint(ctx, FRUITS[kind]);
    cache.set(key, (s = c));
  }
  return s;
}

/** Ghost body + eyes. `look` = 'normal' | 'fright' | 'flash' | 'eyes'. */
export function ghostSprite(name: GhostName, frame: 0 | 1, dir: Dir, look: 'normal' | 'fright' | 'flash' | 'eyes'): HTMLCanvasElement {
  const key = `ghost:${name}:${frame}:${dir}:${look}`;
  let s = cache.get(key);
  if (s) return s;
  const [c, ctx] = make(14, 14);
  if (look !== 'eyes') {
    const body = look === 'normal' ? GHOST_COLORS[name] : look === 'fright' ? FRIGHT_BLUE : '#ffffff';
    paint(ctx, GHOST_BODY[frame], body);
  }
  if (look === 'normal' || look === 'eyes') {
    const [ox, oy] = EYE_OFFSETS[dir];
    for (const ex of [2, 8]) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex + ox, 3 + oy, 4, 5);
      ctx.fillRect(ex + ox - 1, 4 + oy, 6, 3);
      ctx.fillStyle = '#2121ff';
      ctx.fillRect(ex + 1 + ox * 2, 5 + oy * 2, 2, 2);
    }
  } else {
    // frightened face: two eyes and a wavy mouth
    ctx.fillStyle = look === 'fright' ? FRIGHT_FACE : '#ff0000';
    ctx.fillRect(4, 5, 2, 2);
    ctx.fillRect(8, 5, 2, 2);
    for (let i = 0; i < 12; i++) ctx.fillRect(1 + i, 9 + (i % 4 === 1 || i % 4 === 2 ? 1 : 0), 1, 1);
  }
  cache.set(key, c);
  return c;
}

/** Pac-Man as a 13px disc with a mouth; `open` 0..1 is the mouth angle fraction. */
export function drawPac(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Dir, open: number, radius = 6.5, color = PAC_YELLOW): void {
  const base = dir === 'right' ? 0 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : -Math.PI / 2;
  const half = (open * Math.PI) / 2 * 0.9;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (half <= 0.01) {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, base + half, base - half + Math.PI * 2);
    ctx.closePath();
  }
  ctx.fill();
}
