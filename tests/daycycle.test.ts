import { describe, it, expect } from 'vitest';
import { conditionsAt, timeline, hasFog, hasIce, fogAmount } from '../src/daycycle';

describe('day cycle', () => {
  it('day 1 has no fog or ice, later days do', () => {
    expect(hasFog(1)).toBe(false);
    expect(hasIce(1)).toBe(false);
    expect(hasFog(2)).toBe(true);
    expect(hasIce(3)).toBe(true);
    expect(timeline(1).map((k) => k.phase)).toEqual(['dawn', 'day', 'dusk', 'night']);
    expect(timeline(3).map((k) => k.phase)).toEqual(['dawn', 'day', 'ice', 'day', 'dusk', 'night', 'fog']);
  });

  it('keyframes are sorted and start at dawn', () => {
    for (const day of [1, 2, 3, 7]) {
      const keys = timeline(day);
      expect(keys[0]).toEqual({ t: 0, phase: 'dawn' });
      for (let i = 1; i < keys.length; i++) expect(keys[i].t).toBeGreaterThan(keys[i - 1].t);
      expect(keys[keys.length - 1].t).toBeLessThan(1);
    }
  });

  it('returns the phase in effect and blends near transitions', () => {
    expect(conditionsAt(0.2, 1).phase).toBe('day');
    expect(conditionsAt(0.75, 1).phase).toBe('night');
    expect(conditionsAt(0.75, 1).dark).toBe(1);
    expect(conditionsAt(0.9, 2).phase).toBe('fog');
    expect(conditionsAt(0.45, 3).icy).toBe(1);
    expect(conditionsAt(0.45, 1).icy).toBe(0);
    // mid-blend between day and dusk on day 1 (dusk at 0.6, blend starts 0.565)
    const mid = conditionsAt(0.5825, 1);
    expect(mid.dark).toBeGreaterThan(0);
    expect(mid.dark).toBeLessThan(0.35);
  });

  it('is continuous across the day boundary (fades toward dawn)', () => {
    const end = conditionsAt(0.9999, 2);
    const start = conditionsAt(0, 3);
    for (let i = 0; i < 3; i++) expect(Math.abs(end.sky[i] - start.sky[i])).toBeLessThan(6);
  });

  it('fog amount grows with distance and density', () => {
    expect(fogAmount(0, 50)).toBe(0);
    expect(fogAmount(1, 50)).toBeGreaterThan(0.99);
    expect(fogAmount(0.5, 2)).toBeLessThan(fogAmount(0.5, 50));
  });
});
