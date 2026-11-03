import { QUOTA_DAY1, QUOTA_NEXT } from './config';

export function quotaFor(day: number): number {
  return day <= 1 ? QUOTA_DAY1 : QUOTA_NEXT;
}

export interface Difficulty {
  gap: number; // mean distance between spawns (world)
  pairChance: number; // chance of spawning two cars abreast
  minSpeed: number; // traffic speed as fraction of MAX_SPEED
  maxSpeed: number;
}

export function difficulty(day: number): Difficulty {
  const d = Math.max(1, day);
  return {
    gap: Math.max(2600, 6000 - (d - 1) * 450),
    pairChance: Math.min(0.45, 0.06 + (d - 1) * 0.07),
    minSpeed: 0.3,
    maxSpeed: Math.min(0.72, 0.52 + (d - 1) * 0.04),
  };
}
