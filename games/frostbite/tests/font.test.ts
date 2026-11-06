import { describe, it, expect } from 'vitest';
import { spriteMaps } from '../src/sprites';

describe('sprites', () => {
  it('maps are rectangular; Bailey is 8x24 Atari pixels', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    for (const n of ['stand', 'run0', 'run1', 'jump', 'splash']) expect([maps[n][0].length, maps[n].length], n).toEqual([8, 24]);
    expect(maps.bear0[0].length).toBe(16);
  });
});
