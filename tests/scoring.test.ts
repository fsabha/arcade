import { describe, it, expect } from 'vitest';
import { ScoreKeeper, enemyValue, rescueBonus, difficulty } from '../src/scoring';
import { OXYGEN_MAX, EXTRA_LIFE_EVERY, START_LIVES } from '../src/config';

describe('scoring', () => {
  it('enemy value grows 10 per level from 20, capped at 90', () => {
    expect(enemyValue(1)).toBe(20);
    expect(enemyValue(2)).toBe(30);
    expect(enemyValue(8)).toBe(90);
    expect(enemyValue(20)).toBe(90);
  });

  it('rescue bonus pays divers and remaining oxygen scaled by level', () => {
    const b1 = rescueBonus(1, OXYGEN_MAX);
    expect(b1.divers).toBe(300);
    expect(b1.oxygen).toBe(OXYGEN_MAX * 10);
    expect(b1.total).toBe(b1.divers + b1.oxygen);
    expect(rescueBonus(2, 0).total).toBe(600);
    expect(rescueBonus(3, 10).oxygen).toBe(300);
  });

  it('awards extra lives every 10000 points', () => {
    const s = new ScoreKeeper();
    expect(s.add(EXTRA_LIFE_EVERY - 1)).toBe(false);
    expect(s.lives).toBe(START_LIVES);
    expect(s.add(1)).toBe(true);
    expect(s.lives).toBe(START_LIVES + 1);
    expect(s.add(EXTRA_LIFE_EVERY * 2)).toBe(true);
    expect(s.lives).toBe(START_LIVES + 3);
  });

  it('difficulty ramps monotonically within bounds', () => {
    const a = difficulty(1);
    const b = difficulty(6);
    expect(b.enemySpeed).toBeGreaterThan(a.enemySpeed);
    expect(b.subChance).toBeGreaterThan(a.subChance);
    expect(b.maxSharks).toBe(3);
    expect(a.maxSharks).toBe(2);
    expect(b.spawnDelay[0]).toBeLessThan(a.spawnDelay[0]);
    expect(difficulty(99).enemySpeed).toBe(120);
    expect(difficulty(99).subChance).toBeLessThanOrEqual(0.6);
  });
});
