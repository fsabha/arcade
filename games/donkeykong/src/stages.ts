import { StageKind } from './config';

/** A walkable surface: a straight line from (x0,y0) to (x1,y1), y being the top. */
export interface Platform {
  x0: number; y0: number; x1: number; y1: number;
  /** conveyors carry whatever stands on them */
  conveyor?: { dir: 1 | -1; speed: number; /** halves split at this x: left half runs -dir */ splitX?: number };
  /** rivet stage: pieces of floor that vanish are not needed; rivets are gaps instead */
}

export interface Ladder {
  x: number; // left edge (8 wide)
  yTop: number; // platform top it reaches
  yBottom: number; // platform top it starts from
  /** broken ladders can only be climbed this many px from the bottom */
  broken?: number;
}

export interface Rivet { x: number; y: number; taken: boolean }
export interface Item { kind: 'purse' | 'hat' | 'umbrella'; x: number; y: number; taken: boolean }
export interface Hammer { x: number; y: number; taken: boolean }
export interface Shaft { x: number; dir: 1 | -1; yTop: number; yBottom: number }

export interface Stage {
  kind: StageKind;
  platforms: Platform[];
  ladders: Ladder[];
  hammers: Hammer[];
  items: Item[];
  rivets: Rivet[];
  shafts: Shaft[];
  mario: { x: number; y: number };
  kong: { x: number; y: number };
  pauline: { x: number; y: number };
  /** reaching this box wins the stage (except rivets) */
  goal: { x: number; y: number; w: number; h: number };
  oilDrum?: { x: number; y: number };
}

export function yAt(p: Platform, x: number): number {
  if (p.x1 === p.x0) return p.y0;
  const k = Math.max(0, Math.min(1, (x - p.x0) / (p.x1 - p.x0)));
  return p.y0 + (p.y1 - p.y0) * k;
}

function g(x0: number, y0: number, x1: number, y1: number): Platform {
  return { x0, y0, x1, y1 };
}

/** 25 m: six zig-zag girders, barrels roll from Kong at the top left to the oil drum at the bottom left. */
function barrels(): Stage {
  const platforms: Platform[] = [
    g(0, 248, 112, 248), g(112, 248, 224, 241), // bottom: flat then rising to the right
    g(0, 204, 208, 217), // down to the right
    g(16, 181, 224, 168), // down to the left
    g(0, 132, 208, 145),
    g(16, 109, 224, 96),
    g(0, 60, 208, 73), // Kong's girder
    g(88, 36, 144, 36), // Pauline's perch
  ];
  const ladders: Ladder[] = [
    { x: 184, yTop: 215.5, yBottom: 242.5 },
    { x: 80, yTop: 209, yBottom: 248, broken: 14 },
    { x: 32, yTop: 180, yBottom: 206 },
    { x: 112, yTop: 175, yBottom: 211, broken: 12 },
    { x: 184, yTop: 143.5, yBottom: 170.5 },
    { x: 112, yTop: 139, yBottom: 175 },
    { x: 32, yTop: 108, yBottom: 134 },
    { x: 80, yTop: 105, yBottom: 137, broken: 12 },
    { x: 184, yTop: 71.5, yBottom: 98.5 },
    { x: 128, yTop: 36, yBottom: 68 },
  ];
  return {
    kind: 'barrels', platforms, ladders,
    hammers: [{ x: 20, y: 160, taken: false }, { x: 172, y: 190, taken: false }],
    items: [], rivets: [], shafts: [],
    mario: { x: 40, y: 248 }, kong: { x: 12, y: 60 }, pauline: { x: 104, y: 36 },
    goal: { x: 88, y: 20, w: 56, h: 16 },
    oilDrum: { x: 8, y: 248 },
  };
}

/** 50 m: conveyor belts carrying cement pies; the top belt splits away from Kong in the middle. */
function conveyors(): Stage {
  const platforms: Platform[] = [
    g(0, 248, 224, 248),
    g(0, 216, 72, 216), g(152, 216, 224, 216),
    { ...g(24, 184, 200, 184), conveyor: { dir: 1, speed: 1 } },
    { ...g(0, 152, 88, 152), conveyor: { dir: -1, speed: 1 } }, { ...g(136, 152, 224, 152), conveyor: { dir: 1, speed: 1 } },
    { ...g(24, 120, 200, 120), conveyor: { dir: 1, speed: 1, splitX: 112 } },
    g(88, 64, 136, 64), // Pauline
  ];
  const ladders: Ladder[] = [
    { x: 32, yTop: 216, yBottom: 248 }, { x: 184, yTop: 216, yBottom: 248 },
    { x: 56, yTop: 184, yBottom: 216 }, { x: 160, yTop: 184, yBottom: 216 },
    { x: 40, yTop: 152, yBottom: 184 }, { x: 176, yTop: 152, yBottom: 184 },
    { x: 64, yTop: 120, yBottom: 152 }, { x: 152, yTop: 120, yBottom: 152 },
    { x: 120, yTop: 64, yBottom: 120 },
  ];
  return {
    kind: 'conveyors', platforms, ladders,
    hammers: [{ x: 8, y: 200, taken: false }, { x: 208, y: 136, taken: false }],
    items: [{ kind: 'hat', x: 12, y: 152, taken: false }, { kind: 'purse', x: 204, y: 216, taken: false }],
    rivets: [], shafts: [],
    mario: { x: 16, y: 248 }, kong: { x: 92, y: 120 }, pauline: { x: 104, y: 64 },
    goal: { x: 88, y: 48, w: 48, h: 16 },
    oilDrum: { x: 104, y: 248 },
  };
}

/** 75 m: an up elevator, a down elevator, ledges in between and springs bouncing along the top. */
function elevators(): Stage {
  const platforms: Platform[] = [
    g(0, 248, 40, 248), g(0, 200, 32, 200), g(0, 152, 32, 152),
    g(80, 176, 104, 176), g(80, 128, 104, 128), g(120, 208, 144, 208),
    g(160, 232, 224, 232), g(176, 184, 224, 184), g(160, 136, 224, 136),
    g(0, 72, 224, 72), // the top girder: springs bounce along it
    g(88, 40, 136, 40), // Pauline
  ];
  const ladders: Ladder[] = [
    { x: 16, yTop: 200, yBottom: 248 }, { x: 16, yTop: 152, yBottom: 200 },
    { x: 88, yTop: 128, yBottom: 176 },
    { x: 200, yTop: 184, yBottom: 232 }, { x: 184, yTop: 136, yBottom: 184 }, { x: 208, yTop: 72, yBottom: 136 },
    { x: 128, yTop: 40, yBottom: 72 },
  ];
  return {
    kind: 'elevators', platforms, ladders,
    hammers: [],
    items: [{ kind: 'hat', x: 88, y: 128, taken: false }, { kind: 'umbrella', x: 208, y: 136, taken: false }, { kind: 'purse', x: 20, y: 152, taken: false }],
    rivets: [],
    shafts: [{ x: 48, dir: -1, yTop: 96, yBottom: 248 }, { x: 56 + 48, dir: 1, yTop: 96, yBottom: 248 }],
    mario: { x: 8, y: 248 }, kong: { x: 8, y: 72 }, pauline: { x: 104, y: 40 },
    goal: { x: 88, y: 24, w: 48, h: 16 },
  };
}

/** 100 m: five floors held by eight rivets; walk over every rivet and Kong comes down. */
function rivets(): Stage {
  const floors = [248, 208, 168, 128, 88];
  const platforms: Platform[] = [];
  const rv: Rivet[] = [];
  floors.forEach((y, i) => {
    if (i === 0) { platforms.push(g(0, y, 224, y)); return; }
    platforms.push(g(16, y, 208, y));
    rv.push({ x: 64, y, taken: false }, { x: 152, y, taken: false });
  });
  platforms.push(g(88, 48, 136, 48));
  const ladders: Ladder[] = [
    { x: 32, yTop: 208, yBottom: 248 }, { x: 184, yTop: 208, yBottom: 248 },
    { x: 104, yTop: 168, yBottom: 208 }, { x: 40, yTop: 168, yBottom: 208 }, { x: 176, yTop: 168, yBottom: 208 },
    { x: 32, yTop: 128, yBottom: 168 }, { x: 184, yTop: 128, yBottom: 168 },
    { x: 104, yTop: 88, yBottom: 128 }, { x: 40, yTop: 88, yBottom: 128 }, { x: 176, yTop: 88, yBottom: 128 },
  ];
  return {
    kind: 'rivets', platforms, ladders,
    hammers: [{ x: 24, y: 148, taken: false }, { x: 196, y: 108, taken: false }],
    items: [{ kind: 'purse', x: 100, y: 208, taken: false }, { kind: 'hat', x: 24, y: 128, taken: false }, { kind: 'umbrella', x: 196, y: 168, taken: false }],
    rivets: rv, shafts: [],
    mario: { x: 8, y: 248 }, kong: { x: 92, y: 88 }, pauline: { x: 104, y: 48 },
    goal: { x: -100, y: -100, w: 0, h: 0 }, // won by the rivets, not by reaching Pauline
  };
}

export function buildStage(kind: StageKind): Stage {
  switch (kind) {
    case 'barrels': return barrels();
    case 'conveyors': return conveyors();
    case 'elevators': return elevators();
    case 'rivets': return rivets();
  }
}

/** The platform directly under a point (within `tol` px below the feet), highest first. */
export function platformUnder(stage: Stage, x: number, feet: number, tol = 4): Platform | null {
  let best: Platform | null = null;
  let bestY = Infinity;
  for (const p of stage.platforms) {
    if (x < Math.min(p.x0, p.x1) || x > Math.max(p.x0, p.x1)) continue;
    const y = yAt(p, x);
    if (y >= feet - 1 && y <= feet + tol && y < bestY) { best = p; bestY = y; }
  }
  return best;
}

/** The first platform below a point, for falling. */
export function platformBelow(stage: Stage, x: number, feet: number): Platform | null {
  let best: Platform | null = null;
  let bestY = Infinity;
  for (const p of stage.platforms) {
    if (x < Math.min(p.x0, p.x1) || x > Math.max(p.x0, p.x1)) continue;
    const y = yAt(p, x);
    if (y >= feet - 1 && y < bestY) { best = p; bestY = y; }
  }
  return best;
}

/** A rivet gap: 8 px of missing floor where a rivet was taken. */
export function rivetGapAt(stage: Stage, x: number, y: number): boolean {
  return stage.rivets.some((r) => r.taken && Math.abs(r.y - y) < 2 && x >= r.x && x < r.x + 8);
}
