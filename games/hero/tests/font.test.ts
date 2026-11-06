import { describe, it, expect } from 'vitest';
import { spriteMaps } from '../src/sprites';

describe('sprites', () => {
  it('maps are rectangular; the hero is 6x20 Atari pixels', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    for (const n of ['hero0', 'hero1', 'run0', 'run1', 'dead']) expect([maps[n][0].length, maps[n].length], n).toEqual([6, 20]);
  });
});
