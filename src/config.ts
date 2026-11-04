// Canvas: 320x200. Horizontal world units are Atari "u" (160 across); 1 u = 2 px.
// Vertical layout is 1 px per original scanline (the 2600 draws 192 lines).
export const W = 320;
export const H = 200;
export const PX = 2; // px per horizontal world unit

export const HUD_H = 16;
export const LEAVES_TOP = 16;
export const LEAVES_H = 24;
export const JUNGLE_TOP = LEAVES_TOP + LEAVES_H; // 40
export const GROUND_Y = 120; // Harry's feet on the surface
export const GROUND_H = 12;
export const DIRT_TOP = GROUND_Y + GROUND_H; // 132
export const TUNNEL_TOP = 150;
export const TUNNEL_Y = 174; // Harry's feet underground
export const BOTTOM_TOP = TUNNEL_Y;

export const HARRY_W = 16;
export const HARRY_H = 22;
export const RUN_SPEED = 60; // px/s (0.5 u per frame)
export const JUMP_TIME = 32 / 60;
export const JUMP_PEAK = 11;
export const FALL_SPEED = 100; // px/s when dropping into a hole
export const CLIMB_SPEED = 30; // px/s on the ladder
export const DROP_SPEED = 120; // respawn drop from the trees

export const X_MIN = 16; // u 8
export const X_MAX = 296; // u 148
export const RESPAWN_X = 40; // u 20

export const LOG_SPEED = 60; // px/s (1 u every 2 frames)
export const LOG_W = 16;
export const LOG_H = 8;
export const LOG_DRAIN = 60; // points per second while touching a log
export const SCORPION_SPEED = 15; // px/s (1 u every 8 frames)

export const PIT_CENTER = 152; // u 76 -> px
export const PIT_HALF_MAX = 64; // u 32 -> zone [44,108)
export const SHIFT_TABLE = [0, 4, 8, 16, 28, 32, 28, 16, 8, 4]; // half widths in u
export const SHIFT_STEP = 32 / 60; // seconds per table entry
export const CROC_PERIOD = 128 / 60; // jaws alternate every 128 frames

export const LADDER_X = 144; // px, u 72
export const LADDER_W = 16;
export const LADDER_GRAB = 14; // px tolerance for Harry's x
export const WALL_LEFT_X = 34; // u 17
export const WALL_RIGHT_X = 272; // u 136
export const WALL_W = 16;

export const VINE_ANCHOR_X = 160;
export const VINE_ANCHOR_Y = JUNGLE_TOP;
export const VINE_LEN = 92;
export const VINE_MAX_ANGLE = 0.86; // rad (~49 deg)
export const VINE_PERIOD = 2.6;

export const TREASURE_X = 248; // u 124
export const HAZARD_X = 248; // fire / snake

export const START_SCORE = 2000;
export const START_LIVES = 3;
export const GAME_TIME = 20 * 60;
export const FALL_PENALTY = 100;
export const TREASURE_VALUES = [2000, 3000, 4000, 5000]; // money, silver, gold, ring
export const TOTAL_TREASURES = 32;
export const DEATH_TIME = 1.4;
export const START_ROOM = 0xc4;
