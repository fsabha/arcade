import { START_LIVES, EXTRA_LIFE_EVERY, FUEL_DRAIN, SpeedMode } from './config';

export class ScoreKeeper {
  score = 0;
  lives = START_LIVES;
  private nextExtra = EXTRA_LIFE_EVERY;

  /** Adds points; returns true when at least one extra life was granted. */
  add(points: number): boolean {
    this.score += points;
    let extra = false;
    while (this.score >= this.nextExtra) {
      this.lives++;
      this.nextExtra += EXTRA_LIFE_EVERY;
      extra = true;
    }
    return extra;
  }
}

export function fuelDrainRate(mode: SpeedMode): number {
  return FUEL_DRAIN[mode];
}
