import type { CarColor } from './traffic';

const PALETTE: Record<string, string> = {
  K: '#101010', // near black
  k: '#4e4e58', // tyre tread highlight
  W: '#f4f4f4', // white
  S: '#c3c9cf', // silver
  G: '#7d8791', // grey
  R: '#ff3b3b', // tail light
  r: '#7a1a1a', // tail light off
  Y: '#ffe14a', // yellow
  O: '#ff9b2a', // orange
  '.': '',
};

const BODY: Record<CarColor | 'night', [string, string]> = {
  red: ['#d8322e', '#8f1f1c'],
  blue: ['#2f6fd8', '#1d478c'],
  green: ['#3fae4a', '#277030'],
  yellow: ['#e8c23a', '#9a7f22'],
  white: ['#ececec', '#b0b0b0'],
  purple: ['#9a4fd6', '#5f2f87'],
  night: ['#0b0b0e', '#070709'],
};

// Atari 2600 look: 8 "wide" pixels (each doubled horizontally), single body colour,
// black tyres at the corners with an animated tread, red tail lights.
// B = body, b = body shade, R = tail light, T = brake light, K/k = tyre (tread frames swap them)
const MAPS: Record<string, string[]> = {
  car: [
    '......BBBB......',
    '....BBBBBBBB....',
    '..BBBBBBBBBBBB..',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'KKKKBBBBBBBBKKKK',
    'kkkkRRbbbbRRkkkk',
    'KKKK........KKKK',
    'kkkk........kkkk',
  ],
  player: [
    '......BBBB......',
    '....BBBBBBBB....',
    '..BBBBBBBBBBBB..',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'KKKKBBBBBBBBKKKK',
    'kkkkTTbbbbTTkkkk',
    'KKKK........KKKK',
    'kkkk........kkkk',
  ],
  flag: [
    'KWWKKWWK',
    'KWWKKWWK',
    'KKWWKKWW',
    'KKWWKKWW',
    'KWWKKWWK',
    'KWWKKWWK',
    'K.......',
    'K.......',
    'K.......',
    'K.......',
  ],
  carIcon: [
    '...BB...',
    '..BBBB..',
    'BBBBBBBB',
    'KKBBBBKK',
    'KK....KK',
  ],
};

export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}

const cache = new Map<string, HTMLCanvasElement>();

function colorFor(ch: string, body: [string, string], night: boolean, brake: boolean, frame: number): string {
  if (ch === 'B') return body[0];
  if (ch === 'b') return body[1];
  if (ch === 'T') return brake ? PALETTE.R : PALETTE.r;
  if (ch === 'R') return PALETTE.R;
  // tyre tread: the two shades swap every frame so the wheels look like they roll
  if (ch === 'K') return night ? PALETTE.K : frame ? PALETTE.k : PALETTE.K;
  if (ch === 'k') return night ? PALETTE.K : frame ? PALETTE.K : PALETTE.k;
  return PALETTE[ch] ?? '';
}

function build(name: string, body: [string, string], night: boolean, brake: boolean, frame = 0): HTMLCanvasElement {
  const rows = MAPS[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const col = colorFor(rows[y][x], body, night, brake, frame);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Traffic car sprite in the given colour; `night` keeps only lights visible. */
export function carSprite(color: CarColor, night: boolean, frame = 0): HTMLCanvasElement {
  const key = `car:${night ? 'night' : color}:${frame}`;
  let s = cache.get(key);
  if (!s) {
    s = build('car', BODY[night ? 'night' : color], night, false, frame);
    cache.set(key, s);
  }
  return s;
}

export function playerSprite(brake: boolean, frame = 0): HTMLCanvasElement {
  const key = `player:${brake ? 'b' : 'n'}:${frame}`;
  let s = cache.get(key);
  if (!s) {
    s = build('player', BODY.white, false, brake, frame);
    cache.set(key, s);
  }
  return s;
}

export function sprite(name: 'flag' | 'carIcon'): HTMLCanvasElement {
  let s = cache.get(name);
  if (!s) {
    s = build(name, BODY.white, false, false);
    cache.set(name, s);
  }
  return s;
}
