const PALETTE: Record<string, string> = {
  Y: '#f2d23c', // player sub
  y: '#a88f22',
  K: '#101010',
  W: '#f4f4f4',
  S: '#8aa0a8', // shark
  s: '#5f727a',
  G: '#6fbf5a', // enemy sub
  g: '#3f7f34',
  D: '#4a4f5a', // patrol sub
  d: '#2a2e36',
  P: '#f0a070', // diver skin
  p: '#e8e8f4', // diver suit (pale, readable against the water)
  R: '#ff3b3b',
  '.': '',
};

const MAPS: Record<string, string[]> = {
  // facing right
  sub: [
    '.......YY.......',
    '.......YY.......',
    '....YYYYYYYY....',
    '..YYYYYYYYYYYYY.',
    '.YYYYYYYYYYYYYYY',
    '.YYYKKYYYYYYYYY.',
    '..YYYYYYYYYYYY..',
    '....yy....yy....',
  ],
  esub: [
    '.......GG.......',
    '.......GG.......',
    '....GGGGGGGG....',
    '..GGGGGGGGGGGGG.',
    '.GGGGGGGGGGGGGGG',
    '.GGGKKGGGGGGGGG.',
    '..GGGGGGGGGGGG..',
    '....gg....gg....',
  ],
  shark0: [
    '...............S',
    '.........SS...S.',
    '.SSSSSSSSSSSSSS.',
    'SSSSSSSSSSSSSSSS',
    'SSSKSSSSSSSSSSS.',
    '.SSSSSSSSSSSS...',
    '....SS..........',
    '.....ss.........',
  ],
  shark1: [
    '.........SS.....',
    '.SSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSS.',
    'SSSKSSSSSSSSSSSS',
    '.SSSSSSSSSSSS..S',
    '....SS..........',
    '...ss...........',
    '................',
  ],
  diver0: [
    '...PP...',
    '...PP...',
    '..pppp..',
    '.p.pp.p.',
    '...pp...',
    '..p..p..',
    '.p....p.',
    '........',
  ],
  diver1: [
    '...PP...',
    '...PP...',
    '..pppp..',
    '.pppppp.',
    '...pp...',
    '...pp...',
    '..p..p..',
    '.p....p.',
  ],
  patrol: [
    '..........DDD...........',
    '..........DDD...........',
    '.......DDDDDDDDDD.......',
    '....DDDDDDDDDDDDDDDDD...',
    '..DDDDDDDDDDDDDDDDDDDDD.',
    'DDDDDDDDDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDDDDDDD.',
    '...dddddddddddddddddd...',
  ],
  life: [
    '...YY...',
    '.YYYYYY.',
    'YYYYYYYY',
    '.YYYYYY.',
    '..y..y..',
  ],
  diverIcon: [
    '.PP.',
    '.pp.',
    'pppp',
    '.pp.',
    'p..p',
  ],
};

export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}

const cache = new Map<string, HTMLCanvasElement>();

function build(name: string, flip: boolean): HTMLCanvasElement {
  const rows = MAPS[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  const w = rows[0].length;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < w; x++) {
      const col = PALETTE[rows[y][x]] ?? '';
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}

export type SpriteName = keyof typeof MAPS;

/** `flip` mirrors horizontally (sprites are drawn facing right). */
export function sprite(name: string, flip = false): HTMLCanvasElement {
  const key = `${name}:${flip ? 'L' : 'R'}`;
  let s = cache.get(key);
  if (!s) {
    s = build(name, flip);
    cache.set(key, s);
  }
  return s;
}
