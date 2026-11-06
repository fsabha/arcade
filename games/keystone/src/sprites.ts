/** Pixel art at 1:1 (16 px wide actors). The 2600 drew 8 wide pixels; this is the same silhouette with twice the detail. */
const PALETTE: Record<string, string> = {
  B: '#3048c8', // Kelly's uniform
  b: '#203090',
  W: '#f0f0f0', // helmet / Harry's stripes
  w: '#b8c0c8',
  F: '#f0c0a0', // skin
  f: '#c89070',
  H: '#202020', // boots, Harry's stripes, mask
  Y: '#f0d040', // badge, biplane
  y: '#c09020',
  S: '#b8c0c8', // shopping cart
  s: '#707880',
  R: '#e04040', // beach ball
  G: '#40c040',
  K: '#905020', // radio
  k: '#603010',
  M: '#c89860', // moneybag
  m: '#a07040',
  T: '#804020', // suitcase
  t: '#5a2c14',
  '.': '',
};

const KELLY_HEAD = [
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WwWWWWWWwW...',
  '......FFFF......',
  '.....FFHHFF.....',
  '......FFFF......',
];
const KELLY_TORSO = [
  '.....BBBBBB.....',
  '....BBBBBBBB....',
  '...BBBBYBBBBB...',
  '..FBBBBBBBBBBF..',
  '..FBBBBBBBBBBF..',
  '....BBBBBBBB....',
  '....bbbbbbbb....',
];
const HARRY_HEAD = [
  '.....HHHHHH.....',
  '....HHHHHHHH....',
  '....WWWWWWWW....',
  '......FFFF......',
  '....HHFFFFHH....',
  '......FFFF......',
  '......fFFf......',
];
const HARRY_TORSO = [
  '.....WWWWWW.....',
  '....HHHHHHHH....',
  '...WWWWWWWWWW...',
  '..FHHHHHHHHHHF..',
  '..FWWWWWWWWWWF..',
  '....HHHHHHHH....',
  '....WWWWWWWW....',
];

const MAPS: Record<string, string[]> = {
  stand: [...KELLY_HEAD, ...KELLY_TORSO,
    '....BBBBBBBB....', '....BBBBBBBB....', '....BBB..BBB....', '....BBB..BBB....', '....BBB..BBB....', '....BBB..BBB....', '...HHHH..HHHH...', '...HHHH..HHHH...'],
  run0: [...KELLY_HEAD, ...KELLY_TORSO,
    '....BBBBBBBB....', '...BBBBBBBBBB...', '..BBB......BBB..', '.BBB........BBB.', 'BBB..........BBB', 'BB............BB', 'HHH..........HHH', 'HHH..........HHH'],
  run1: [...KELLY_HEAD, ...KELLY_TORSO,
    '....BBBBBBBB....', '.....BBBBBB.....', '.....BBBBB......', '......BBBB......', '......BBB.......', '......BBB.......', '.....HHHH.......', '.....HHHH.......'],
  jump: [
    '......WWWW......', '.....WWWWWW.....', '....WWWWWWWW....', '...WwWWWWWWwW...', '......FFFF......', '.....FFHHFF.....', '......FFFF......',
    'F....BBBBBB....F', 'FB..BBBBBBBB..BF', '.BBBBBBBYBBBBBB.', '..BBBBBBBBBBBB..', '....BBBBBBBB....', '....bbbbbbbb....', '...BBBBBBBBBB...',
    '..BBB......BBB..', '.HHH........HHH.', '.HHH........HHH.', '................', '................', '................', '................', '................'],
  duck: [
    '......WWWW......', '.....WWWWWW.....', '....WWWWWWWW....', '...WwWWWWWWwW...', '......FFFF......', '.....FFHHFF.....',
    '..BBBBBFFFFBBBB.', '.BBBBBBBYBBBBBB.', '.BBBBBBBBBBBBBB.', '..BBB......BBB..', '.HHHH......HHHH.', '.HHHH......HHHH.'],
  ko: [
    '..................WWWW..', '.................WWWWWW.', 'BBBBBBBBBBBBBBB..FFHHFF.', 'BBBBBBBBBBBBBBBBFFFFFF..', 'bbbbbbBBBBBBBBBB.FFFF...',
    'HHHH..BBBBBBBBB.........', 'HHHH....................', '........................'],
  harry0: [...HARRY_HEAD, ...HARRY_TORSO,
    '....HHHHHHHH....', '...WWWWWWWWWW...', '..HHH......HHH..', '.WWW........WWW.', 'HHH..........HHH', 'WW............WW', 'HHH..........HHH', 'HHH..........HHH'],
  harry1: [...HARRY_HEAD, ...HARRY_TORSO,
    '....HHHHHHHH....', '.....WWWWWW.....', '.....HHHHH......', '......WWWW......', '......HHH.......', '......WWW.......', '.....HHHH.......', '.....HHHH.......'],
  cart: [
    '..............SS', 'SSSSSSSSSSSS..S.', 'S..S..S..S..SS..', 'S..S..S..S..S...', 'S..S..S..S..S...', 'SSSSSSSSSSSSS...', '.SSSSSSSSSSS....',
    '...ss....ss.....', '..ssss..ssss....', '...ss....ss.....'],
  ball: ['..RRWW..', '.RRRWWW.', 'RRRRWWWW', 'WWWWRRRR', 'WWWWRRRR', '.WWWRRR.', '..WWRR..', '........'],
  radio: ['....KKKK....', '..KKKKKKKK..', '.KKkkkkkkKK.', 'KKkWWWWWWkKK', 'KKkWWWWWWkKK', 'KKkkkkkkkkKK', 'KKKYYKKKYYKK', 'KKKKKKKKKKKK', '.KK......KK.', '............'],
  plane: ['YYYYYYYYYYYY....', '......YY.......y', 'YYYYYYYYYYYYYYYy', '..YYYYYYYY..yy..', 'YY....YY........', 'YYYY............'],
  bag: ['...MM...', '..mMMm..', '.MMMMMM.', 'MMMMMMMM', 'MMmMMmMM', 'MMMMMMMM', '.MMMMMM.', '..MMMM..'],
  case: ['...tt...', '.TTTTTT.', 'TTTTTTTT', 'TMMMMMMT', 'TMMMMMMT', 'TMMMMMMT', 'TTTTTTTT', '........'],
  kop: ['..WWWW..', '.WWWWWW.', '..FFFF..', '.BBBBBB.', 'BBBYBBBB', '.BBBBBB.', '.HH..HH.', '........'],
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
  c.width = w;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      const sx = flip ? w - 1 - x : x;
      ctx.fillRect(sx, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}
