import { Dir, DX, DY, DIRS, OPPOSITE, NO_UP_TILES, SCATTER_TARGETS } from './config';
import { dist2 } from './actors';

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';
export const GHOSTS: readonly GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];

export interface Tile {
  x: number;
  y: number;
}

/** Chase targets, including the famous "up" overflow bug of Pinky and Inky. */
export function chaseTarget(name: GhostName, pac: Tile, pacDir: Dir, blinky: Tile, self: Tile): Tile {
  switch (name) {
    case 'blinky':
      return { x: pac.x, y: pac.y };
    case 'pinky': {
      const t = { x: pac.x + DX[pacDir] * 4, y: pac.y + DY[pacDir] * 4 };
      if (pacDir === 'up') t.x -= 4;
      return t;
    }
    case 'inky': {
      const p = { x: pac.x + DX[pacDir] * 2, y: pac.y + DY[pacDir] * 2 };
      if (pacDir === 'up') p.x -= 2;
      return { x: blinky.x + (p.x - blinky.x) * 2, y: blinky.y + (p.y - blinky.y) * 2 };
    }
    case 'clyde':
      return dist2(self.x, self.y, pac.x, pac.y) > 64 ? { x: pac.x, y: pac.y } : SCATTER_TARGETS.clyde;
  }
}

export function scatterTarget(name: GhostName): Tile {
  return SCATTER_TARGETS[name];
}

/**
 * Direction a ghost takes when leaving tile `at`, heading toward `target`.
 * Never reverses; prefers up, left, down, right on ties; respects the no-up tiles when `restrictUp`.
 */
export function chooseDir(
  at: Tile, current: Dir, target: Tile, isOpen: (c: number, r: number) => boolean, restrictUp: boolean,
): Dir {
  let best: Dir | null = null;
  let bestD = Infinity;
  for (const d of DIRS) {
    if (d === OPPOSITE[current]) continue;
    if (restrictUp && d === 'up' && NO_UP_TILES.some((t) => t.x === at.x && t.y === at.y)) continue;
    const c = at.x + DX[d];
    const r = at.y + DY[d];
    if (!isOpen(c, r)) continue;
    const dd = dist2(c, r, target.x, target.y);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best ?? OPPOSITE[current];
}

/** Frightened ghosts pick a random open direction (never reversing unless stuck). */
export function randomDir(at: Tile, current: Dir, isOpen: (c: number, r: number) => boolean, rnd: () => number): Dir {
  const opts = DIRS.filter((d) => d !== OPPOSITE[current] && isOpen(at.x + DX[d], at.y + DY[d]));
  if (opts.length === 0) return OPPOSITE[current];
  return opts[Math.floor(rnd() * opts.length)];
}
