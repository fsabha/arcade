const COLORS: Record<string, string> = {
  squid: '#ff5fb4',
  crab: '#4ee0e0',
  octopus: '#ffd84a',
  player: '#5cf06a',
  ufo: '#ff4a4a',
  shield: '#5cf06a',
  explosion: '#ffffff',
  shot: '#ffffff',
  white: '#f4f4f4',
};

const MAPS: Record<string, string[]> = {
  squid0: [
    '...XX...',
    '..XXXX..',
    '.XXXXXX.',
    'XX.XX.XX',
    'XXXXXXXX',
    '..X..X..',
    '.X.XX.X.',
    'X.X..X.X',
  ],
  squid1: [
    '...XX...',
    '..XXXX..',
    '.XXXXXX.',
    'XX.XX.XX',
    'XXXXXXXX',
    '.X.XX.X.',
    'X......X',
    '.X....X.',
  ],
  crab0: [
    '..X.....X..',
    '...X...X...',
    '..XXXXXXX..',
    '.XX.XXX.XX.',
    'XXXXXXXXXXX',
    'X.XXXXXXX.X',
    'X.X.....X.X',
    '...XX.XX...',
  ],
  crab1: [
    '..X.....X..',
    'X..X...X..X',
    'X.XXXXXXX.X',
    'XXX.XXX.XXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '..X.....X..',
    '.X.......X.',
  ],
  octopus0: [
    '....XXXX....',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XXX..XX..XXX',
    'XXXXXXXXXXXX',
    '...XX..XX...',
    '..XX.XX.XX..',
    'XX........XX',
  ],
  octopus1: [
    '....XXXX....',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XXX..XX..XXX',
    'XXXXXXXXXXXX',
    '..XXX..XXX..',
    '.XX..XX..XX.',
    '..XX....XX..',
  ],
  player: [
    '......X......',
    '.....XXX.....',
    '.....XXX.....',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
  ],
  ufo: [
    '.....XXXXXX.....',
    '...XXXXXXXXXX...',
    '..XXXXXXXXXXXX..',
    '.XX.XX.XX.XX.XX.',
    'XXXXXXXXXXXXXXXX',
    '...XXX....XXX...',
    '....X......X....',
  ],
  explosion: [
    'X..X.....X..X',
    '.X..X...X..X.',
    '..X..X.X..X..',
    '...X.....X...',
    'XX.........XX',
    '...X.....X...',
    '..X..X.X..X..',
    '.X..X...X..X.',
  ],
  playerBoom0: [
    '....X....X......',
    '.X.....X....X...',
    '...X.XXXX.X.....',
    'X...XXXXXX...X..',
    '..X.XXXXXXX.....',
    '.XXXXXXXXXXX..X.',
    'XXXXXXXXXXXXXX..',
    'XXXXXXXXXXXXXXXX',
  ],
  playerBoom1: [
    '.......X........',
    '...X.......X....',
    '.....X.XXX...X..',
    '..X..XXXXXX.....',
    'X...XXXXXXX..X..',
    '..XXXXXXXXXX....',
    '.XXXXXXXXXXXXX.X',
    'XXXXXXXXXXXXXXXX',
  ],
  shot0: ['X..', '.X.', '..X', '.X.', 'X..', '.X.', '..X'],
  shot1: ['..X', '.X.', 'X..', '.X.', '..X', '.X.', 'X..'],
  ufoBoom: [
    'X.X..X.X..X.X.X.',
    '.X.XX.X.XX.X.X..',
    'X..X.XX.X.X.X.X.',
    '.XX.X..X.X.XX..X',
    'X.X.XX.X..X.X.X.',
    '.X..X.X.XX.X..X.',
    'X.X.X.X.X.X.X.X.',
  ],
};

const cache = new Map<string, HTMLCanvasElement>();

function build(map: string[], color: string): HTMLCanvasElement {
  const h = map.length;
  const w = map[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  for (let r = 0; r < h; r++) {
    for (let x = 0; x < w; x++) if (map[r][x] === 'X') ctx.fillRect(x, r, 1, 1);
  }
  return c;
}

/** Returns a cached canvas for the sprite; color defaults by sprite family. */
export function sprite(name: string, color?: string): HTMLCanvasElement {
  const family = name.replace(/[01]$/, '').replace(/Boom$/, '');
  const col = color ?? COLORS[family] ?? COLORS.white;
  const key = `${name}|${col}`;
  let s = cache.get(key);
  if (s) return s;
  const map = MAPS[name];
  if (!map) throw new Error(`unknown sprite ${name}`);
  s = build(map, col);
  cache.set(key, s);
  return s;
}

export function spriteColor(family: string): string {
  return COLORS[family] ?? COLORS.white;
}

export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}
