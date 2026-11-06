/** Pixel art at 1:1. */
const PALETTE: Record<string, string> = {
  B: '#3878f0', // our chopper
  b: '#2050a8',
  W: '#f0f0f0',
  K: '#202020',
  R: '#e04040', // enemy helicopter
  r: '#a02828',
  G: '#a0a8b0', // jets
  g: '#687078',
  T: '#e8e8f8', // trucks
  t: '#9098b0',
  Y: '#f0d040',
  '.': '',
};

const MAPS: Record<string, string[]> = {
  chopper0: [
    '....KKKKKKKKKKKKKKK.....', '.........K..............', '.........KK.............', 'KK.....BBBBBBBB.........', '.KKKBBBBBBBBBBBBBBB.....',
    '..KKBBBBBWWBBBBBBBBB....', '...BBBBBBBBBBBBBBBbb....', '....bbbbbbbbbbbbbb......', '.....K.........K........', '....KKKKKKKKKKKKK.......'],
  chopper1: [
    '......KKKKKK............', '.........K..............', '.........KK.............', 'KK.....BBBBBBBB.........', '.KKKBBBBBBBBBBBBBBB.....',
    '..KKBBBBBWWBBBBBBBBB....', '...BBBBBBBBBBBBBBBbb....', '....bbbbbbbbbbbbbb......', '.....K.........K........', '....KKKKKKKKKKKKK.......'],
  heli0: ['..KKKKKKKKKKKKKK....', '........K...........', '........KK..........', 'KK....RRRRRRRR......', '.KKRRRRRRRRRRRRR....', '..KRRRRWWRRRRRRRR...', '...RRRRRRRRRRRRrr...', '....rrrrrrrrrrrr....', '.....K.......K......', '....KKKKKKKKKKK.....'],
  heli1: ['.....KKKKKKK........', '........K...........', '........KK..........', 'KK....RRRRRRRR......', '.KKRRRRRRRRRRRRR....', '..KRRRRWWRRRRRRRR...', '...RRRRRRRRRRRRrr...', '....rrrrrrrrrrrr....', '.....K.......K......', '....KKKKKKKKKKK.....'],
  jet: ['..............GG....', '.............GGG....', 'GG.......GGGGGGGG...', 'GGGGGGGGGGGGGGGGGGGG', 'gggggggggggWWggggggg', '....ggggggggggg.....', '.......gggg.........'],
  truck: ['TTTTTTTTT.......', 'TTTTTTTTTTTTT...', 'TTTTTTTTTTTTtTT.', 'TTTTTTTTTTTTTTTT', 'tttttttttttttttt', '.KK..KK....KK.KK', '.KK..KK....KK.KK', '................'],
  truckDead: ['................', '................', '..r...r.........', '.rrr.rrr..rr....', 'rrrrrrrrrrrrr...', '.KK..KK....KK.KK', '................', '................'],
  missile: ['YYYY', 'WWYY'],
  life: ['..KKKKKKK...', '.....K......', 'K..BBBBBBB..', '.KBBBBBBBBB.', '..BBBBBBBbb.', '...bbbbbbb..', '...KKKKKK...'],
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
