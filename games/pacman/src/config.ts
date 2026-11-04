// Arcade geometry: 28x31 tiles of 8px, 3 rows above for scores, 2 below for lives/fruit.
export const TILE = 8;
export const COLS = 28;
export const ROWS = 31;
export const W = COLS * TILE; // 224
export const MAZE_Y = 3 * TILE; // 24
export const MAZE_H = ROWS * TILE; // 248
export const H = MAZE_Y + MAZE_H + 2 * TILE; // 288

/** 100% speed in px/s (the arcade moves ~75.75 px per second at full speed). */
export const FULL_SPEED = 75.75;

export const TOTAL_DOTS = 244; // 240 dots + 4 power pellets

export const POINTS = { dot: 10, pellet: 50, ghost: [200, 400, 800, 1600] as const };
export const EXTRA_LIFE_AT = 10000;
export const START_LIVES = 3;

export const READY_TIME = 2.2; // first start is longer (jingle)
export const READY_TIME_SHORT = 1.4;
export const DEATH_TIME = 2.2;
export const LEVEL_CLEAR_TIME = 2.6;
export const GHOST_EAT_PAUSE = 0.9;
export const FRUIT_TIME = 9.5;
export const FRUIT_SCORE_TIME = 2.0;

// Pac-Man loses 1 frame per dot and 3 frames per power pellet (60 fps).
export const DOT_PAUSE = 1 / 60;
export const PELLET_PAUSE = 3 / 60;

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'left', 'down', 'right']; // priority order for ties: up, left, down, right
export const DX: Record<Dir, number> = { up: 0, down: 0, left: -1, right: 1 };
export const DY: Record<Dir, number> = { up: -1, down: 1, left: 0, right: 0 };
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Fixed positions (tile coords; x may be fractional = between two tiles)
export const PAC_START = { x: 13.5, y: 23 };
export const FRUIT_POS = { x: 13.5, y: 17 };
export const HOUSE_DOOR = { x: 13.5, y: 11 }; // tile just above the door where ghosts exit to
export const HOUSE_CENTER = { x: 13.5, y: 14 };
export const HOUSE_LEFT = { x: 11.5, y: 14 };
export const HOUSE_RIGHT = { x: 15.5, y: 14 };
export const BLINKY_START = { x: 13.5, y: 11 };

/** Tiles where ghosts may not turn upward in chase/scatter (the four "red zone" tiles). */
export const NO_UP_TILES: readonly { x: number; y: number }[] = [
  { x: 12, y: 11 }, { x: 15, y: 11 }, { x: 12, y: 23 }, { x: 15, y: 23 },
];

export const SCATTER_TARGETS = {
  blinky: { x: 25, y: -3 },
  pinky: { x: 2, y: -3 },
  inky: { x: 27, y: 31 },
  clyde: { x: 0, y: 31 },
} as const;
