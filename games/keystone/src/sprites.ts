import { PX } from './config';

const PALETTE: Record<string, string> = {
  B: '#3048c8', // Kelly's uniform
  b: '#203090',
  W: '#f0f0f0', // helmet / Harry's stripes
  F: '#f0c0a0', // skin
  H: '#202020', // boots, Harry's stripes, mask
  Y: '#f0d040', // badge, biplane
  y: '#c09020',
  S: '#b0b8c0', // shopping cart
  s: '#707880',
  R: '#e04040', // beach ball
  G: '#40c040',
  K: '#905020', // radio
  k: '#603010',
  M: '#c89860', // moneybag
  m: '#a07040',
  T: '#804020', // suitcase
  '.': '',
};

const KELLY_HEAD = ['..WWWW..', '.WWWWWW.', '..FFFF..', '..FHFF..', '..FFFF..'];
const KELLY_BODY = ['..BBBB..', '.BBBBBB.', 'BBBYBBBB', 'FBBBBBBF', '..BBBB..', '..bbbb..'];
const HARRY_HEAD = ['..HHHH..', '.HWWWWH.', '..FFFF..', '.HHFFHH.', '..FFFF..'];
const HARRY_BODY = ['..WWWW..', '.HHHHHH.', 'WWWWWWWW', 'FHHHHHHF', '..WWWW..', '..HHHH..'];

const MAPS: Record<string, string[]> = {
  stand: [...KELLY_HEAD, ...KELLY_BODY, '..BBBB..', '..BBBB..', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '.HHH.HHH', '.HHH.HHH', '........'],
  run0: [...KELLY_HEAD, ...KELLY_BODY, '..BBBB..', '.BBBBBB.', '.BB..BB.', 'BB....BB', 'BB....BB', 'B......B', 'B......B', 'HH....HH', 'HH....HH', '........', '........'],
  run1: [...KELLY_HEAD, ...KELLY_BODY, '..BBBB..', '..BBBB..', '..BBBB..', '...BBB..', '...BB...', '...BB...', '...BB...', '..HHH...', '..HHH...', '........', '........'],
  jump: ['..WWWW..', '.WWWWWW.', '..FFFF..', '..FHFF..', '..FFFF..', 'F.BBBB.F', 'BBBBBBBB', '.BBYBBB.', '..BBBB..', '..bbbb..', '.BBBBBB.', 'BB....BB', 'HH....HH', '........', '........', '........', '........', '........', '........', '........', '........', '........'],
  duck: ['..WWWW..', '.WWWWWW.', '..FFFF..', '..FHFF..', '.BBFFBB.', 'BBBBBBBB', 'BBBYBBBB', '.BBBBBB.', '.BB..BB.', '.BB..BB.', 'HHH..HHH', '........'],
  ko: ['......WW....', '.....WWWW...', '......FFFF..', 'BBBBBBBFHF..', 'BBBBBBBBFF..', 'bbbbBBBB....', 'HH..........', '............'],
  harry0: [...HARRY_HEAD, ...HARRY_BODY, '..WWWW..', '.HHHHHH.', '.WW..WW.', 'HH....HH', 'WW....WW', 'H......H', 'W......W', 'HH....HH', 'HH....HH', '........', '........'],
  harry1: [...HARRY_HEAD, ...HARRY_BODY, '..WWWW..', '..HHHH..', '..WWWW..', '...HHH..', '...WW...', '...HH...', '...WW...', '..HHH...', '..HHH...', '........', '........'],
  cart: ['......SS', 'SSSSSS.S', 'S.S.S.SS', 'S.S.S.S.', 'SSSSSSS.', '.SSSSSS.', '..s..s..', '.sss.sss', '.sss.sss', '........'],
  ball: ['.RW.', 'RRWW', 'WWRR', '.WR.', '....', '....', '....', '....'],
  radio: ['..KKKK..', '.KKKKKK.', 'KKkkkkKK', 'KkWWWWkK', 'KkWWWWkK', 'KKkkkkKK', 'KKKYYKKK', 'KKKKKKKK', '.KK..KK.', '........'],
  plane: ['YYYYYY..', '...Y...y', 'YYYYYYYY', '.YYYY.y.', 'Y..Y....', 'YY......'],
  bag: ['.MM.', 'mMMm', 'MMMM', 'MMMM', 'MmmM', 'MMMM', '.MM.', '....'],
  case: ['.TT.', 'TTTT', 'TMMT', 'TMMT', 'TMMT', 'TTTT', '....', '....'],
  kop: ['.WW.', 'WWWW', '.FF.', 'BBBB', 'BBBB', '.BB.', 'H..H', '....'],
};

export function spriteMaps(): Record<string, string[]> {
  return MAPS;
}

const cache = new Map<string, HTMLCanvasElement>();

export function sprite(name: string, flip = false): HTMLCanvasElement {
  const key = `${name}|${flip ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = MAPS[name];
  if (!rows) throw new Error(`unknown sprite ${name}`);
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * PX;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      const sx = flip ? w - 1 - x : x;
      ctx.fillRect(sx * PX, y, PX, 1);
    }
  });
  cache.set(key, c);
  return c;
}
