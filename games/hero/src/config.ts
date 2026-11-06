export const W = 320;
export const H = 240;
export const PX = 2;
export const TILE = 16;
export const COLS = 20; // tiles per screen
export const ROWS = 12;
export const VIEW_H = ROWS * TILE; // 192, HUD below
export const HUD_Y = VIEW_H;

export const HERO_W = 12;
export const HERO_H = 20;
export const WALK_SPEED = 72;
export const FLY_SPEED = 72;
export const RISE_SPEED = 84;
export const FALL_SPEED = 66; // the prop-pack slows the descent
export const LASER_RANGE = 44;
export const LASER_BURN_TIME = 1.6; // seconds of beam to cut a wall block
export const DYNAMITE_PER_LIFE = 6;
export const FUSE_TIME = 1.5;
export const BLAST_RADIUS = 26; // px from the stick: walls destroyed, hero killed
export const BLAST_SHOW = 0.45;

export const POWER_MAX = 255;
export const POWER_DRAIN = 1 / 0.33; // units per second (~85 s per level)
export const START_RESERVE = 3;
export const MAX_RESERVE = 6;
export const EXTRA_LIFE_EVERY = 20000;
export const MAX_SCORE = 1000000;

export const POINTS = { critter: 50, wall: 75, miner: 1000, dynamite: 50 };
export function powerUnitValue(level: number): number {
  return 5 + Math.min(level, 20);
}
export const GAME_STARTS = [1, 5, 9, 13, 17]; // game select 1..5
export const LAST_LEVEL = 20;
export const DEATH_TIME = 1.4;
export const RESCUE_TIME = 2.4;

/** Everything moves faster the deeper you go. */
export function speedFactor(level: number): number {
  return 1 + Math.min(level - 1, 24) * 0.05;
}
