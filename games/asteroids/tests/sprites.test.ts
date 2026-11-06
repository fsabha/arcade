import { describe, it, expect } from 'vitest';
import { spriteMaps } from '../src/sprites';

describe('sprites', () => {
  it('asteroid maps are rectangular, two shapes per size', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    expect(maps.large0.length).toBe(12);
    expect(maps.medium1.length).toBe(7);
    expect(maps.small0.length).toBe(4);
  });
});
