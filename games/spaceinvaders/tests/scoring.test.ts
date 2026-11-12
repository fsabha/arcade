import { describe, it, expect } from 'vitest';
import { ScoreKeeper, invaderPoints, ufoPoints } from '../src/scoring';
import { Rng } from '@arcade/shared';
import { START_LIVES, EXTRA_LIFE_AT, UFO_POINTS } from '../src/config';

describe('scoring', () => {
  it('uses the original row table', () => {
    expect(invaderPoints(0)).toBe(30);
    expect(invaderPoints(1)).toBe(20);
    expect(invaderPoints(2)).toBe(20);
    expect(invaderPoints(3)).toBe(10);
    expect(invaderPoints(4)).toBe(10);
  });

  it('grants exactly one extra life at 1500', () => {
    const s = new ScoreKeeper();
    expect(s.lives).toBe(START_LIVES);
    expect(s.add(EXTRA_LIFE_AT - 10)).toBe(false);
    expect(s.add(10)).toBe(true);
    expect(s.lives).toBe(START_LIVES + 1);
    expect(s.add(EXTRA_LIFE_AT * 3)).toBe(false);
    expect(s.lives).toBe(START_LIVES + 1);
  });

  it('draws UFO points from the allowed values, weighted towards the low ones', () => {
    const rng = new Rng(7);
    const counts = new Map<number, number>();
    for (let i = 0; i < 2000; i++) {
      const p = ufoPoints(rng);
      expect(UFO_POINTS).toContain(p);
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    expect(counts.get(50)!).toBeGreaterThan(counts.get(300)!);
  });
});
