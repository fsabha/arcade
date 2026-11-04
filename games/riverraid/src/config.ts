// Logical canvas size (scaled up by CSS). Vertical 3:4.
export const W = 240;
export const H = 320;
export const HUD_H = 48;
export const PLAY_H = H - HUD_H; // 272

// Player sits at a fixed screen position; world y of its bottom edge = camY + PLAYER_Y_OFFSET
export const PLAYER_Y_OFFSET = 24;
export const PLAYER_W = 16;
export const PLAYER_H = 16;
export const PLAYER_VX = 110; // px/s lateral (max)
export const PLAYER_ACCEL = 420; // px/s^2 ramp-up while holding
export const PLAYER_DECEL = 900; // px/s^2 when released

export type SpeedMode = 'slow' | 'normal' | 'fast';
export const SPEED: Record<SpeedMode, number> = { slow: 40, normal: 80, fast: 150 }; // scroll px/s
export const FUEL_DRAIN: Record<SpeedMode, number> = { slow: 1.7, normal: 2.5, fast: 3.6 }; // units/s

export const BULLET_VY = 340;
export const MAX_BULLETS = 2;
export const FIRE_COOLDOWN = 0.16;

export const FUEL_MAX = 100;
export const FUEL_REFILL = 24; // units/s while over a depot
export const FUEL_LOW = 25;

export const START_LIVES = 3;
export const EXTRA_LIFE_EVERY = 10000;
export const MAX_LIVES_DISPLAY = 6;

export const POINTS = { ship: 30, heli: 60, fuel: 80, jet: 100, bridge: 500 } as const;

// River generation
export const KEY_STEP = 48; // px between keypoints
export const SECTION_KEYS = 30; // keypoints per section
export const SECTION_LEN = KEY_STEP * SECTION_KEYS; // 1440 px
export const BANK_MARGIN = 12; // minimum land on each side
export const MIN_CHANNEL = 28; // minimum water width beside an island
export const BRIDGE_WIDTH = 96;
export const BRIDGE_H = 16;
export const BRIDGE_Y_FROM_END = 48; // bridge bottom edge = section.endY - this

export const DYING_TIME = 1.6;
