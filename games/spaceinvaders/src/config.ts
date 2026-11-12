export const W = 240;
export const H = 320;
export const HUD_TOP = 16;
export const HUD_BOTTOM = 20;
export const PLAY_TOP = HUD_TOP;
export const PLAY_BOTTOM = H - HUD_BOTTOM; // 300

export const PLAYER_W = 13;
export const PLAYER_H = 8;
export const PLAYER_Y = PLAY_BOTTOM - 16; // top of cannon (284)
export const PLAYER_VX = 72; // px/s, constant
export const PLAYER_MIN_X = 8;
export const PLAYER_MAX_X = W - 8 - PLAYER_W;

export const BULLET_VY = 320; // player shot px/s (up)
export const BULLET_W = 1;
export const BULLET_H = 4;

export const SHOT_VY = 110; // invader shot px/s (down)
export const SHOT_W = 3;
export const SHOT_H = 7;
export const MAX_SHOTS = 3;

export const ROWS = 5;
export const COLS = 11;
export const CELL_W = 16;
export const CELL_H = 12;
export const FORMATION_X0 = 24; // initial left of formation
export const FORMATION_Y0 = 44; // initial top (wave 1)
export const FORMATION_Y_PER_WAVE = 8;
export const FORMATION_Y_MAX = FORMATION_Y0 + 8 * 6;
export const STEP_X = 4; // px per tick
export const STEP_DOWN = 8; // px per edge drop
export const FORMATION_MARGIN = 8; // min distance to screen edge
export const INVASION_Y = PLAYER_Y; // invader bottom reaching this => game over

export const TICK_MAX = 0.55; // seconds between ticks at full formation
export const TICK_MIN = 0.045; // with one invader left
export const WAVE_SPEEDUP = 0.06; // tick interval multiplier reduction per wave (min 0.55)

export const SHIELDS = 4;
export const SHIELD_W = 22;
export const SHIELD_H = 16;
export const SHIELD_Y = PLAYER_Y - 32; // 252
export const SHIELD_GAP = (W - SHIELDS * SHIELD_W) / (SHIELDS + 1);

export const UFO_W = 16;
export const UFO_H = 7;
export const UFO_Y = HUD_TOP + 6;
export const UFO_VX = 42;
export const UFO_INTERVAL_MIN = 18; // seconds between appearances
export const UFO_INTERVAL_MAX = 30;
export const UFO_POINTS = [50, 100, 150, 300] as const;
export const UFO_WEIGHTS = [10, 6, 3, 1] as const;

export const START_LIVES = 3;
export const EXTRA_LIFE_AT = 1500; // single extra life (original)
export const MAX_LIVES = 6;
export const ROW_POINTS = [30, 20, 20, 10, 10] as const; // by row index (0 = top)

export const DYING_TIME = 1.4;
export const WAVE_CLEAR_TIME = 1.8;
export const RESPAWN_GRACE = 1.0;
