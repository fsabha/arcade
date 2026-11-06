export const W = 320;
export const H = 240;
export const PX = 2; // Atari-style wide pixels for the cities

export const HUD_H = 18;
export const GROUND_Y = 204; // top of the orange ground
export const SKY_TOP = HUD_H; // enemy missiles enter here

export const BASE_X = W / 2; // the single missile base, bottom centre
export const CITY_X = [40, 80, 120, 200, 240, 280]; // city centres
export const CITY_W = 20;
export const CITY_H = 8;
export const CITIES = 6;

export const ABMS_PER_WAVE = 30; // manual: 30 ABMs, 10 loaded at a time
export const ABMS_LOADED = 10;
export const MAX_ABMS_FLYING = 3; // manual: "You may fire up to three defense missiles simultaneously"
export const ABM_SPEED_B = 300; // px/s, difficulty b (normal)
export const ABM_SPEED_A = 190; // difficulty a: ABMs move at a slower pace

export const EXPLOSION_R = 15;
export const EXPLOSION_GROW = 0.45;
export const EXPLOSION_HOLD = 0.35;
export const EXPLOSION_SHRINK = 0.4;
export const CHAIN_R = 9; // a destroyed enemy missile bursts too

export const CURSOR_SLOW = 95; // px/s
export const CURSOR_FAST = 170;
export const CURSOR_MIN_Y = HUD_H + 6;
export const CURSOR_MAX_Y = GROUND_Y - 6;

export const POINTS = { icbm: 25, cruise: 125, abm: 5, city: 100 } as const;
export const BONUS_CITY_EVERY = 10000;
export const CRUISE_FROM_WAVE = 7; // "After the 6th wave ... the enemy may attack with cruise missiles"
export const CRUISE_ALT_MIN = 60;
export const CRUISE_ALT_MAX = 110;
export const CRUISE_SPEED = 42;
export const CRUISE_EVADE_R = 40;
export const CRUISE_EVADE_SPEED = 70;
export const CRUISE_H = 4;

export const MIRV_FROM_WAVE = 3;
export const MIRV_CHANCE = 0.3;

export const TALLY_TIME = 2.4;
export const WAVE_START_TIME = 1.4;
export const BASE_REARM_TIME = 1.0;

/** Manual table 1: waves 1-2 single, 3-4 double ... 11 and above six times. */
export function multiplier(wave: number): number {
  return Math.min(6, Math.ceil(wave / 2));
}

/** Enemy missiles in a wave. Wave 13 is the hardest; past it nothing grows. */
export function waveMissiles(wave: number, children: boolean): number {
  const w = Math.min(13, wave);
  return children ? 6 + w : Math.min(30, 10 + w * 2);
}

export function icbmSpeed(wave: number, children: boolean): number {
  const w = Math.min(13, wave);
  const v = 16 + w * 3.2;
  return children ? v * 0.6 : v;
}

/** Enemy missiles in the air at once. */
export function maxInFlight(wave: number, children: boolean): number {
  const w = Math.min(13, wave);
  return children ? 2 + Math.floor(w / 4) : 3 + Math.floor(w / 2);
}

export function spawnGap(wave: number, children: boolean): number {
  const w = Math.min(13, wave);
  const g = Math.max(0.45, 1.5 - w * 0.08);
  return children ? g * 1.6 : g;
}
