import { PX } from './config';

const PALETTE: Record<string, string> = {
  P: '#e04040', // parka
  p: '#a02828',
  F: '#f0c0a0', // face
  H: '#303030', // hair / boots / outlines
  B: '#3860c8', // trousers
  W: '#f0f0f0', // goose body / clam shell
  w: '#c0c8d0',
  O: '#f0a020', // beak / crab
  o: '#c07010',
  G: '#40b040', // fish
  g: '#208020',
  K: '#a06030', // bear
  k: '#704018',
  '.': '',
};

const BAILEY_HEAD = ['...HHH..', '..HHHHH.', '..FFFFH.', '..FFFF..', '...FF...'];
const BAILEY_BODY = ['..PPPP..', '.PPPPPP.', 'PPPpPPPP', 'FPPPPPPF', '..PPPP..', '..pppp..'];

const MAPS: Record<string, string[]> = {
  stand: [...BAILEY_HEAD, ...BAILEY_BODY, '..BBBB..', '..BBBB..', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '..BB.BB.', '.HHH.HHH', '.HHH.HHH', '........'],
  run0: [...BAILEY_HEAD, ...BAILEY_BODY, '..BBBB..', '.BBBBBB.', '.BB..BB.', 'BB....BB', 'BB....BB', 'BB....BB', 'B......B', 'B......B', 'HH....HH', 'HH....HH', '........', '........', '........'],
  run1: [...BAILEY_HEAD, ...BAILEY_BODY, '..BBBB..', '..BBBB..', '..BBBB..', '...BBB..', '...BB...', '...BB...', '...BB...', '...BB...', '..HHH...', '..HHH...', '........', '........', '........'],
  jump: ['...HHH..', '..HHHHH.', '..FFFFH.', '..FFFF..', '...FF...', 'F.PPPP.F', 'PPPPPPPP', '.PPpPPP.', '..PPPP..', '..pppp..', '.BBBBBB.', 'BB....BB', 'HH....HH', '........', '........', '........', '........', '........', '........', '........', '........', '........', '........', '........'],
  splash: ['........', '........', '........', '........', '........', '........', '........', '........', '........', '........', '........', '........', '...HHH..', '..HHHHH.', '..FFFFH.', 'F.FFFF.F', 'PP.FF.PP', '.PPPPPP.', '..PPPP..', '........', '........', '........', '........', '........'],
  goose0: ['......W.', '....WWWO', '.WWWWWW.', 'WWWWWWW.', '.WWWWW..', '..W..W..'],
  goose1: ['......W.', '.W..WWWO', '.WWWWWW.', '.WWWWWW.', '..WWWW..', '..W..W..'],
  crab: ['O......O', '.O.OO.O.', '.OOOOOO.', 'OOoOOoOO', 'OOOOOOOO', 'O.O..O.O'],
  clam0: ['........', '..wwww..', '.wWWWWw.', 'wWWWWWWw', '.wwwwww.', '........'],
  clam1: ['..wwww..', '.wWWWWw.', 'w......w', 'wWWWWWWw', '.wwwwww.', '........'],
  fish: ['..GGG..G', '.GGGGGGG', 'GGgGGGG.', '.GGGGGGG', '..GGG..G', '........'],
  bear0: ['....KKKK........', '...KKkKKK.......', '...KKKKKKKKKKK..', '....KKKKKKKKKKK.', '....KKKKKKKKKKKK', '....KKKKKKKKKKKK', '....KKK....KKK..', '....KKK....KKK..', '...kkk....kkk...'],
  bear1: ['....KKKK........', '...KKkKKK.......', '...KKKKKKKKKKK..', '....KKKKKKKKKKK.', '....KKKKKKKKKKKK', '....KKKKKKKKKKKK', '...KKK......KKK.', '..KKK........KKK', '..kkk........kkk'],
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
