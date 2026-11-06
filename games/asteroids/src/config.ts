export const W = 320;
export const H = 240;
export const PX = 2; // Atari pixel = 2x2 px (the cartridge uses a two-line kernel)
export const HUD_H = 20;
export const FIELD_TOP = HUD_H;
export const FIELD_H = H - HUD_H;

export const SHIP_R = 7; // collision radius
export const ROT_STEPS = 16;
export const ROT_RATE = 14; // steps per second while the stick is held
export const THRUST = 170; // px/s^2
export const MAX_SPEED = 150;
export const DRAG = 0.35; // fraction of speed lost per second
export const SHOT_SPEED = 230;
export const SHOT_LIFE = 0.85;
export const MAX_SHOTS = 3;
export const FIRE_COOLDOWN = 0.14;

export const SIZES = ['large', 'medium', 'small'] as const;
export type Size = (typeof SIZES)[number];
export const RADIUS: Record<Size, number> = { large: 12, medium: 7, small: 4 };
export const POINTS: Record<Size, number> = { large: 20, medium: 50, small: 100 };
export const SPEED_SLOW: Record<Size, number> = { large: 26, medium: 38, small: 54 };
export const FAST_FACTOR = 1.6;
export const START_ASTEROIDS = 6;
export const ASTEROIDS_PER_WAVE = 2;
export const MAX_ASTEROIDS_START = 12;

export const SATELLITE_POINTS = 200;
export const UFO_POINTS = 1000;
export const SATELLITE_SPEED = 48;
export const UFO_SPEED = 72;
export const SAUCER_GAP_MIN = 9; // seconds between saucers
export const SAUCER_GAP_MAX = 16;
export const UFO_SOMETIMES_AT = 7500;
export const UFO_ALWAYS_AT = 15000;
export const SAUCER_SHOT_SPEED = 190;
export const SATELLITE_FIRE_EVERY = 1.6;
export const UFO_FIRE_EVERY = 1.1;
export const SATELLITE_AIM_ERROR = 0.6; // radians
export const UFO_AIM_ERROR = 0.12;

export const START_SHIPS = 4;
export const SHIELD_MAX = 2; // seconds before the ship blows up
export const HYPERSPACE_TIME = 0.8;
export const RESPAWN_WAIT = 1.6;
export const SAFE_RADIUS = 56;
export const WAVE_PAUSE = 1.8;
export const DEATH_TIME = 1.6;
