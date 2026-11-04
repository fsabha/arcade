import { describe, it, expect } from 'vitest';
import { speeds, elroy, modeSchedule, fruitFor, houseLimits, houseTimeout, intermissionAfter } from '../src/levels';

describe('level tables', () => {
  it('speeds follow the dossier', () => {
    expect(speeds(1)).toMatchObject({ pac: 0.8, ghost: 0.75, tunnel: 0.4, frightTime: 6, flashes: 5 });
    expect(speeds(2)).toMatchObject({ pac: 0.9, ghost: 0.85, frightTime: 5 });
    expect(speeds(5)).toMatchObject({ pac: 1.0, ghost: 0.95, frightTime: 2 });
    expect(speeds(17).frightTime).toBe(0);
    expect(speeds(21)).toMatchObject({ pac: 0.9, ghost: 0.95, frightTime: 0, flashes: 0 });
    expect(speeds(99).frightTime).toBe(0);
  });

  it('elroy thresholds grow with level', () => {
    expect(elroy(1)).toEqual({ dots1: 20, speed1: 0.8, dots2: 10, speed2: 0.85 });
    expect(elroy(5)).toEqual({ dots1: 40, speed1: 1.0, dots2: 20, speed2: 1.05 });
    expect(elroy(30).dots1).toBe(120);
  });

  it('scatter/chase schedule ends in an infinite chase', () => {
    expect(modeSchedule(1)).toEqual([7, 20, 7, 20, 5, 20, 5, Infinity]);
    expect(modeSchedule(3)[5]).toBe(1033);
    expect(modeSchedule(7)[0]).toBe(5);
    expect(modeSchedule(7)[5]).toBe(1037);
  });

  it('fruit per level', () => {
    expect(fruitFor(1)).toEqual({ kind: 'cherry', points: 100 });
    expect(fruitFor(2)).toEqual({ kind: 'strawberry', points: 300 });
    expect(fruitFor(4).kind).toBe('orange');
    expect(fruitFor(8)).toEqual({ kind: 'melon', points: 1000 });
    expect(fruitFor(13)).toEqual({ kind: 'key', points: 5000 });
    expect(fruitFor(50).kind).toBe('key');
  });

  it('ghost house limits, timeout and intermissions', () => {
    expect(houseLimits(1)).toEqual({ pinky: 0, inky: 30, clyde: 60 });
    expect(houseLimits(2)).toEqual({ pinky: 0, inky: 0, clyde: 50 });
    expect(houseLimits(3)).toEqual({ pinky: 0, inky: 0, clyde: 0 });
    expect(houseTimeout(1)).toBe(4);
    expect(houseTimeout(5)).toBe(3);
    expect([1, 2, 3, 5, 6, 9, 13, 17, 18].map(intermissionAfter)).toEqual([0, 1, 0, 2, 0, 3, 3, 3, 0]);
  });
});
