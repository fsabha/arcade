import { describe, it, expect } from 'vitest';
import { gameSpec } from '../src/games';

describe('game variations', () => {
  it('has eight games with ten lanes each (five per direction)', () => {
    for (let n = 1; n <= 8; n++) {
      const g = gameSpec(n);
      expect(g.n).toBe(n);
      expect(g.lower).toHaveLength(5);
      expect(g.upper).toHaveLength(5);
      expect(g.random).toBe(n >= 5);
    }
    expect(gameSpec(0).n).toBe(1);
    expect(gameSpec(9).n).toBe(8);
  });

  it('game 1: cars only, slowest at the curb and faster toward the centre', () => {
    const g = gameSpec(1);
    for (const l of [...g.lower, ...g.upper]) expect(l.truck).toBe(false);
    for (let i = 1; i < 5; i++) expect(g.lower[i].speed).toBeGreaterThan(g.lower[i - 1].speed);
  });

  it('game 2: trucks only in the upper lane closest to the centre, faster than game 1', () => {
    const g = gameSpec(2);
    expect(g.upper[4].truck).toBe(true);
    expect(g.lower.every((l) => !l.truck)).toBe(true);
    expect(g.upper.slice(0, 4).every((l) => !l.truck)).toBe(true);
    expect(g.lower[0].speed).toBeGreaterThan(gameSpec(1).lower[0].speed);
  });

  it('game 3: trucks in both centre lanes are the fastest; curb lanes are thicker', () => {
    const g = gameSpec(3);
    expect(g.lower[4].truck).toBe(true);
    expect(g.upper[4].truck).toBe(true);
    const max12 = Math.max(...[...gameSpec(1).lower, ...gameSpec(2).lower, ...gameSpec(2).upper].map((l) => l.speed));
    expect(g.lower[4].speed).toBeGreaterThan(max12);
    expect(g.lower[0].count).toBe(3);
    expect(g.lower[1].count).toBe(3);
  });

  it('game 4: all trucks; curb and centre fast, lanes 2/4 half, lane 3 a quarter', () => {
    const g = gameSpec(4);
    for (const l of [...g.lower, ...g.upper]) expect(l.truck).toBe(true);
    const [l1, l2, l3, l4, l5] = g.lower.map((l) => l.speed);
    expect(l1).toBe(l5);
    expect(l1).toBe(gameSpec(3).lower[4].speed);
    expect(l2).toBe(l1 / 2);
    expect(l4).toBe(l1 / 2);
    expect(l3).toBe(l2 / 2);
  });

  it('games 5-8 mirror 1-4 but with random speeds', () => {
    for (let n = 5; n <= 8; n++) {
      const a = gameSpec(n);
      const b = gameSpec(n - 4);
      expect(a.lower).toEqual(b.lower);
      expect(a.upper).toEqual(b.upper);
      expect(a.random).toBe(true);
      expect(b.random).toBe(false);
    }
  });
});
