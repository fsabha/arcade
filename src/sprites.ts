import { BRIDGE_WIDTH, BRIDGE_H } from './config';

const PALETTE: Record<string, string> = {
  Y: '#f6d44a', // yellow
  y: '#c9a92c', // dark yellow
  O: '#e8832a', // orange
  K: '#1b1b1b', // near black
  W: '#f4f4f4', // white
  S: '#c3c9cf', // silver
  G: '#7d8791', // gray
  D: '#444b52', // dark gray
  R: '#e23d3d', // red
  r: '#9c2424', // dark red
  L: '#9ad8f7', // light blue (glass)
  M: '#8b5a2b', // brown
  E: '#5a3a1a', // dark brown
  T: '#2f6b2f', // tree dark
  g: '#5bbd5b', // tree light
  '.': '',
};

const MAPS: Record<string, string[]> = {
  player: [
    '.......YY.......',
    '.......YY.......',
    '......YYYY......',
    '......YYYY......',
    '......YKKY......',
    '......YYYY......',
    '.....YYYYYY.....',
    '....YYYYYYYY....',
    '..YYYYYYYYYYYY..',
    'YYYYYYYYYYYYYYYY',
    'yYYYYYYYYYYYYYYy',
    '......yYYy......',
    '......yYYy......',
    '....YYYYYYYY....',
    '...YYYYyyYYYY...',
    '..yyy......yyy..',
  ],
  ship: [
    '..........WW....WW..............',
    '..........WW....WW..............',
    '........WWWWWWWWWWWWWWWW........',
    '....WWWWWWWWWWWWWWWWWWWWWWWW....',
    '..SSSSSSSSSSSSSSSSSSSSSSSSSSSS..',
    '.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    '..DDDDDDDDDDDDDDDDDDDDDDDDDDDD..',
  ],
  heli0: [
    '..SSSSSSSSSSSS..',
    '.......KK.......',
    '......KKKK......',
    '...GGGGGGGGGG...',
    '..GGGGLLGGGGGGG.',
    '.GGGGGLLGGGGGGGG',
    '.GGGGGGGGGGGGGG.',
    '..GGGGGGGGGG....',
    '....GG..GG......',
    '...GGGGGGGG.....',
    '....KK..KK......',
    '...KKKKKKKK.....',
  ],
  heli1: [
    '......SSSS......',
    '.......KK.......',
    '......KKKK......',
    '...GGGGGGGGGG...',
    '..GGGGLLGGGGGGG.',
    '.GGGGGLLGGGGGGGG',
    '.GGGGGGGGGGGGGG.',
    '..GGGGGGGGGG....',
    '....GG..GG......',
    '...GGGGGGGG.....',
    '....KK..KK......',
    '...KKKKKKKK.....',
  ],
  jet: [
    '....WW..........',
    '....WWW.........',
    'WWWWWWWWWWWWW...',
    'SSSSSSSSSSSSSSWW',
    'SSSSSSSSSSSSSSWW',
    'WWWWWWWWWWWWW...',
    '....WWW.........',
    '....WW..........',
  ],
  fuel: [
    '....RRRRRRRR....',
    '..RRRRRRRRRRRR..',
    '.RRRRWWWWWWRRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRWWWWWWWWRRR.',
    '.RRRRWWWWWWRRRR.',
    '..RRRRRRRRRRRR..',
    '....rrrrrrrr....',
    '.....rrrrrr.....',
  ],
  tree: [
    '.TTTT.',
    'TTgTTT',
    'TgggTT',
    'TTgTTT',
    '.TTTT.',
    '..EE..',
  ],
  life: [
    '...Y...',
    '...Y...',
    '..YYY..',
    'YYYYYYY',
    '..YYY..',
    '.YYYYY.',
    'Y.....Y',
  ],
};

function bridgeMap(): string[] {
  const rows: string[] = [];
  for (let r = 0; r < BRIDGE_H; r++) {
    let s = '';
    for (let c = 0; c < BRIDGE_WIDTH; c++) {
      let ch: string;
      if (r === 0 || r === BRIDGE_H - 1) ch = c % 4 === 3 ? 'K' : 'D';
      else if (r === 1 || r === BRIDGE_H - 2) ch = 'S';
      else if (r === 7 || r === 8) ch = (c % 12) < 6 ? 'Y' : 'G';
      else ch = 'G';
      if (c % 24 >= 10 && c % 24 <= 13 && r >= 2 && r <= BRIDGE_H - 3) ch = r % 2 === 0 ? 'M' : 'E';
      s += ch;
    }
    rows.push(s);
  }
  return rows;
}

const cache = new Map<string, HTMLCanvasElement>();

function build(map: string[]): HTMLCanvasElement {
  const h = map.length;
  const w = map[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let r = 0; r < h; r++) {
    const row = map[r];
    for (let x = 0; x < w; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, r, 1, 1);
    }
  }
  return c;
}

export function sprite(name: string): HTMLCanvasElement {
  let s = cache.get(name);
  if (s) return s;
  let map: string[];
  if (name === 'bridge') map = bridgeMap();
  else if (name === 'jetL') map = MAPS.jet.map((r) => r.split('').reverse().join(''));
  else map = MAPS[name];
  if (!map) throw new Error(`unknown sprite ${name}`);
  s = build(map);
  cache.set(name, s);
  return s;
}

/** Pixel map dimension check for tests. */
export function spriteMaps(): Record<string, string[]> {
  return { ...MAPS, bridge: bridgeMap() };
}
