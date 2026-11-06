import { LETTERS, LETTER_LEN, CRATER_SMALL, CRATER_BIG, ROCK_W, BIG_ROCK_W, MINE_W, TANK_W, Course } from './config';
import { Rng } from '@arcade/shared';

export type GroundKind = 'crater' | 'bigCrater' | 'rock' | 'bigRock' | 'mine' | 'tank';

export interface GroundObject {
  kind: GroundKind;
  /** world x of the left edge */
  x: number;
  w: number;
  hp: number;
  alive: boolean;
  /** tanks: seconds to the next shot */
  fireT: number;
}

export type UfoKind = 'small' | 'big' | 'fast';

export interface UfoWave {
  /** letter index where the wave appears */
  letter: number;
  kind: UfoKind;
  count: number;
}

export function groundWidth(kind: GroundKind): number {
  switch (kind) {
    case 'crater': return CRATER_SMALL;
    case 'bigCrater': return CRATER_BIG;
    case 'rock': return ROCK_W;
    case 'bigRock': return BIG_ROCK_W;
    case 'mine': return MINE_W;
    case 'tank': return TANK_W;
  }
}

/**
 * Lays out one run of the course. Each letter gets a few obstacles; what shows up depends on how
 * far along the course you are, like the arcade's sections: craters first, then rocks, mines, tanks.
 */
export function buildCourse(course: Course, seed: number): { ground: GroundObject[]; ufos: UfoWave[] } {
  const rng = new Rng(seed);
  const ground: GroundObject[] = [];
  const ufos: UfoWave[] = [];
  const hard = course === 'champion';
  for (let l = 0; l < LETTERS; l++) {
    const base = l * LETTER_LEN;
    const n = l === 0 ? 1 : Math.min(5, 2 + Math.floor(l / 5) + (hard ? 1 : 0));
    let x = base + (l === 0 ? 360 : 140) + rng.range(0, 40); // letter A gives you a breath first
    for (let i = 0; i < n && x < base + LETTER_LEN - 60; i++) {
      const r = rng.next();
      let kind: GroundKind = 'crater';
      if (l >= 2 && r < 0.3) kind = 'rock';
      else if (l >= 6 && r < 0.42) kind = 'bigRock';
      else if (l >= 8 && r < 0.55) kind = 'mine';
      else if (l >= 12 && r < 0.68) kind = 'tank';
      else if (l >= 4 && r < 0.8) kind = 'bigCrater';
      const w = groundWidth(kind);
      ground.push({ kind, x, w, hp: kind === 'bigRock' ? 2 : 1, alive: true, fireT: rng.range(1, 2.5) });
      x += w + rng.range(hard ? 60 : 80, 130);
    }
    if (l >= 2 && (l % 2 === 0 || hard)) {
      const kind: UfoKind = l < 9 ? 'small' : l < 17 ? 'big' : 'fast';
      ufos.push({ letter: l, kind, count: Math.min(3, 1 + Math.floor(l / 8) + (hard ? 1 : 0)) });
    }
  }
  return { ground, ufos };
}
