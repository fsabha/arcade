// Atari 2600 style sprites.
//
// Maps are written at Atari resolution (one char = one 2600 pixel) and expanded
// horizontally 2:1 into "wide pixels", so an 8-char row becomes 16 canvas px.
// Colours are chosen per character, and every row uses its own shades to mimic
// the per-scanline colour changes the 2600 kernel did for each object.
// All sprites are drawn facing right; sprite(name, flip) mirrors them.

const PALETTE: Record<string, string> = {
  // player sub (yellow)
  L: '#fff6a0', // highlight
  Y: '#f2d23c', // hull
  y: '#c09a1e', // lower hull
  o: '#8a6a10', // keel
  // enemy sub (grey-green, dark tower)
  k: '#2c343a',
  E: '#b8ccb0',
  e: '#7e9c6c',
  u: '#4a6440',
  // surface patrol sub (long dark hull)
  D: '#4e5868',
  d: '#2e3542',
  n: '#171b24',
  // diver (pale pink wetsuit so it reads against the blue)
  H: '#f8b4a4', // head
  p: '#f6dcd0', // suit
  f: '#e07c6c', // flippers / arms
  // common
  K: '#101010',
  W: '#f4f4f4',
  '.': '',
};

/** Shark chars resolved from the level colour: A = body, B = belly, C = back/fins. */
const SHARK_KEYS = ['A', 'B', 'C'];

/** 2600-like colours the sharks cycle through from level to level. */
export const SHARK_COLORS = [
  '#4cb848', // green
  '#f0a030', // orange
  '#b060d8', // purple
  '#50a8f0', // light blue
  '#f070a8', // pink
  '#40d0c0', // cyan
  '#e05040', // red
  '#d0c850', // olive yellow
];

export function sharkColor(level: number): string {
  const i = Math.max(0, Math.floor(level) - 1) % SHARK_COLORS.length;
  return SHARK_COLORS[i];
}

// Written at Atari resolution (see top of file).
const ATARI: Record<string, string[]> = {
  // Player sub: periscope, conning tower, shaded hull, propeller at the stern.
  sub0: [
    '...L....',
    '...L....',
    '..LLL...',
    '..YYY...',
    '..LLLLL.',
    '.YYYYYYY',
    'KYYYYYYY',
    '.yyyyyy.',
    '..oooo..',
  ],
  sub1: [
    '...L....',
    '...L....',
    '..LLL...',
    '..YYY...',
    '..LLLLL.',
    'KYYYYYYY',
    '.YYYYYYY',
    '.yyyyyy.',
    '..oooo..',
  ],
  // Enemy sub: lower profile, grey-green hull, dark tower.
  esub0: [
    '....k...',
    '...kkk..',
    '...kkk..',
    '..EEEEE.',
    '.eeeeeee',
    'Keeeeeee',
    '.uuuuuu.',
    '..uuuu..',
  ],
  esub1: [
    '....k...',
    '...kkk..',
    '...kkk..',
    '..EEEEE.',
    'Keeeeeee',
    '.eeeeeee',
    '.uuuuuu.',
    '..uuuu..',
  ],
  // Shark: dorsal fin, forked tail (left), open jaw (right). 3 frames.
  shark0: [
    '.....C..',
    'C....CC.',
    'CC..CCCC',
    '.CCCAAAA',
    '..AAAAKA',
    'AAAAAAAA',
    '.BBBBB..',
    '...B.BBB',
  ],
  shark1: [
    '.....C..',
    '.....CC.',
    'C...CCCC',
    'CCCCAAAA',
    'C.AAAAKA',
    'AAAAAAAA',
    '.BBBBBBB',
    '...B....',
  ],
  shark2: [
    '.....C..',
    '.....CC.',
    '....CCCC',
    '.CCCAAAA',
    'CCAAAAKA',
    'CAAAAAAA',
    'C.BBBB..',
    '...B.BBB',
  ],
  // Diver swimming prone: head forward (right), arm reaching ahead, legs kicking behind.
  diver0: [
    '.......f',
    '..pppHHf',
    'ffpppHH.',
    '.fppp...',
    'f.......',
  ],
  diver1: [
    '........',
    '..pppHHf',
    'ffpppHHf',
    '..ppp...',
    '........',
  ],
  diver2: [
    'f.......',
    '.fpppHHf',
    'ffpppHH.',
    '..ppp..f',
    '........',
  ],
  // Surface patrol sub: long dark hull with a tower and periscope.
  patrol: [
    '.....k......',
    '....DDD.....',
    '....DDD.....',
    '.DDDDDDDDDD.',
    'DDDDDDDDDDDD',
    'KDDDDDDDDDDD',
    '.dddddddddd.',
    '..nnnnnnnn..',
  ],
  // HUD icons
  life: [
    '.L..',
    '.LL.',
    'LLLL',
    'YYYY',
    '.yy.',
  ],
  diverIcon: [
    '...f',
    'fpHH',
    'fpHH',
    '.p..',
  ],
};

/** Expand one Atari-resolution row into wide (2:1) pixels. */
function wide(row: string): string {
  let out = '';
  for (const ch of row) out += ch + ch;
  return out;
}

const MAPS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ATARI).map(([name, rows]) => [name, rows.map(wide)]),
);

/** Canvas-resolution maps (already expanded to wide pixels). */
export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}

function mix(hex: string, target: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  let out = '#';
  for (const shift of [16, 8, 0]) {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    out += Math.round(ca + (cb - ca) * t).toString(16).padStart(2, '0');
  }
  return out;
}

function colorFor(ch: string, tint: string | undefined): string {
  if (tint && SHARK_KEYS.includes(ch)) {
    if (ch === 'A') return tint;
    if (ch === 'B') return mix(tint, '#ffffff', 0.45);
    return mix(tint, '#000000', 0.42);
  }
  return PALETTE[ch] ?? '';
}

const cache = new Map<string, HTMLCanvasElement>();

function build(name: string, flip: boolean, tint: string | undefined): HTMLCanvasElement {
  const rows = MAPS[name];
  if (!rows) throw new Error(`unknown sprite ${name}`);
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < w; x++) {
      const col = colorFor(rows[y][x], tint);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}

export type SpriteName = keyof typeof ATARI;

/**
 * `flip` mirrors horizontally (sprites are drawn facing right).
 * `tint` is the shark body colour (see sharkColor); sprites are cached per colour.
 */
export function sprite(name: string, flip = false, tint?: string): HTMLCanvasElement {
  const key = `${name}:${flip ? 'L' : 'R'}:${tint ?? ''}`;
  let s = cache.get(key);
  if (!s) {
    s = build(name, flip, tint);
    cache.set(key, s);
  }
  return s;
}
