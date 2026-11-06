import { PX } from './config';

const PALETTE: Record<string, string> = {
  H: '#f0c040', // helmet
  h: '#c09020',
  F: '#f0c0a0', // face
  S: '#3878d8', // suit
  s: '#2050a0',
  B: '#303030', // boots / outlines
  P: '#d0d0d0', // propeller
  W: '#f0f0f0',
  g: '#60c060', // spider / snake
  G: '#308030',
  b: '#8060c0', // bat
  m: '#e0e0a0', // moth
  o: '#f08020', // lantern / miner lamp
  r: '#e04040',
  M: '#c08040', // miner
  T: '#a040a0', // tentacle
  t: '#702070',
  '.': '',
};

const MAPS: Record<string, string[]> = {
  hero0: ['PPPPPP', '..BB..', '.HHHH.', '.HFFH.', '..FF..', '.SSSS.', 'SSsSSS', 'S.SS.S', '..SS..', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.BB.BB', '.BB.BB'],
  hero1: ['.PPPP.', '..BB..', '.HHHH.', '.HFFH.', '..FF..', '.SSSS.', 'SSsSSS', 'S.SS.S', '..SS..', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.ss.ss', '.BB.BB', '.BB.BB'],
  run0: ['PPPPPP', '..BB..', '.HHHH.', '.HFFH.', '..FF..', '.SSSS.', 'SSsSSS', 'S.SS.S', '..SS..', '.ssss.', '.ss.ss', 'ss..ss', 'ss...s', 's....s', 's....s', 's....s', 'B....B', 'B....B', 'B....B', '......'],
  run1: ['PPPPPP', '..BB..', '.HHHH.', '.HFFH.', '..FF..', '.SSSS.', 'SSsSSS', 'S.SS.S', '..SS..', '..ss..', '..ss..', '..ss..', '..ss..', '..ss..', '..ss..', '..ss..', '..BB..', '..BB..', '......', '......'],
  dead: ['......', '......', '......', '......', '......', '......', '......', '......', '......', '......', '......', '......', '......', '......', '.HHHH.', 'HFFHSS', 'SSSSSS', 'ssSSss', 'BB..BB', '......'],
  spider: ['g....g', '.g..g.', '.gGGg.', 'ggGGgg', '.gGGg.', '.g..g.', 'g....g', '......', '......', '......'],
  bat: ['b......b', 'bb....bb', 'bbbBBbbb', '.bbBBbb.', '..bbbb..', '...bb...', '........', '........'],
  snake: ['..gg...', '.gGGg..', '.g.gg..', '.ggg...', '...g...', '...gg..', '....ggg', '..gggg.', '.ggg...', 'gggg...'],
  moth: ['m....m', 'mm..mm', 'mmWWmm', '.mWWm.', '..mm..', '......', '......', '......'],
  miner: ['...oo...', '..MMMM..', '..FFFF..', '..MMMM..', '.MMMMMM.', 'M.MMMM.M', '..BB.BB.', '..BB.BB.'],
  lantern0: ['..oo..', '.o..o.', '.oWWo.', '.oWWo.', '.oooo.', '..oo..', '......', '......', '......', '......', '......', '......'],
  lantern1: ['..oo..', '.o..o.', '.o..o.', '.o..o.', '.oooo.', '..oo..', '......', '......', '......', '......', '......', '......'],
  tentacle0: ['...T....', '..TT....', '..TtT...', '...TT...', '..TTT...', '.TtTT...', '.TTTT...', 'TTTTtT..', 'TTTTTTT.', 'TTTTTTTT'],
  tentacle1: ['....T...', '....TT..', '...TtT..', '...TT...', '...TTT..', '...TTtT.', '...TTTT.', '..TtTTTT', '.TTTTTTT', 'TTTTTTTT'],
  stick: ['r.', 'rr', 'rr'],
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
