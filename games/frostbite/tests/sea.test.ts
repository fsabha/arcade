import { describe, it, expect } from 'vitest';
import { Sea, hazardsFor, mod } from '../src/sea';
import { Rng } from '@arcade/shared';
import { W, FLOES_PER_ROW, floeWidth, floeSpeed, blockPoints, iglooPoints, degreeBonus, isNight } from '../src/config';

describe('sea', () => {
  it('builds four rows of three floes that alternate direction and wrap', () => {
    const sea = new Sea(1, 42);
    expect(sea.rows).toHaveLength(4);
    expect(sea.rows.map((r) => r.dir)).toEqual([-1, 1, -1, 1]);
    for (let r = 0; r < 4; r++) expect(sea.floes(r)).toHaveLength(FLOES_PER_ROW);
    const before = sea.rows[0].offset;
    sea.update(1);
    expect(mod(before - sea.speed, W)).toBeCloseTo(sea.rows[0].offset, 5);
    sea.reverse(0);
    expect(sea.rows[0].dir).toBe(1);
  });
  it('hasIce is true on a floe and false in the gap', () => {
    const sea = new Sea(1, 42);
    const x = sea.floes(1)[0];
    expect(sea.hasIce(1, x + 2, x + 10)).toBe(true);
    expect(sea.hasIce(1, x + sea.floeW + 4, x + sea.floeW + 12)).toBe(false);
  });
  it('hazards grow with the level and the bear/fish rules follow the manual', () => {
    expect(hazardsFor(1, new Rng(1))).toEqual([null, 'goose', null, null]);
    expect(hazardsFor(4, new Rng(1)).filter((k) => k === 'fish')).toHaveLength(1);
    expect(floeWidth(1)).toBeGreaterThan(floeWidth(6));
    expect(floeSpeed(5)).toBeGreaterThan(floeSpeed(1));
    expect(blockPoints(1)).toBe(10);
    expect(blockPoints(12)).toBe(90);
    expect(iglooPoints(2)).toBe(320);
    expect(degreeBonus(3, 20)).toBe(600);
    expect(isNight(4)).toBe(false);
    expect(isNight(5)).toBe(true);
    expect(isNight(9)).toBe(false);
  });
  it('fish can be eaten and come back', () => {
    const sea = new Sea(3, 7);
    const r = sea.rows.findIndex((row) => row.group?.kind === 'fish');
    expect(r).toBeGreaterThanOrEqual(0);
    const g = sea.rows[r].group!;
    expect(sea.eatFish(r, 0)).toBe(200);
    expect(g.alive[0]).toBe(false);
    sea.update(7);
    expect(g.alive[0]).toBe(true);
  });
});
