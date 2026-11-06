/** Pixel art at 1:1, arcade proportions. */
const PALETTE: Record<string, string> = {
  R: '#e03030', // Mario's cap and shirt
  B: '#3050d0', // overalls
  F: '#f0c0a0', // skin
  H: '#703018', // hair / moustache / shoes
  Y: '#f0d040',
  W: '#f0f0f0',
  K: '#202020',
  O: '#c08040', // barrel wood
  o: '#805020',
  b: '#5080f0', // blue barrel
  S: '#a0a8b0', // pie / spring
  s: '#606870',
  P: '#f080c0', // Pauline's dress
  p: '#c05090',
  D: '#a06030', // Kong fur
  d: '#703818',
  T: '#f0b060', // Kong's chest
  G: '#f09020', // fire
  g: '#f0e040',
  C: '#40c0e0', // fireball blue
  M: '#e04070', // purse
  '.': '',
};

const MAPS: Record<string, string[]> = {
  stand: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', '...FFFFFFF..', '..RRBRRRR...', '.RRRRBRRRR..', 'RRRRBBBBRRRR', 'FFRBBYBBBRFF', 'FF.BBBBBB.FF', '...BBBBBB...', '..BBB..BBB..', '.HHH....HHH.', 'HHHH....HHHH'],
  run0: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', '...FFFFFFF..', '..RRBRRRR...', '.RRRRBRRRRF.', 'RRRRBBBBRRFF', 'FFRBBYBBBR..', '...BBBBBBB..', '..BBBBB.BBB.', '.BBB.....BBB', 'HHH.......HH', 'HHH.......HH'],
  run1: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', '...FFFFFFF..', '..RRBRRRR...', '.RRRRBRRRR..', 'RRRRBBBBRRRR', 'FFRBBYBBBRFF', '...BBBBBB...', '....BBBB....', '....BBBB....', '...HHHH.....', '..HHHH......'],
  jump: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', 'F..FFFFFFF.F', 'FFRRBRRRRRFF', '.RRRRBRRRRR.', '.RRRBBBBRRR.', '..RBBYBBBR..', '...BBBBBB...', '.BBBB..BBBB.', 'HHH......HHH', 'HH........HH', '............'],
  climb0: ['...RRRRRR...', '..RRRRRRRR..', '..HHHHHHHH..', '..HHHHHHHH..', '...HHHHHH...', 'F..RRRRRR..F', 'F.RRRRRRRR.F', 'FFRRBBBBRRFF', '.RRBBBBBBRR.', '..BBBBBBBB..', '..BBBBBBBB..', '..BBB..BBB..', '..BBB..BBB..', '..HHH..HHH..', '..HHH..HHH..', '............'],
  climb1: ['...RRRRRR...', '..RRRRRRRR..', '..HHHHHHHH..', '..HHHHHHHH..', '...HHHHHH...', '...RRRRRR..F', '..RRRRRRRR.F', '.FRRBBBBRRFF', '.FRBBBBBBRR.', '..BBBBBBBB..', '..BBBBBBBB..', '..BBB..BBB..', '..BBB..HHH..', '..HHH..HHH..', '..HHH.......', '............'],
  hammer0: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', '...FFFFFFF..', '..RRBRRRR...', '.RRRRBRRRR..', 'RRRRBBBBRRRR', '.FRBBYBBBRFF', '...BBBBBB.FF', '...BBBBBB...', '..BBB..BBB..', '.HHH....HHH.', 'HHHH....HHHH'],
  hammer1: ['...RRRRR....', '..RRRRRRRRR.', '..HHHFFKF...', '.HFHFFFKFF..', '.HFHHFFFKFFF', '.HHFFFFKKKK.', 'FF.FFFFFFF..', 'FFRRBRRRR...', '.RRRRBRRRR..', '.RRRBBBBRRRR', '..RBBYBBBR..', '...BBBBBB...', '...BBBBBB...', '..BBB..BBB..', '.HHH....HHH.', 'HHHH....HHHH'],
  dead: ['............', '............', '............', '....RRRR....', '..RRRRRRRR..', '.RHHFFKFFHR.', '.FFHFFFFFFF.', '.FFFFFFFFFF.', 'FFRRBBBBRRFF', 'F.RRBBBBRR.F', '..RBBBBBBR..', '..BBBBBBBB..', '..HHB..BHH..', '..HH....HH..', '............', '............'],
  hammerItem: ['.OOOOOOO', '.OOOOOOO', '.OOOOOOO', '...ss...', '...ss...', '...ss...', '...ss...', '...ss...', '...ss...', '...ss...'],
  barrel0: ['..OOOOOOOO..', '.OoOOOOOOoO.', 'OOoOOOOOOoOO', 'OOoOOOOOOoOO', 'OOOOOOOOOOOO', 'OOoOOOOOOoOO', 'OOoOOOOOOoOO', 'OOoOOOOOOoOO', '.OoOOOOOOoO.', '..OOOOOOOO..'],
  barrel1: ['..OOOOOOOO..', '.OOoOOOOoOO.', 'OOOoOOOOoOOO', 'OOOoOOOOoOOO', 'OOOOOOOOOOOO', 'OOOoOOOOoOOO', 'OOOoOOOOoOOO', 'OOOoOOOOoOOO', '.OOoOOOOoOO.', '..OOOOOOOO..'],
  blue0: ['..bbbbbbbb..', '.bWbbbbbbWb.', 'bbWbbbbbbWbb', 'bbWbbbbbbWbb', 'bbbbbbbbbbbb', 'bbWbbbbbbWbb', 'bbWbbbbbbWbb', 'bbWbbbbbbWbb', '.bWbbbbbbWb.', '..bbbbbbbb..'],
  blue1: ['..bbbbbbbb..', '.bbWbbbbWbb.', 'bbbWbbbbWbbb', 'bbbWbbbbWbbb', 'bbbbbbbbbbbb', 'bbbWbbbbWbbb', 'bbbWbbbbWbbb', 'bbbWbbbbWbbb', '.bbWbbbbWbb.', '..bbbbbbbb..'],
  fire0: ['....GG......', '...GGG..G...', '..GGgGG.GG..', '.GGggggGGGG.', 'GGgggggggGGG', 'GGgKggggKgGG', 'GGggggggggGG', '.GGgggggggG.', '.GGGggggGGG.', '..GGGGGGGG..', '...GGGGGG...', '....GGGG....'],
  fire1: ['......GG....', '...G..GGG...', '..GG.GGgGG..', '.GGGGggggGG.', 'GGGgggggggGG', 'GGgKggggKgGG', 'GGggggggggGG', '.GGgggggggG.', '.GGGggggGGG.', '..GGGGGGGG..', '...GGGGGG...', '....GGGG....'],
  fireBlue0: ['....CC......', '...CCC..C...', '..CCWCC.CC..', '.CCWWWWCCCC.', 'CCWWWWWWWCCC', 'CCWKWWWWKWCC', 'CCWWWWWWWWCC', '.CCWWWWWWWC.', '.CCCWWWWCCC.', '..CCCCCCCC..', '...CCCCCC...', '....CCCC....'],
  pie: ['..SSSSSSSSSSSS..', '.SSssssssssssSS.', 'SSSSSSSSSSSSSSSS', 'ssssssssssssssss', '.ss..ss..ss..ss.', '................'],
  spring0: ['.SSSSSSSSSS.', 'SsssssssssSS', '..s......s..', '.s........s.', '..s......s..', '.s........s.', '..s......s..', '.s........s.', 'SSSSSSSSSSSS', 'ssssssssssss'],
  spring1: ['............', '............', '............', '.SSSSSSSSSS.', 'SsssssssssSS', '.s.s.s.s.s..', '..s.s.s.s.s.', '.s.s.s.s.s..', 'SSSSSSSSSSSS', 'ssssssssssss'],
  purse: ['....MM....', '...M..M...', '..MMMMMM..', '.MMMMMMMM.', '.MMMYYMMM.', '.MMMMMMMM.', '.MMMMMMMM.', '..MMMMMM..', '..........', '..........'],
  hat: ['..........', '...PPPP...', '..PPPPPP..', '..PPPPPP..', 'PPPPPPPPPP', 'pppppppppp', '..........', '..........', '..........', '..........'],
  umbrella: ['....PP....', '..PPPPPP..', '.PPPPPPPP.', 'PPpPPpPPpP', '....KK....', '....KK....', '....KK....', '....KK....', '...KKK....', '..........'],
  pauline: ['....HHHH....', '...HHHHHH...', '...HFFFFH...', '...HFKFKH...', '...HFFFFH...', '....FFFF....', '....PPPP....', '...PPPPPP...', '..PPPPPPPP..', '.FPPPpPPPPF.', '.FPPPPPPPPF.', '..PPPPPPPP..', '..PPppppPP..', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPPPPPPPPP.', 'PPPPPPPPPPPP', 'PPPPPPPPPPPP', '...FF..FF...', '...FF..FF...', '..HHH..HHH..', '..HHH..HHH..'],
  oilDrum: ['BBBBBBBBBBBBBBBB', 'BWBBBBBBBBBBBBWB', 'BWBBBWWWWBBBBBWB', 'BWBBWBBBBWBBBBWB', 'BWBBWBBBBWBBBBWB', 'BWBBBWWWWBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BWBBBBBBBBBBBBWB', 'BBBBBBBBBBBBBBBB'],
  drumFire0: ['......G.........', '.....GG...G.....', '..G.GGG..GG.....', '..GGGgG.GGG..G..', '.GGgggGGGgGGGG..', 'GGggggggggggGGG.', 'GGggggggggggGGGG', '.GGggggggggggGG.'],
  drumFire1: ['.........G......', '...G....GG......', '..GG.G.GGG..G...', '.GGG.GGGgG.GG...', '.GGgGGgggGGGGG..', 'GGggggggggggGGG.', 'GGggggggggggGGGG', '.GGggggggggggGG.'],
  life: ['..RRRR..', '.RRRRRR.', '.HHFFKF.', '.FFFFFF.', '..RRBR..', '.RBBYBR.', '..BBBB..', '.HH..HH.'],
};

// Kong: 40 x 32, two poses
const KONG_IDLE = [
  '..........DDDDDDDDDDDD..........        ',
  '........DDDDDDDDDDDDDDDD........        ',
  '.......DDDDDTTTTTTTTDDDDD.......        ',
  '......DDDDTTTKTTTTKTTTDDDD......        ',
  '......DDDDTTTTTTTTTTTTDDDD......        ',
  '......DDDDTTTdTTTTdTTTDDDD......        ',
  '.......DDDDTTTTTTTTTTDDDD.......        ',
  '........DDDDDTTTTTTDDDDD........        ',
  '......DDDDDDDDDDDDDDDDDDDD......        ',
  '....DDDDDDDDDDDDDDDDDDDDDDDD....        ',
  '..DDDDDDDDDTTTTTTTTTTDDDDDDDDD..        ',
  '.DDDDDDDDDTTTTTTTTTTTTDDDDDDDDD.        ',
  'DDDDDDDDDTTTTTTTTTTTTTTDDDDDDDDD        ',
  'DDDDDDDDDTTTTTTTTTTTTTTDDDDDDDDD        ',
  'DDDDDDDDDTTTTTTTTTTTTTTDDDDDDDDD        ',
  'DDDDDDDDDDTTTTTTTTTTTTDDDDDDDDDD        ',
  'DDDDDDDDDDDTTTTTTTTTTDDDDDDDDDDD        ',
  'DDDDDDDDDDDDTTTTTTTTDDDDDDDDDDDD        ',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD        ',
  'DDDDD.DDDDDDDDDDDDDDDDDDDD.DDDDD        ',
  'DDDD...DDDDDDDDDDDDDDDDDD...DDDD        ',
  'DDDD...DDDDDDDDDDDDDDDDDD...DDDD        ',
  'FFFF...DDDDDDDDDDDDDDDDDD...FFFF        ',
  'FFFF....DDDDDDDDDDDDDDDD....FFFF        ',
  'FFFF....DDDDDDDDDDDDDDDD....FFFF        ',
  '........DDDDDDDDDDDDDDDD........        ',
  '........DDDDDD....DDDDDD........        ',
  '........DDDDDD....DDDDDD........        ',
  '........DDDDDD....DDDDDD........        ',
  '.......dddddddd..dddddddd.......        ',
  '.......dddddddd..dddddddd.......        ',
  '................................        ',
].map((r) => r.slice(0, 40).padEnd(40, '.').replace(/ /g, '.'));

const KONG_THROW = KONG_IDLE.map((r, i) => (i >= 8 && i < 25 ? r.slice(8) + '........' : r));

MAPS.kong0 = KONG_IDLE;
MAPS.kong1 = KONG_THROW;

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
