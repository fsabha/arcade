export const W = 224;
export const H = 256;
export const TILE = 16;
export const COLS = W / TILE; // 14
export const PX = 2; // sprites are drawn with square 2x2 pixels

// rows, top to bottom
export const ROW_HUD = 0; // score line (two rows high)
export const ROW_HOME = 2;
export const ROW_RIVER_TOP = 3;
export const ROW_RIVER_BOTTOM = 7;
export const ROW_MEDIAN = 8;
export const ROW_ROAD_TOP = 9;
export const ROW_ROAD_BOTTOM = 13;
export const ROW_START = 14;
export const ROW_BOTTOM = 15; // lives, level, time bar

export const HOME_X = [8, 56, 104, 152, 200]; // left edge of the five bays
export const HOME_TOLERANCE = 6; // frog centre must be this close to the bay centre
export const HOMES = 5;

export const FROG_START_COL = 6; // 0-based: the 7th of 14 columns, dead centre
export const FROG_W = 12; // collision box inside the 16 px tile
export const HOP_TIME = 0.1;

export const TIME_LIMIT = 30; // seconds; the bar has 60 half-second ticks
export const TIME_WARN = 8;
export const START_LIVES = 3;
export const EXTRA_LIFE_AT = 20000; // one bonus frog only

export const POINTS = { hop: 10, home: 50, fly: 200, lady: 200, allHome: 1000, halfSecond: 10 } as const;

export const DEATH_TIME = 1.2;
export const LEVEL_CLEAR_TIME = 2.2;
export const WRAP_MARGIN = 48; // objects travel this far past the edge before wrapping
export const PERIOD = W + WRAP_MARGIN;

/** Lane traffic speeds up every level. */
export function speedFactor(level: number): number {
  return 1 + (level - 1) * 0.12;
}

export const SNAKE_FROM_LEVEL = 2;
export const CROC_FROM_LEVEL = 2;
export const HOME_CROC_FROM_LEVEL = 2;
export const OTTER_FROM_LEVEL = 3;
export const LADY_FROM_LEVEL = 1;
export const FLY_SHOW = 4; // seconds on
export const FLY_HIDE = 5; // seconds off
export const HOME_CROC_SHOW = 3;
export const HOME_CROC_HIDE = 7;

export function rowY(row: number): number {
  return row * TILE;
}
