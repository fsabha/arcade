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

// 1:1 pixel art (the chicken needs more definition than the 2600's wide pixels).
const MAPS: Record<string, string[]> = {
  chicken0: [
    '....RR......',
    '...RRR......',
    '...YYYY.....',
    '..YYKYYO....',
    '..YYYYYOO...',
    '.YYYYYYY....',
    'YYyYYYYY....',
    'YYYYYYYy....',
    '.yYYYYYy....',
    '..yYYYy.....',
    '...OO.O.....',
    '..OO..OO....',
  ],
  chicken1: [
    '....RR......',
    '...RRR......',
    '...YYYY.....',
    '..YYKYYO....',
    '..YYYYYOO...',
    '.YYYYYYY....',
    'YYyYYYYY....',
    'YYYYYYYy....',
    '.yYYYYYy....',
    '..yYYYy.....',
    '...O..O.....',
    '...OO.OO....',
  ],
  chickenHit: [
    '............',
    '..O.........',
    '...O...RR...',
    '....YYYYRR..',
    '..YYYYYYYK..',
    '.YYYYYYYYYO.',
    'yYYYYYYYYYOO',
    '.yyYYYYYy...',
    '....yyyy....',
    '..O......O..',
    '.O........O.',
    '............',
  ],
  // vehicles: B = body (tinted per lane), drawn facing right
  car: [
    '....BBBBBBB.....',
    '...BGGGBGGGB....',
    '..BBGGGBGGGBB...',
    '.BBBBBBBBBBBBBB.',
    'BBBBBBBBBBBBBBBW',
    'BBBBBBBBBBBBBBBB',
    '.kkk.......kkk..',
    '.kkk.......kkk..',
  ],
  truck: [
    '........................BBBBBBB.',
    '.BBBBBBBBBBBBBBBBBBBBBB.BGGGGBB.',
    '.BBBBBBBBBBBBBBBBBBBBBB.BGGGGBBW',
    '.BBBBBBBBBBBBBBBBBBBBBB.BBBBBBBB',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    '..kkk....kkk.........kkk..kkk...',
    '..kkk....kkk.........kkk..kkk...',
    '................................',
  ],
};

export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Build a sprite; `tint` replaces body chars (B) and `flip` mirrors horizontally. */
export function sprite(name: string, tint = '', flip = false): HTMLCanvasElement {
  const key = `${name}:${tint}:${flip ? 'L' : 'R'}`;
  let s = cache.get(key);
  if (s) return s;
  const rows = MAPS[name];
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
