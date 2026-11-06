/** Pixel art at the arcade's 16x16 cell, 1:1. */
const PALETTE: Record<string, string> = {
  G: '#40d040', // frog
  g: '#208020',
  Y: '#f0e040', // eyes, yellow car
  y: '#b0a020',
  R: '#e03030', // red
  r: '#901818',
  W: '#f0f0f0',
  w: '#a0a8b0',
  P: '#e060e0', // pink car / lady frog
  p: '#903090',
  B: '#5080f0', // blue
  O: '#f09020', // orange / bulldozer
  o: '#a06010',
  K: '#202020',
  T: '#a06030', // log
  t: '#704018',
  S: '#60b040', // turtle shell
  s: '#a0e060',
  C: '#60a830', // crocodile
  c: '#305818',
  N: '#e0c040', // snake
  n: '#907820',
  M: '#806040', // otter
  m: '#503820',
  '.': '',
};

const MAPS: Record<string, string[]> = {
  frogUp: [
    '.YY.G......G.YY.', '.YYGGG....GGGYY.', '..GGGGGGGGGGGG..', '...GGgGGGGgGG...', '...GGGGGGGGGG...', '..GGGGggggGGGG..', '.GGGGGGggGGGGGG.',
    '.GG.GGGGGGGG.GG.', 'GG..GGggggGG..GG', 'GG..GGGGGGGG..GG', '....GGGGGGGG....', '...GGGG..GGGG...', '..GGG......GGG..', '.GGG........GGG.',
    'GGG..........GGG', 'GG............GG'],
  frogHop: [
    '.YY.G......G.YY.', '.YYGGG....GGGYY.', '..GGGGGGGGGGGG..', 'G..GGgGGGGgGG..G', 'GG.GGGGGGGGGG.GG', '.GGGGGggggGGGGG.', '..GGGGGggGGGGG..',
    '....GGGGGGGG....', '....GGggggGG....', '....GGGGGGGG....', '....GGGGGGGG....', '.....GG..GG.....', '....GGG..GGG....', '...GGG....GGG...',
    '..GGG......GGG..', '..GG........GG..'],
  frogHome: [
    '................', '.YY.G......G.YY.', '.YYGGG....GGGYY.', '..GGGGGGGGGGGG..', '...GGgGGGGgGG...', '..GGGGGGGGGGGG..', '.GGGGGggggGGGGG.',
    'GG.GGGGggGGGG.GG', 'GG.GGggggggGG.GG', '...GGGGGGGGGG...', '...GGGG..GGGG...', '..GGG......GGG..', '.GGG........GGG.', 'GGG..........GGG',
    '................', '................'],
  lady: [
    '.WW.P......P.WW.', '.WWPPP....PPPWW.', '..PPPPPPPPPPPP..', '...PPpPPPPpPP...', '...PPPPPPPPPP...', '..PPPPppppPPPP..', '.PPPPPPppPPPPPP.',
    '.PP.PPPPPPPP.PP.', 'PP..PPppppPP..PP', 'PP..PPPPPPPP..PP', '....PPPPPPPP....', '...PPPP..PPPP...', '..PPP......PPP..', '.PPP........PPP.',
    'PPP..........PPP', 'PP............PP'],
  splat: [
    'R.....R..R.....R', '.R....R..R....R.', '..R...RRRR...R..', '...R.RRRRRR.R...', '....RRRrrRRR....', '..RRRRrrrrRRRR..', 'RRRRRrrrrrrRRRRR',
    '...RRrrrrrrRR...', '...RRrrrrrrRR...', 'RRRRRrrrrrrRRRRR', '..RRRRrrrrRRRR..', '....RRRrrRRR....', '...R.RRRRRR.R...', '..R...RRRR...R..',
    '.R....R..R....R.', 'R.....R..R.....R'],
  drown: [
    '................', '....B......B....', '...B.B....B.B...', '..B...B..B...B..', '.......BB.......', '......BBBB......', '.....BBBBBB.....',
    '....BBBBBBBB....', '....BBBBBBBB....', '.....BBBBBB.....', '......BBBB......', '.......BB.......', '..B..........B..', '.B.B........B.B.',
    'B...B......B...B', '................'],
  car: [
    '................', '................', '......YYYY......', '....YYYYYYYY....', '...YYYYYYYYYY...', '..YYKKYYYYKKYY..', '.YYYKKYYYYKKYYY.',
    'YYYYYYYYYYYYYYYY', 'YYYYYYYYYYYYYYYY', 'yyyyyyyyyyyyyyyy', '.KKKK......KKKK.', '.KKKK......KKKK.', '..KK........KK..', '................',
    '................', '................'],
  carPink: [
    '................', '................', '......PPPP......', '....PPPPPPPP....', '...PPPPPPPPPP...', '..PPKKPPPPKKPP..', '.PPPKKPPPPKKPPP.',
    'PPPPPPPPPPPPPPPP', 'PPPPPPPPPPPPPPPP', 'pppppppppppppppp', '.KKKK......KKKK.', '.KKKK......KKKK.', '..KK........KK..', '................',
    '................', '................'],
  dozer: [
    '................', '..OOOO..........', '..OOOO..OOOOOO..', '..OKKO.OOOOOOOO.', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO',
    'oooooooooooooooo', 'KKKKKKKKKKKKKKKK', 'K..K..K..K..K..K', 'KKKKKKKKKKKKKKKK', '.KKKKKKKKKKKKKK.', '................', '................',
    '................', '................'],
  racer: [
    '................', '................', '.......WW.......', '......WWWW......', 'WW....WWWW....WW', 'WWWWWWWWWWWWWWWW', 'WWWWKKWWWWKKWWWW',
    'wwwwwwwwwwwwwwww', 'WWWWWWWWWWWWWWWW', 'WW....WWWW....WW', 'KK....WWWW....KK', 'KK............KK', '................', '................',
    '................', '................'],
  truck: [
    '................................', '................................', '.WWWWWWWWWWWWWWWWWWWWWW..RRRR...', '.WWWWWWWWWWWWWWWWWWWWWW.RRRRRR..',
    '.WWWWWWWWWWWWWWWWWWWWWW.RRKKRRR.', '.WWWWWWWWWWWWWWWWWWWWWW.RRKKRRR.', '.WWWWWWWWWWWWWWWWWWWWWW.RRRRRRR.', '.WWWWWWWWWWWWWWWWWWWWWW.RRRRRRR.',
    '.wwwwwwwwwwwwwwwwwwwwww.rrrrrrr.', '.wwwwwwwwwwwwwwwwwwwwww.rrrrrrr.', '.KKK.KKK........KKK.....KKK.....', '.KKK.KKK........KKK.....KKK.....',
    '..K...K..........K.......K......', '................................', '................................', '................................'],
  turtle: [
    '................', '................', '.....SSSSSS.....', '...SSsSSsSSsS...', '..SSSSSSSSSSSS..', 'GGSsSSsSSsSSsSGG', 'GGSSSSSSSSSSSSGG',
    'GGSsSSsSSsSSsSGG', '.GSSSSSSSSSSSSG.', '..SSSSSSSSSSSS..', '...SSSSSSSSSS...', '...GG......GG...', '...GG......GG...', '................',
    '................', '................'],
  turtleDown: [
    '................', '................', '................', '................', '.....SSSSSS.....', '....SSsSSsSS....', '...SSSSSSSSSS...',
    '...SSsSSsSSsS...', '....SSSSSSSS....', '.....SSSSSS.....', '................', '................', '................', '................',
    '................', '................'],
  logL: [
    '................', '................', '................', '...TTTTTTTTTTTTT', '..TTttTTTTTTTTTT', '.TTTTTTTTttTTTTT', '.TTtTTTTTTTTTTTT',
    '.TTTTTTtTTTTTTTT', '.TTTTTTTTTTTtTTT', '.TTttTTTTTTTTTTT', '..TTTTTTtTTTTTTT', '...TTTTTTTTTTTTT', '................', '................',
    '................', '................'],
  logM: [
    '................', '................', '................', 'TTTTTTTTTTTTTTTT', 'TTTTtTTTTTTTTttT', 'TTTTTTTTTtTTTTTT', 'TtTTTTTTTTTTTTTT',
    'TTTTTTtTTTTTTtTT', 'TTTTTTTTTTTTTTTT', 'TTtTTTTTttTTTTTT', 'TTTTTTTTTTTTTtTT', 'TTTTTTTTTTTTTTTT', '................', '................',
    '................', '................'],
  logR: [
    '................', '................', '................', 'TTTTTTTTTTTTT...', 'TTTTTTttTTTTTT..', 'TTTtTTTTTTTTTTT.', 'TTTTTTTTTtTTTTT.',
    'TTTTTTtTTTTTTTT.', 'TTTtTTTTTTTTtTT.', 'TTTTTTTTttTTTTT.', 'TTTTTTTTTTTTTT..', 'TTTTTTTTTTTTT...', '................', '................',
    '................', '................'],
  crocBody: [
    '................', '................', '....c...c...c...', 'CCCCCCCCCCCCCCCC', 'CcCCCcCCCcCCCcCC', 'CCCCCCCCCCCCCCCC', 'CCCcCCCcCCCcCCCc',
    'CCCCCCCCCCCCCCCC', 'CcCCCcCCCcCCCcCC', 'CCCCCCCCCCCCCCCC', '................', '................', '................', '................',
    '................', '................'],
  crocHead: [
    '................', '................', 'CCCC............', 'CCCCCCCC........', 'CWCCCCCCCCCC....', 'CCCCCCCCCCCCCC..', 'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC..', 'CCCCCCCCCCCC....', '................', '................', '................', '................',
    '................', '................'],
  crocJaws: [
    'CCCC............', 'CCCCCCC.........', 'CWCCCCCCCC......', 'CCCCCCCCCCCCWW..', 'CCCCCCCCCCCCCCWW', 'CCCCCCCCCCCCCCCC', 'CCCC............',
    'CCCCCCCCCCCCCCCC', 'CCCCCCCCCCCCCCWW', 'CCCCCCCCCCCCWW..', 'CCCCCCCCCC......', 'CCCCCC..........', '................', '................',
    '................', '................'],
  snake: [
    '................................', '................................', '....NNNN..........NNNN..........', '...NNnnNN........NNnnNN.......KK',
    '..NN....NN......NN....NN.....NNR', '.NN......NN....NN......NN...NNN.', 'NN........NNNNNN........NNNNNN..', '...........NNNN..........NNN....',
    '................................', '................................', '................................', '................................',
    '................................', '................................', '................................', '................................'],
  otter: [
    '................', '................', '................', '......MMMM......', '.....MMMMMM.....', '....MMKMMMMMM...', '...MMMMMMMMMMM..',
    '..MMMMMMMMMMMMMM', '.MMMMMMMMMMMMMm.', '.mMMMMMMMMMMMm..', '..mmmmmmmmmmm...', '................', '................', '................',
    '................', '................'],
  fly: [
    '................', '................', '....KK....KK....', '.....KK..KK.....', '..KKKKKKKKKKKK..', '.KKKKKKKKKKKKKK.', '....KKKKKKKK....',
    '.....KKKKKK.....', '....KKKKKKKK....', '.KKKKKKKKKKKKKK.', '..KKKKKKKKKKKK..', '.....KK..KK.....', '....KK....KK....', '................',
    '................', '................'],
  homeCroc: [
    '................', '................', '................', '..CCCC..........', '.CCCCCCCC.......', 'CWCCCCCCCCCC....', 'CCCCCCCCCCCCCC..',
    'CCCCCCCCCCCCCCCC', 'CCCCCCCCCCCCCC..', 'CCCCCCCCCCCC....', '.CCCCCCCC.......', '..CCCC..........', '................', '................',
    '................', '................'],
  life: [
    '.Y.G....G.Y.', '.YGGG..GGGY.', '..GGGGGGGG..', '...GgGGgG...', '..GGGggGGG..', '.GG.GGGG.GG.', 'G...GGGG...G', '....GGGG....', '...GG..GG...',
    '..GG....GG..', '.GG......GG.', 'G..........G'],
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
