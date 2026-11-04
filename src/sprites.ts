const PALETTE: Record<string, string> = {
  Y: '#f4d03f', // chicken body
  y: '#c9a227',
  O: '#e8832a', // beak / legs
  R: '#d83a2a', // comb
  K: '#101010',
  W: '#f4f4f4',
  k: '#303030', // tyres
  G: '#8a8a8a', // glass
  '.': '',
};

// Written at Atari resolution (1 char = one wide pixel), expanded 2:1 horizontally.
const ATARI: Record<string, string[]> = {
  chicken0: [
    '..RR..',
    '.YYYO.',
    '.YYYO.',
    'YYYYY.',
    'yYYYY.',
    '.YYYy.',
    '..OO..',
    '.O..O.',
  ],
  chicken1: [
    '..RR..',
    '.YYYO.',
    '.YYYO.',
    'YYYYY.',
    'yYYYY.',
    '.YYYy.',
    '..OO..',
    '..O.O.',
  ],
  chickenHit: [
    '......',
    '.O..R.',
    '..YYYY',
    'YYYYYY',
    'yYYYyO',
    '..YY..',
    'O....O',
    '......',
  ],
  // vehicles: B = body (tinted per lane)
  car: [
    '..BBBB..',
    '.BGGGGB.',
    'BBBBBBBB',
    'kBBBBBBk',
  ],
  truck: [
    '.BBBBBBBBBBBB.GG',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'kkBBBBBkkBBBBkkB',
    '.kk....kk....kk.',
  ],
};

function wide(rows: string[]): string[] {
  return rows.map((r) => r.split('').map((c) => c + c).join(''));
}

export function spriteMaps(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k of Object.keys(ATARI)) out[k] = wide(ATARI[k]);
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Build a sprite; `tint` replaces body chars (B) and `flip` mirrors horizontally. */
export function sprite(name: string, tint = '', flip = false): HTMLCanvasElement {
  const key = `${name}:${tint}:${flip ? 'L' : 'R'}`;
  let s = cache.get(key);
  if (s) return s;
  const rows = wide(ATARI[name]);
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const col = ch === 'B' ? tint : PALETTE[ch] ?? '';
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? rows[y].length - 1 - x : x, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

/** One colour per lane, like the cartridge. */
export const LANE_COLORS = [
  '#f0e442', '#e69f00', '#d55e00', '#cc79a7', '#56b4e9',
  '#7ec850', '#00a3a3', '#b48cff', '#ff6f91', '#c8c8c8',
];
