import { describe, it, expect } from 'vitest';
import { Rng, seedFromString } from '../src/rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const sa = Array.from({ length: 50 }, () => a.next());
    const sb = Array.from({ length: 50 }, () => b.next());
    expect(sa).toEqual(sb);
  });

  it('differs for different seeds', () => {
    const a = new Rng(1).next();
    const b = new Rng(2).next();
    expect(a).not.toBe(b);
  });

  it('produces values in [0,1) and int within bounds', () => {
    const r = new Rng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('hashes strings to stable seeds', () => {
    expect(seedFromString('river')).toBe(seedFromString('river'));
    expect(seedFromString('river')).not.toBe(seedFromString('raid'));
  });
});
