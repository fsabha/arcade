import { PX } from './config';

// Atari-style wide pixels: every map cell is PX wide and 1 px tall.
const PALETTE: Record<string, string> = {
  H: '#4a2a0a', // hair
  F: '#e8a878', // skin
  S: '#3ca03c', // shirt
  P: '#c8a050', // trousers
  B: '#5a3a14', // boots
  L: '#9c6428', // log
  l: '#d8a868',
  y: '#f8e048', // fire
  o: '#f08020',
  r: '#d02010',
  G: '#48b038', // crocodile / snake
  g: '#2c7c20',
  W: '#e8e8e8', // scorpion / money bag / ring
  D: '#88d8f8', // diamond
  d: '#303030',
  A: '#f0d040', // gold
  a: '#b09020',
  s: '#c0c8d0', // silver
  t: '#88909c',
  '.': '',
};

const HEAD = ['..HHHH..', '.HHHHHH.', '.HHFFFF.', '..FFFF..', '..FFFF..', '...FF...'];
const TORSO = ['.SSSSSS.', 'SSSSSSSS', 'SS.SS.SS', 'SS.SS.SS', 'FF.SS.FF', '...SS...'];
const TORSO_RUN = ['.SSSSSS.', 'SSSSSSSS', 'SS.SS.SS', 'FF.SS.SS', '...SS.FF', '...SS...'];
const LEGS_STAND = ['..PPPP..', '..PPPP..', '..PPPP..', '..PP.PP.', '..PP.PP.', '..PP.PP.', '..PP.PP.', '..PP.PP.', '.BBB.BBB', '.BBB.BBB'];
const LEGS_A = ['..PPPP..', '..PPPP..', '.PPPPPP.', '.PP..PP.', 'PP....PP', 'PP....PP', 'PP....PP', 'P......P', 'BB....BB', 'BB....BB'];
const LEGS_B = ['..PPPP..', '..PPPP..', '..PPPP..', '..PPPP..', '...PPP..', '...PP...', '...PP...', '...PP...', '..BBB...', '..BBB...'];
const LEGS_C = ['..PPPP..', '..PPPP..', '.PPPPP..', '.PP.PPP.', '.PP..PP.', 'PP...PP.', 'PP...PP.', 'PP....P.', 'BB...BB.', 'BB....B.'];
const LEGS_JUMP = ['..PPPP..', '.PPPPPP.', '.PP..PP.', 'PP....PP', 'BB....BB', '........', '........', '........', '........', '........'];

const MAPS: Record<string, string[]> = {
  stand: [...HEAD, ...TORSO, ...LEGS_STAND],
  run0: [...HEAD, ...TORSO_RUN, ...LEGS_A],
  run1: [...HEAD, ...TORSO, ...LEGS_B],
  run2: [...HEAD, ...TORSO_RUN, ...LEGS_C],
  jump: [...HEAD, ...TORSO_RUN, ...LEGS_JUMP],
  climb0: [
    '.F....F.', '.S....S.', '.SHHHHS.', '.HHHHHH.', '.HHHHHH.', '..HHHH..',
    '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '..SSSS..',
    '..PPPP..', '.PPPPPP.', '.PP..PP.', '.PP..PP.', '.PP..PP.', '.PP..PP.', '.PP..PP.', '.PP..PP.', '.BB..BB.', '.BB..BB.',
  ],
  climb1: [
    '.F....F.', '.S....S.', '.SHHHHS.', '.HHHHHH.', '.HHHHHH.', '..HHHH..',
    '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '.SSSSSS.', '..SSSS..',
    '..PPPP..', '.PPPPPP.', '.PP..PP.', '.PP..PP.', '.PP..PP.', '.BB..PP.', '.BB..PP.', '.....PP.', '.....BB.', '.....BB.',
  ],
  swing: [
    '...FF...', '...SS...', '..SHHH..', '..HHHHH.', '..HFFFF.', '...FFF..',
    '...FF...', '..SSSS..', '.SSSSSS.', '.SSSSSS.', '..SSSS..', '..SSSS..',
    '..PPPP..', '..PPPP..', '..PP.PP.', '.PP..PP.', '.PP...PP', 'PP....PP', 'PP....PP', 'BB....BB', '........', '........',
  ],
  kneel: [
    '........', '........', '........', '........', '........', '........',
    '..HHHH..', '.HHHHHH.', '.HHFFFF.', '..FFFF..', '..FFFF..', '...FF...',
    '.SSSSSS.', 'SSSSSSSS', 'SS.SS.SS', 'FF.SS.FF', '..PPPPPP', '.PPPPPPP', '.PP...PP', 'PP....PP', 'BB....BB', 'BB....BB',
  ],
  log0: ['..LLLL..', '.LlLLlL.', 'LLlLLlLL', 'LlLLLLlL', 'LlLLLLlL', 'LLlLLlLL', '.LlLLlL.', '..LLLL..'],
  log1: ['..LLLL..', '.LLlLLL.', 'LlLLLLlL', 'LLlLLlLL', 'LLlLLlLL', 'LlLLLLlL', '.LLlLLL.', '..LLLL..'],
  fire0: [
    '...y....', '...yy...', '..yyy...', '..yyyy..', '.yyyyy..', '.yoyyyo.', '.ooyyoo.', 'oooyyooo',
    'oooooooo', '.oorroo.', '.rrrrrr.', '..rrrr..', '..rrrr..', '...rr...',
  ],
  fire1: [
    '....y...', '...yy...', '...yyy..', '..yyyy..', '..yyyyy.', '.oyyyoy.', '.ooyyoo.', 'oooyyooo',
    'oooooooo', '.oorroo.', '.rrrrrr.', '..rrrr..', '..rrrr..', '...rr...',
  ],
  snake0: ['.GGG....', 'GGGGG...', 'G.GGG...', 'GGGGG...', '..GG....', '..GG.GG.', '..GGGGGG', '...GGGG.', '.GGGGG..', 'GGGGGG..'],
  snake1: ['.GGG....', 'GGGGG...', 'G.GGG...', 'GGGGG.r.', '..GG.r..', '..GG.GG.', '..GGGGGG', '...GGGG.', '.GGGGG..', 'GGGGGG..'],
  scorpion0: ['.W...W..', '..W.W...', '...W....', '.WWWWW.W', 'WWWWWWW.', '.WWWWW.W', 'W.W.W.W.', '........'],
  scorpion1: ['.W...W..', '..W.W...', '...W...W', '.WWWWW..', 'WWWWWWW.', '.WWWWW..', '.W.W.W.W', '........'],
  // crocodiles face left; the open jaw sticks out 6 u to the left
  crocClosed: ['..............', '......GGGGGGG.', '......GgGGGGGG', '......GGGGGGGG', '.......GG..GG.'],
  crocOpen: ['GGGG..........', '.GGGGG........', '..GGGGGG......', '......GGGGGGGG', '......GGGGGGGG', '.......GG..GG.'],
  money: ['..WW....', '.WWWW...', '..WW....', '.WWWWW..', 'WWWWWWW.', 'WWWdWWW.', 'WWWWWWW.', '.WWWWW..'],
  silver: ['.ssssss.', 'sssssst.', 'ssssstt.', 'tttttt..'],
  gold: ['.AAAAAA.', 'AAAAAAa.', 'AAAAAaa.', 'aaaaaa..'],
  ring: ['...DD...', '..WWWW..', '.WW..WW.', '.W....W.', '.WW..WW.', '..WWWW..'],
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
