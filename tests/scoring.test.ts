import { describe, it, expect } from 'vitest';
import { ScoreKeeper, fuelDrainRate } from '../src/scoring';
import { START_LIVES, EXTRA_LIFE_EVERY, POINTS } from '../src/config';

describe('ScoreKeeper', () => {
  it('starts with the configured lives and zero score', () => {
    const s = new ScoreKeeper();
    expect(s.score).toBe(0);
    expect(s.lives).toBe(START_LIVES);
  });

  it('grants an extra life every 10000 points, including when a single add crosses several thresholds', () => {
    const s = new ScoreKeeper();
    expect(s.add(EXTRA_LIFE_EVERY - POINTS.ship)).toBe(false);
    expect(s.lives).toBe(START_LIVES);
    expect(s.add(POINTS.ship)).toBe(true);
    expect(s.lives).toBe(START_LIVES + 1);
    expect(s.add(EXTRA_LIFE_EVERY * 2)).toBe(true);
    expect(s.lives).toBe(START_LIVES + 3);
    expect(s.add(1)).toBe(false);
  });

  it('uses the original Atari point table', () => {
    expect(POINTS).toEqual({ ship: 30, heli: 60, fuel: 80, jet: 100, bridge: 500 });
  });
});

describe('fuelDrainRate', () => {
  it('drains faster when accelerating and slower when braking', () => {
    expect(fuelDrainRate('fast')).toBeGreaterThan(fuelDrainRate('normal'));
    expect(fuelDrainRate('slow')).toBeLessThan(fuelDrainRate('normal'));
  });
});
