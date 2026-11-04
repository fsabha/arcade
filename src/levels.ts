/** Per-level tables from the Pac-Man Dossier. Levels are 1-based; values beyond the table repeat the last. */

export interface SpeedSpec {
  pac: number; // % of FULL_SPEED
  ghost: number;
  tunnel: number;
  frightPac: number;
  frightGhost: number;
  frightTime: number; // seconds (0 = ghosts don't turn blue)
  flashes: number;
}

export function speeds(level: number): SpeedSpec {
  const l = Math.max(1, level);
  const frightTimes = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0];
  const flashes = [5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 3, 3, 5, 3, 3, 0, 3, 0, 0];
  const ft = l <= 20 ? frightTimes[l - 1] : 0;
  const fl = l <= 20 ? flashes[l - 1] : 0;
  if (l === 1) return { pac: 0.8, ghost: 0.75, tunnel: 0.4, frightPac: 0.9, frightGhost: 0.5, frightTime: ft, flashes: fl };
  if (l <= 4) return { pac: 0.9, ghost: 0.85, tunnel: 0.45, frightPac: 0.95, frightGhost: 0.55, frightTime: ft, flashes: fl };
  if (l <= 20) return { pac: 1.0, ghost: 0.95, tunnel: 0.5, frightPac: 1.0, frightGhost: 0.6, frightTime: ft, flashes: fl };
  return { pac: 0.9, ghost: 0.95, tunnel: 0.5, frightPac: 0.9, frightGhost: 0.6, frightTime: 0, flashes: 0 };
}

/** Cruise Elroy: Blinky speeds up when few dots remain. */
export function elroy(level: number): { dots1: number; speed1: number; dots2: number; speed2: number } {
  const l = Math.max(1, level);
  if (l === 1) return { dots1: 20, speed1: 0.8, dots2: 10, speed2: 0.85 };
  if (l === 2) return { dots1: 30, speed1: 0.9, dots2: 15, speed2: 0.95 };
  if (l <= 4) return { dots1: 40, speed1: 0.9, dots2: 20, speed2: 0.95 };
  if (l === 5) return { dots1: 40, speed1: 1.0, dots2: 20, speed2: 1.05 };
  if (l <= 8) return { dots1: 50, speed1: 1.0, dots2: 25, speed2: 1.05 };
  if (l <= 11) return { dots1: 60, speed1: 1.0, dots2: 30, speed2: 1.05 };
  if (l <= 14) return { dots1: 80, speed1: 1.0, dots2: 40, speed2: 1.05 };
  if (l <= 18) return { dots1: 100, speed1: 1.0, dots2: 50, speed2: 1.05 };
  return { dots1: 120, speed1: 1.0, dots2: 60, speed2: 1.05 };
}

/** Scatter/chase schedule: alternating durations in seconds, last chase is infinite. */
export function modeSchedule(level: number): number[] {
  if (level === 1) return [7, 20, 7, 20, 5, 20, 5, Infinity];
  if (level <= 4) return [7, 20, 7, 20, 5, 1033, 1 / 60, Infinity];
  return [5, 20, 5, 20, 5, 1037, 1 / 60, Infinity];
}

export type FruitKind = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'melon' | 'galaxian' | 'bell' | 'key';

export function fruitFor(level: number): { kind: FruitKind; points: number } {
  const l = Math.max(1, level);
  if (l === 1) return { kind: 'cherry', points: 100 };
  if (l === 2) return { kind: 'strawberry', points: 300 };
  if (l <= 4) return { kind: 'orange', points: 500 };
  if (l <= 6) return { kind: 'apple', points: 700 };
  if (l <= 8) return { kind: 'melon', points: 1000 };
  if (l <= 10) return { kind: 'galaxian', points: 2000 };
  if (l <= 12) return { kind: 'bell', points: 3000 };
  return { kind: 'key', points: 5000 };
}

/** Personal dot counters that release Pinky/Inky/Clyde from the house. */
export function houseLimits(level: number): { pinky: number; inky: number; clyde: number } {
  if (level === 1) return { pinky: 0, inky: 30, clyde: 60 };
  if (level === 2) return { pinky: 0, inky: 0, clyde: 50 };
  return { pinky: 0, inky: 0, clyde: 0 };
}

/** Seconds without eating a dot before the next ghost is forced out. */
export function houseTimeout(level: number): number {
  return level <= 4 ? 4 : 3;
}

/** Intermission (coffee break) shown after finishing this level, or 0. */
export function intermissionAfter(level: number): 0 | 1 | 2 | 3 {
  if (level === 2) return 1;
  if (level === 5) return 2;
  if (level === 9 || level === 13 || level === 17) return 3;
  return 0;
}
