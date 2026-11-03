// Logical canvas size (scaled up by CSS). Landscape 4:3.
export const W = 320;
export const H = 240;
export const HUD_H = 40;
export const PLAY_H = H - HUD_H; // 200
export const HORIZON = 76; // screen y of the vanishing line

// Pseudo-3D camera (world units)
export const SEG_LEN = 200;
export const CAM_H = 1000;
export const CAM_D = 0.84; // camera depth (1 / tan(fov/2))
export const NEAR_Z = CAM_H * CAM_D; // 840: distance projected onto the bottom row
export const PLAYER_Z_OFF = NEAR_Z + 100; // player car sits slightly above the bottom row
export const DRAW_SEGS = 110;
export const ROAD_HALF = 700; // half road width (world)
export const GRASS_LIMIT = ROAD_HALF + 320; // how far off road the player can go

// Player dynamics (world units / s)
export const MAX_SPEED = 12000;
export const ACCEL = MAX_SPEED / 5.5;
export const BRAKE = MAX_SPEED / 2.2;
export const DECEL = MAX_SPEED / 9;
export const OFFROAD_MAX = MAX_SPEED * 0.42;
export const OFFROAD_DECEL = MAX_SPEED / 1.6;
export const STEER = 1500; // lateral units/s at full speed
export const STEER_MIN = 0.35; // fraction of STEER available when stopped
export const CENTRIFUGAL = 0.011;
export const ICE_RESPONSE = 2.0; // how fast steering converges on ice (1/s)
export const ICE_CENTRIFUGAL = 1.5;

// Traffic
export const CAR_W = 210; // world width of a car
export const HIT_DX = 190;
export const HIT_DZ = 340;
export const SPAWN_AHEAD = SEG_LEN * (DRAW_SEGS + 10);
export const CRASH_COOLDOWN = 0.7;
export const CRASH_SPEED_KEEP = 0.25;

// Race rules
export const DAY_LEN = 320; // seconds per day
export const QUOTA_DAY1 = 200;
export const QUOTA_NEXT = 300;
export const UNITS_PER_KM = 60000;
export const BANNER_TIME = 2.6;
