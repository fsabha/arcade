export const W = 320;
export const H = 240;

export const HUD_H = 20;
export const SKY_TOP = HUD_H;
export const HORIZON_Y = 150; // mountains sit here
export const GROUND_Y = 196; // trucks drive here
export const SCANNER_Y = 206;
export const SCANNER_H = 30;

/** The desert is a loop five screens long: the scanner shows "roughly 5 miles", the screen "about 1 mile". */
export const WORLD_W = W * 5;

export const CHOPPER_W = 24;
export const CHOPPER_H = 10;
export const CHOPPER_SPEED_X = 150;
export const CHOPPER_SPEED_Y = 90;
export const CHOPPER_MIN_Y = SKY_TOP + 8;
export const CHOPPER_MAX_Y = GROUND_Y - CHOPPER_H - 2;
export const CHOPPER_SCREEN_LEAD = 100; // distance from the screen edge the chopper flies at, facing forward
export const BULLET_SPEED = 360;
export const BULLET_LIFE = 0.6;
export const FIRE_GAP_FAST = 0.1; // difficulty b
export const FIRE_GAP_SLOW = 0.22; // difficulty a

export const TRUCKS = 12;
export const TRUCK_W = 16;
export const TRUCK_H = 8;
export const TRUCK_GAP = 36;
export const TRUCK_SPEED = 8; // the convoy crawls right to left

export const ENEMIES_PER_WAVE = 12;
export const HELI_W = 20;
export const HELI_H = 10;
export const JET_W = 20;
export const JET_H = 7;
export const POINTS = { heli: 100, jet: 200 } as const;
export const TRUCK_BONUS = 100; // x trucks x wave
export const MAX_WAVE_SPEED = 10;

export const MISSILE_SPEED = 120;
export const MISSILE_SPLIT_TIME = 0.5;
export const MISSILE_LIFE = 3.5;

export const START_CHOPPERS = 3;
export const MAX_CHOPPERS = 6;
export const EXTRA_EVERY = 10000;
export const DEATH_TIME = 1.6;
export const WAVE_PAUSE = 2.0;

export type Level = 'cadet' | 'commander';

export function heliSpeed(wave: number, level: Level): number {
  const w = Math.min(MAX_WAVE_SPEED, wave);
  return (38 + w * 7) * (level === 'commander' ? 1.25 : 1);
}

export function jetSpeed(wave: number, level: Level): number {
  return heliSpeed(wave, level) * 1.8;
}

/** Shots per second per enemy, roughly. */
export function fireRate(wave: number, level: Level): number {
  const w = Math.min(MAX_WAVE_SPEED, wave);
  return (0.12 + w * 0.03) * (level === 'commander' ? 1.6 : 1);
}

export function jetsInWave(wave: number): number {
  return Math.min(6, 1 + Math.floor(wave / 2));
}

export function wrapX(x: number): number {
  return ((x % WORLD_W) + WORLD_W) % WORLD_W;
}

/** Shortest signed distance from a to b on the loop. */
export function deltaX(a: number, b: number): number {
  let d = wrapX(b - a);
  if (d > WORLD_W / 2) d -= WORLD_W;
  return d;
}
