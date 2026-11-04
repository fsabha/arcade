import { START_LIVES, EXTRA_LIFE_EVERY, OXYGEN_MAX } from './config';

/** Sharks and enemy subs: 20 points on level 1, +10 per level, capped at 90 (as on the 2600). */
export function enemyValue(level: number): number {
  return Math.min(90, 20 + 10 * (Math.max(1, level) - 1));
}

/** Bonus for surfacing with six divers: 50 per diver per level, plus remaining oxygen. */
export function rescueBonus(level: number, oxygen: number): { divers: number; oxygen: number; total: number } {
  const lv = Math.max(1, level);
  const divers = 6 * Math.min(1000, 50 * lv);
  const ox = Math.round(Math.max(0, Math.min(OXYGEN_MAX, oxygen))) * 10 * lv;
  return { divers, oxygen: ox, total: divers + ox };
}

export class ScoreKeeper {
  score = 0;
  lives = START_LIVES;
  private nextExtra = EXTRA_LIFE_EVERY;

  /** Adds points; returns true when an extra life was earned. */
  add(points: number): boolean {
    this.score += points;
    let extra = false;
    while (this.score >= this.nextExtra) {
      this.nextExtra += EXTRA_LIFE_EVERY;
      this.lives++;
      extra = true;
    }
    return extra;
  }
}

export interface Difficulty {
  enemySpeed: number; // px/s
  diverSpeed: number;
  subChance: number; // chance a group is an enemy sub instead of sharks
  maxSharks: number; // sharks per group
  spawnDelay: [number, number]; // seconds between groups in a lane
  fireDelay: [number, number]; // seconds between enemy sub torpedoes
  patrolSpeed: number;
}

export function difficulty(level: number): Difficulty {
  const l = Math.max(1, level);
  return {
    enemySpeed: Math.min(120, 38 + (l - 1) * 11),
    diverSpeed: Math.min(60, 22 + (l - 1) * 3),
    subChance: Math.min(0.6, 0.3 + (l - 1) * 0.05),
    maxSharks: Math.min(3, 1 + Math.floor((l + 1) / 2)),
    spawnDelay: [Math.max(0.5, 1.6 - (l - 1) * 0.12), Math.max(1.2, 3.4 - (l - 1) * 0.2)],
    fireDelay: [Math.max(0.8, 2.2 - (l - 1) * 0.15), Math.max(1.6, 4.0 - (l - 1) * 0.25)],
    patrolSpeed: Math.min(110, 46 + (l - 1) * 9),
  };
}
