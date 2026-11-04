import { describe, it, expect } from 'vitest';
import { normalizeText } from '../src/font';
import { spriteMaps } from '../src/sprites';

describe('font and sprites', () => {
  it('normalizes PT-BR text', () => {
    expect(normalizeText('Pântano à noite')).toBe('PANTANO A NOITE');
  });
  it('sprite maps are rectangular; Harry is 8x22 Atari pixels', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    for (const n of ['stand', 'run0', 'run1', 'run2', 'jump', 'climb0', 'climb1', 'swing', 'kneel']) {
      expect([maps[n][0].length, maps[n].length], n).toEqual([8, 22]);
    }
    expect([maps.log0[0].length, maps.log0.length]).toEqual([8, 8]);
    expect(maps.crocOpen[0].length).toBe(14);
  });
});
