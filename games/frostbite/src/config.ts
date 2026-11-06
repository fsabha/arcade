export const W = 320;
export const H = 240;
export const PX = 2; // Atari-style wide pixels

export const HUD_H = 24;
export const SHORE_TOP = 24;
export const SHORE_BOTTOM = 72; // water starts here
export const SHORE_Y = 64; // Bailey's feet on the shore
export const ROWS = 4;
export const ROW_FEET = [104, 140, 176, 212]; // Bailey's feet when standing on each row
export const FLOE_H = 10;
export const FLOES_PER_ROW = 3;
export const ROW_PERIOD = W; // floes wrap around the screen

export const BAILEY_W = 16;
export const BAILEY_H = 24;
export const BAILEY_SPEED = 70; // px/s on foot
export const AIR_STEER = 50; // px/s while jumping
export const JUMP_TIME = 0.42;
export const JUMP_ARC = 10; // extra lift at the top of the jump
export const LAND_TOLERANCE = 4; // px of the feet that may hang over the floe edge

export const IGLOO_X = 236;
export const IGLOO_Y = SHORE_Y; // base line
export const IGLOO_BLOCKS = 16; // the 16th is the door
export const IGLOO_DOOR_X = IGLOO_X + 20; // where Bailey must stand to enter

export const TEMP_START = 45;
export const TEMP_RATE = 1; // degrees per second
export const START_RESERVE = 3; // plus the active Bailey
export const MAX_RESERVE = 9;
export const EXTRA_LIFE_EVERY = 5000;
export const FISH_POINTS = 200;
export const MAX_SCORE_LEVEL = 9; // scoring stops growing after level 9

export const DEATH_TIME = 1.3;
export const ENTER_TIME = 2.2; // celebration when entering the igloo

export const BEAR_LEVEL = 4;
export const BEAR_SPEED = 34;
export const BEAR_SAFE_X = 28; // the bear never reaches the extreme left of the shore
export const BEAR_W = 32;

/** Floe width (px) by level: later levels break the ice into smaller pieces. */
export function floeWidth(level: number): number {
  if (level <= 2) return 48;
  if (level <= 5) return 36;
  return 24;
}

/** Floe speed (px/s) by level. */
export function floeSpeed(level: number): number {
  return Math.min(84, 26 + (level - 1) * 7);
}

export function blockPoints(level: number): number {
  return 10 * Math.min(level, MAX_SCORE_LEVEL);
}

export function iglooPoints(level: number): number {
  return 160 * Math.min(level, MAX_SCORE_LEVEL);
}

export function degreeBonus(level: number, degrees: number): number {
  return 10 * degrees * Math.min(level, MAX_SCORE_LEVEL);
}

export function isNight(level: number): boolean {
  return Math.floor((level - 1) / 4) % 2 === 1; // four igloos per shift
}
