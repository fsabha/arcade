// Logical canvas size (scaled up by CSS). Landscape 4:3.
export const W = 320;
export const H = 240;

// Vertical layout (px)
export const HUD_TOP = 20;
export const CURB_H = 16;
export const LANE_H = 16;
export const LANES = 10; // 5 per direction
export const MEDIAN_H = 8;
export const ROAD_Y = HUD_TOP + CURB_H; // 36: top edge of lane 10
export const MEDIAN_Y = ROAD_Y + 5 * LANE_H; // 116
export const ROAD_BOTTOM = MEDIAN_Y + MEDIAN_H + 5 * LANE_H; // 204: bottom edge of lane 1
export const HUD_BOTTOM = ROAD_BOTTOM + CURB_H; // 220

/** Top edge (y) of a lane, numbered 1 (bottom) to 10 (top) like the manual. */
export function laneTop(lane: number): number {
  if (lane <= 5) return ROAD_BOTTOM - lane * LANE_H;
  return ROAD_Y + (10 - lane) * LANE_H;
}

/** Direction of travel: lanes 1-5 move right, lanes 6-10 move left. */
export function laneDir(lane: number): 1 | -1 {
  return lane <= 5 ? 1 : -1;
}

// Chicken
export const CHICKEN_X = 96; // player 1 crosses here
export const CHICKEN_W = 12;
export const CHICKEN_H = 12;
export const CHICKEN_SPEED = 44; // px/s
export const CHICKEN_START_Y = ROAD_BOTTOM + 2; // standing on the bottom curb
export const CHICKEN_GOAL_Y = ROAD_Y - CHICKEN_H + 2; // fully on the top curb
export const KNOCK_TIME = 0.6; // seconds tumbling after a hit

// Vehicles
export const CAR_W = 16;
export const CAR_H = 8;
export const TRUCK_W = 32;
export const TRUCK_H = 10;
export const WRAP_MARGIN = 40; // vehicles loop over W + 2 * margin

// Match
export const MATCH_TIME = 136; // 2:16
export const FLASH_TIME = 8; // score flashes in the last 8 seconds
