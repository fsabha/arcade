/** Pixel art at 1:1. */
const PALETTE: Record<string, string> = {
  P: '#e060e0', // buggy body (the arcade's pink/purple)
  p: '#902890',
  W: '#f0f0f0',
  K: '#202020',
  G: '#a0a8b0', // wheels / tank
  g: '#606870',
  R: '#c07040', // rocks
  r: '#804820',
  Y: '#f0e040',
  B: '#50a0f0', // ufo
  b: '#2860a8',
  O: '#f09020',
  '.': '',
};

const MAPS: Record<string, string[]> = {
  buggy: [
    '..........KK............', '..........KK............', '.......PPPPPPPP.........', '......PPPPWWPPPP........', '.....PPPPPPPPPPPPPPP....',
    '....PPPPPPPPPPPPPPPPPP..', 'PPPPPPPPPPPPPPPPPPPPPPPP', 'pppppppppppppppppppppppp', '.GGGG....GGGG......GGGG.', 'GGggGG..GGggGG....GGggGG',
    'GgKKgG..GgKKgG....GgKKgG', 'GGggGG..GGggGG....GGggGG', '.GGGG....GGGG......GGGG.', '........................'],
  buggyWheel1: [
    '..........KK............', '..........KK............', '.......PPPPPPPP.........', '......PPPPWWPPPP........', '.....PPPPPPPPPPPPPPP....',
    '....PPPPPPPPPPPPPPPPPP..', 'PPPPPPPPPPPPPPPPPPPPPPPP', 'pppppppppppppppppppppppp', '.GGGG....GGGG......GGGG.', 'GgGGgG..GgGGgG....GgGGgG',
    'GGKKGG..GGKKGG....GGKKGG', 'GgGGgG..GgGGgG....GgGGgG', '.GGGG....GGGG......GGGG.', '........................'],
  wreck: [
    '........................', '........................', '........................', '...K.......K......K.....', '..KK..P...KK....K.K.....',
    '.KPPK.PP.KPPK..KPPK.....', 'PPPPPPPPPPPPPPPPPPPPPP..', 'ppppppppppppppppppppppp.', '.GG...GGGG.....GG.......', 'GGgG.GGggGG...GggG......',
    'GgKG.GgKKgG...GKKG......', '.GG..GGggGG....GG.......', '......GGGG..............', '........................'],
  rock: ['....RRRR....', '..RRRRRRRR..', '.RRRrRRRRRR.', 'RRRRRRRrRRRR', 'RRrRRRRRRRRR', 'rrrrrrrrrrrr'],
  bigRock: ['......RRRRRR........', '....RRRRRRRRRR......', '..RRRRrRRRRRRRRR....', '.RRRRRRRRRrRRRRRR...', 'RRRrRRRRRRRRRRRRRR..', 'RRRRRRRRrRRRRRRRRRR.', 'RrRRRRRRRRRRRrRRRRRR', 'rrrrrrrrrrrrrrrrrrrr'],
  mine: ['....KK....', '..K.KK.K..', '...KKKK...', 'KKKKYYKKKK', 'KKKKYYKKKK', '...KKKK...', '..K.KK.K..', '....KK....'],
  tank: ['.........GGG........', '.........GGG........', 'GGGGGGGGGGGGGG......', '.GGGGGGGGGGGGGGGGGGG', 'gggggggggggggggggggg', 'GgGgGgGgGgGgGgGgGgG.', '.GGGGGGGGGGGGGGGGGG.', '..gggggggggggggggg..'],
  ufoSmall: ['......BBBB......', '....BBBBBBBB....', '..BBBBBWWBBBBB..', 'BBBBBBBBBBBBBBBB', '..bbbbbbbbbbbb..', '....b..bb..b....'],
  ufoBig: ['.....YYYYYY.....', '...BBBBBBBBBB...', '.BBBBBWWBBBBBBB.', 'BBBBBBBBBBBBBBBB', 'bbbbbbbbbbbbbbbb', '..bb..bbbb..bb..', '....b......b....', '................'],
  ufoFast: ['.......OO.......', '.....OOOOOO.....', '..OOOOOWWOOOOO..', 'OOOOOOOOOOOOOOOO', '..OOOOOOOOOOOO..', '.....O....O.....'],
  bomb: ['.Y.', 'YYY', 'YYY', '.Y.', '.K.', '.K.'],
  life: ['....PPPP....', '..PPPPPPPP..', 'PPPPPPPPPPPP', '.GG..GG..GG.', '.GG..GG..GG.'],
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
