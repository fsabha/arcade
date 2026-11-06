// Logical canvas size (scaled up by CSS). Landscape 4:3.
export const W = 320;
export const H = 240;
export const HUD_TOP = 22; // score strip
export const SURFACE_Y = 42; // water line
export const FLOOR_Y = 198; // top of the sea floor
export const HUD_BOTTOM = 208; // oxygen strip starts here

// Enemy / diver lanes (sprite centre y)
export const LANES = [72, 104, 136, 168] as const;
export const LANE_H = 8;

// Player
export const PLAYER_W = 16;
export const PLAYER_H = 8;
export const PLAYER_VX = 92;
export const PLAYER_VY = 70;
export const PLAYER_MIN_Y = SURFACE_Y - 4; // sits half out of the water
export const PLAYER_MAX_Y = FLOOR_Y - PLAYER_H;
export const DIVE_Y = SURFACE_Y + 12; // below this the sub counts as "dived"
export const TORPEDO_V = 230;
export const TORPEDO_W = 6;
export const TORPEDO_H = 2;

// Oxygen
export const OXYGEN_MAX = 64;
export const OXYGEN_TIME = 55; // seconds from full to empty
export const OXYGEN_REFILL_TIME = 2.6; // seconds to refill at the surface
export const OXYGEN_LOW = 16;

// Enemies
export const ENEMY_W = 16;
export const ENEMY_H = 8;
export const DIVER_W = 8;
export const DIVER_H = 8;
export const PATROL_W = 24;
export const PATROL_H = 8;
export const MAX_DIVERS = 6;
export const ENEMY_TORPEDO_V = 130;

// Rules
export const START_LIVES = 3;
export const EXTRA_LIFE_EVERY = 10000;
export const MAX_LIVES_DISPLAY = 6;
export const DYING_TIME = 1.6;
export const CONTINUE_TIME = 6; // seconds the "press to continue" breather waits before launching the next sub by itself
export const BANNER_TIME = 2.2;
