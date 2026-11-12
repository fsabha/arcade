import { START_LIVES, EXTRA_LIFE_AT, ROW_POINTS, UFO_POINTS, UFO_WEIGHTS, MAX_LIVES } from './config';
import type { Rng } from '@arcade/shared';

export function invaderPoints(row: number): number {
  return ROW_POINTS[Math.max(0, Math.min(ROW_POINTS.length - 1, row))];
}

export function ufoPoints(rng: Rng): number {
  const total = UFO_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = rng.range(0, total);
  for (let i = 0; i < UFO_POINTS.length; i++) {
    roll -= UFO_WEIGHTS[i];
    if (roll < 0) return UFO_POINTS[i];
  }
  return UFO_POINTS[UFO_POINTS.length - 1];
}

export class ScoreKeeper {
  score = 0;
  lives = START_LIVES;
  private extraGiven = false;

  /** Adds points; returns true when the (single) extra life was granted. */
  add(points: number): boolean {
    this.score += points;
    if (!this.extraGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraGiven = true;
      this.lives = Math.min(MAX_LIVES, this.lives + 1);
      return true;
    }
    return false;
  }
}
