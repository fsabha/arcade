import { describe, it, expect } from 'vitest';
import { normalizeText, textWidth } from '@arcade/shared';
import { spriteMaps } from '../src/sprites';

describe('font', () => {
  it('strips accents and uppercases PT-BR text', () => {
    expect(normalizeText('Resistência à neblina')).toBe('RESISTENCIA A NEBLINA');
  });
  it('computes width as 4px per char minus trailing gap', () => {
    expect(textWidth('ABC')).toBe(11);
    expect(textWidth('ABC', 2)).toBe(22);
    expect(textWidth('')).toBe(0);
  });
});

describe('sprite maps', () => {
  it('are rectangular and match declared sizes', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    expect([maps.car[0].length, maps.car.length]).toEqual([16, 9]);
    expect([maps.player[0].length, maps.player.length]).toEqual([16, 9]);
  });
});
