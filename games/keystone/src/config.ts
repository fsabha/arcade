export const W = 320;
export const H = 240;
export const PX = 2; // Atari-style wide pixels

export const SCREENS = 3; // each floor of Southwick's is three screens wide
export const WORLD_W = W * SCREENS;
export const HUD_H = 24;

/** Feet line of floors 0..2 and the roof (3). */
export const FEET = [192, 148, 104, 60];
export const ROOF = 3;
export const SLAB_H = 6; // floor slab under the feet line
export const SCANNER_Y = 204; // Southwick's Security System box

export const KELLY_W = 16;
export const KELLY_H = 22;
export const DUCK_H = 12;
export const KELLY_SPEED = 104;
export const JUMP_TIME = 0.55;
export const JUMP_H = 18;
export const HARRY_W = 16;
export const HARRY_H = 22;

/** Escalators: side of each floor (0..2) that leads one floor up, and their width. */
export const ESC_SIDE: (1 | -1)[] = [1, -1, 1];
export const ESC_W = 48;
export const ESC_MARGIN = 8;
export const ESC_TIME = 1.5;

export const ELEV_X = WORLD_W / 2; // centre of the elevator door
export const ELEV_W = 24;
export const ELEV_DWELL = 1.6; // doors open
export const ELEV_TRAVEL = 1.1; // one floor
export const ELEV_TOP = 2; // the elevator never reaches the roof

export const TIMER_START = 50;
export const TIMER_WARN = 10;
export const HIT_PENALTY = 9;
export const KO_TIME = 0.9;
export const DEATH_TIME = 1.6;
export const CAUGHT_TIME = 2.0;
export const START_RESERVE = 3;
export const MAX_RESERVE = 3;
export const BONUS_KOP_EVERY = 10000;
export const LOOT_POINTS = 50;

export const KELLY_START_X = 48;
export const HARRY_START_X = 360;

export const CART_W = 16;
export const CART_H = 10;
export const BALL_W = 8;
export const BALL_H = 8;
export const RADIO_W = 12;
export const RADIO_H = 10;
export const PLANE_W = 16;
export const PLANE_H = 6;
export const PLANE_ALT = 14; // bottom of the plane above the feet line: duck under it
export const LOOT_W = 8;
export const LOOT_H = 8;

export function harrySpeed(krook: number): number {
  return Math.min(112, 68 + (krook - 1) * 5);
}

export function cartSpeed(krook: number): number {
  return Math.min(110, 70 + (krook - 1) * 4);
}

export function ballSpeed(krook: number): number {
  return Math.min(96, 60 + (krook - 1) * 3);
}

/** Beach balls bounce higher as the krooks go by: past Kelly's jump you have to duck. */
export function ballBounce(krook: number): number {
  return Math.min(34, 14 + (krook - 1) * 4);
}

export function planeSpeed(krook: number): number {
  return Math.min(190, 120 + (krook - 1) * 6);
}

export function spawnInterval(krook: number): number {
  return Math.max(1.1, 2.3 - (krook - 1) * 0.12);
}

export function maxObstacles(krook: number): number {
  return Math.min(5, 2 + Math.floor(krook / 3));
}

export function hasPlanes(krook: number): boolean {
  return krook >= 2;
}

export function hasRadios(krook: number): boolean {
  return krook >= 3;
}

/** Manual: krooks 1-8 pay 100x the timer, 9-16 pay 200x, from the 17th 300x. */
export function catchMultiplier(krook: number): number {
  return krook <= 8 ? 100 : krook <= 16 ? 200 : 300;
}

export function screenOf(x: number): number {
  return Math.max(0, Math.min(SCREENS - 1, Math.floor(x / W)));
}
