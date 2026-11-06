import { PX } from './config';

const PALETTE: Record<string, string> = {
  G: '#40d040', // frog
  g: '#208020',
  Y: '#f0e040', // eyes, yellow car
  R: '#e03030', // red
  W: '#f0f0f0',
  P: '#e060e0', // pink car / lady frog
  B: '#5080f0', // blue
  O: '#f09020', // orange / bulldozer
  K: '#202020',
  T: '#a06030', // log / turtle shell edge
  t: '#704018',
  S: '#60b040', // turtle shell
  s: '#a0e060',
  C: '#60a830', // crocodile
  c: '#305818',
  N: '#e0c040', // snake
  M: '#806040', // otter
  '.': '',
};

const MAPS: Record<string, string[]> = {
  // 8x8 cells drawn 2x => 16x16
  frogUp: ['Y.G..G.Y', 'YGGGGGGY', '.GgGGgG.', 'GGGGGGGG', 'G.GggG.G', 'G.GGGG.G', '.GG..GG.', 'GG....GG'],
  frogHop: ['Y.G..G.Y', 'YGGGGGGY', 'GGgGGgGG', 'G.GGGG.G', '..GggG..', '..GGGG..', '.GG..GG.', 'GG....GG'],
  frogHome: ['........', 'Y.G..G.Y', 'YGGGGGGY', '.GgGGgG.', 'GGGGGGGG', 'G.GGGG.G', '.GG..GG.', '........'],
  lady: ['P.P..P.P', 'PPPPPPPP', '.PWPPWP.', 'PPPPPPPP', 'P.PPPP.P', 'P.PPPP.P', '.PP..PP.', 'PP....PP'],
  splat: ['R..R..R.', '.R.RR.R.', '..RRRR..', 'RRRRRRRR', '..RRRR..', '.R.RR.R.', 'R..R..R.', '........'],
  drown: ['........', '..B..B..', '.B.BB.B.', '..BBBB..', '.BBBBBB.', '..BBBB..', '.B....B.', '........'],
  car: ['........', '..YYYY..', '.YYYYYY.', 'YYKYYKYY', 'YYYYYYYY', '.KK..KK.', '........', '........'],
  carPink: ['........', '..PPPP..', '.PPPPPP.', 'PPKPPKPP', 'PPPPPPPP', '.KK..KK.', '........', '........'],
  dozer: ['........', 'OO..OOO.', 'OOOOOOOO', 'OKOOOOKO', 'OOOOOOOO', 'KKKKKKKK', '.KKKKKK.', '........'],
  racer: ['........', '....W...', 'WWWWWWWW', 'WKWWWWKW', 'WWWWWWWW', 'KK....KK', '........', '........'],
  truck: ['................', '.WWWWWWWWWWRRR..', '.WWWWWWWWWWRRRR.', '.WWWWWWWWWWRKRR.', '.WWWWWWWWWWRRRR.', '.KK.KK.....KK.K.', '................', '................'],
  turtle: ['........', '..SSSS..', '.SsSsSS.', 'GSSssSSG', 'GSSSSSSG', '.SSSSSS.', '..G..G..', '........'],
  turtleDown: ['........', '........', '..SSSS..', '.SSsSSS.', '.SSSSSS.', '........', '........', '........'],
  logL: ['........', '.TTTTTTT', 'TttTTTTT', 'TTTTtTTT', 'TTtTTTTT', '.TTTTTTT', '........', '........'],
  logM: ['........', 'TTTTTTTT', 'TTTTtTTT', 'TtTTTTTT', 'TTTTTTtT', 'TTTTTTTT', '........', '........'],
  logR: ['........', 'TTTTTTT.', 'TTTtTTTT', 'TTTTTTTT', 'TtTTTtTT', 'TTTTTTT.', '........', '........'],
  crocBody: ['........', 'CCCCCCCC', 'CcCcCcCC', 'CCCCCCCC', 'CCcCcCcC', 'CCCCCCCC', '........', '........'],
  crocHead: ['........', 'CCCC....', 'CCCCCCC.', 'CWCCCCCC', 'CCCCCCC.', 'CCCC....', '........', '........'],
  crocJaws: ['CCCC....', 'CCCCCC..', 'CWCCCCCC', 'CCCC....', 'CCCCCC..', 'CCCCCCCC', '........', '........'],
  snake: ['................', '..NN....NN......', '.N..N..N..N..NK.', 'N....NN....NNNN.', '................', '................', '................', '................'],
  otter: ['........', '...MM...', '..MMMM..', '.MMKMMM.', 'MMMMMMMM', '.MMMMMM.', '........', '........'],
  fly: ['........', '..K..K..', '.KKKKKK.', '..KKKK..', '.KKKKKK.', '..K..K..', '........', '........'],
  homeCroc: ['........', '........', '.CCC....', 'CCCCCCC.', 'CWCCCCCC', 'CCCCCCC.', '.CCC....', '........'],
  life: ['.G..G.', 'GGGGGG', 'GgGGgG', 'GGGGGG', 'G.GG.G', 'GG..GG'],
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
  c.height = rows.length * PX;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = PALETTE[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      const sx = flip ? w - 1 - x : x;
      ctx.fillRect(sx * PX, y * PX, PX, PX);
    }
  });
  cache.set(key, c);
  return c;
}
