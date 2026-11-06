export const W = 256;
export const H = 224;

export const HUD_H = 28; // score, course bar, time
export const GROUND_Y = 180; // the moon's surface
export const BOTTOM_HUD_Y = 206;

export const BUGGY_X = 48; // screen x of the buggy at cruising speed
export const BUGGY_W = 24;
export const BUGGY_H = 14;
export const SPEED_CRUISE = 64; // px/s of ground scrolling
export const SPEED_FAST = 108;
export const SPEED_SLOW = 36;
export const ACCEL = 120; // px/s^2 towards the wanted speed
export const SHIFT_RANGE = 28; // the buggy creeps forward/back on screen with the throttle
export const JUMP_TIME = 0.78;
export const JUMP_H = 34;

export const SHOT_SPEED = 300;
export const SHOT_LIFE = 0.8;
export const FIRE_GAP = 0.18;

/** The beginner course runs from A to Z; every fifth letter is a checkpoint. */
export const LETTERS = 26;
export const LETTER_LEN = 480; // px of ground per letter
export const COURSE_LEN = LETTERS * LETTER_LEN;
export const CHECKPOINTS = [5, 10, 15, 20, 25]; // E J O T Z (letter index + 1 reached)
export const PAR_TIME = 40; // seconds per five-letter section for the full bonus
export const CHECKPOINT_BONUS = 1000;
export const CHECKPOINT_BONUS_SLOW = 500;
export const COURSE_BONUS = 5000;

export const POINTS = { rock: 50, bigRock: 100, mine: 100, ufoSmall: 200, ufoBig: 300, ufoFast: 500, tank: 400 } as const;

export const START_LIVES = 3;
export const EXTRA_LIVES_AT = [10000, 30000, 50000];
export const DEATH_TIME = 1.5;

export const CRATER_SMALL = 24;
export const CRATER_BIG = 42;
export const ROCK_W = 12;
export const BIG_ROCK_W = 20;
export const MINE_W = 10;
export const TANK_W = 20;
export const UFO_W = 16;
export const BOMB_SPEED = 90;
export const TANK_SHOT_SPEED = 140;

export type Course = 'beginner' | 'champion';

export function letterOf(distance: number): number {
  return Math.max(0, Math.min(LETTERS - 1, Math.floor(distance / LETTER_LEN)));
}

export function letterName(i: number): string {
  return String.fromCharCode(65 + i);
}
