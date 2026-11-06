export const W = 224;
export const H = 256;

export const HUD_H = 24;

export const MARIO_W = 12;
export const MARIO_H = 16;
export const WALK_SPEED = 56;
export const CLIMB_SPEED = 40;
export const JUMP_TIME = 0.5;
export const JUMP_H = 14;
export const JUMP_DX = 26; // horizontal reach of a running jump
export const FALL_SPEED = 140;
export const FATAL_FALL = 28; // falling further than this is a splat
export const HAMMER_TIME = 10;
export const HAMMER_SWING = 0.12;

export const BARREL_W = 12;
export const BARREL_H = 10;
export const BARREL_SPEED = 62;
export const BARREL_LADDER_SPEED = 50;
export const FIREBALL_SPEED = 30;
export const PIE_SPEED = 34;
export const SPRING_SPEED = 90;
export const ELEVATOR_SPEED = 36;

export const START_LIVES = 3;
export const EXTRA_LIFE_AT = 7000;
export const DEATH_TIME = 1.6;
export const WIN_TIME = 3.0;
export const INTRO_TIME = 1.6;

export const POINTS = { jump: 100, rivet: 100, hammerBarrel: [300, 500, 800], hammerFire: 500, item: [300, 500, 800] } as const;

export type StageKind = 'barrels' | 'conveyors' | 'elevators' | 'rivets';

/** Bonus timer start: 5000 on level 1, +1000 per level up to 8000. */
export function bonusStart(level: number): number {
  return Math.min(8000, 4000 + level * 1000);
}

/** Seconds per 100-point tick of the bonus timer. */
export function bonusTick(level: number): number {
  return Math.max(1.3, 2.1 - (level - 1) * 0.2);
}

export function itemPoints(level: number): number {
  return POINTS.item[Math.min(2, level - 1)];
}

/** Arcade stage order: L1 barrels-rivets, L2 adds conveyors and elevators, L3+ repeats barrels between them. */
export function stageOrder(level: number): StageKind[] {
  if (level === 1) return ['barrels', 'rivets'];
  if (level === 2) return ['barrels', 'conveyors', 'elevators', 'rivets'];
  return ['barrels', 'conveyors', 'barrels', 'elevators', 'barrels', 'rivets'];
}

export function barrelInterval(level: number): number {
  return Math.max(1.1, 2.4 - (level - 1) * 0.25);
}

export function fireballsFor(kind: StageKind, level: number): number {
  if (kind === 'barrels') return Math.min(3, level);
  if (kind === 'rivets') return Math.min(5, 2 + level);
  if (kind === 'conveyors') return Math.min(3, 1 + Math.floor(level / 2));
  return Math.min(2, 1 + Math.floor(level / 3));
}

export function speedFactor(level: number): number {
  return 1 + (level - 1) * 0.1;
}
