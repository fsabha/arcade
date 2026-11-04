import { describe, it, expect } from 'vitest';
import { normalizeText } from '../src/font';
import { spriteMaps, LANE_COLORS } from '../src/sprites';

describe('font and sprites', () => {
  it('normalizes PT-BR text', () => {
    expect(normalizeText('Rodovia à meia-noite')).toBe('RODOVIA A MEIA-NOITE');
  });
  it('sprite maps are rectangular wide-pixel art', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) {
        expect(r.length, `${name} row width`).toBe(w);
        for (let i = 0; i < r.length; i += 2) expect(r[i]).toBe(r[i + 1]);
      }
    }
    expect([maps.chicken0[0].length, maps.chicken0.length]).toEqual([12, 8]);
    expect([maps.car[0].length, maps.car.length]).toEqual([16, 4]);
    expect([maps.truck[0].length, maps.truck.length]).toEqual([32, 5]);
    expect(LANE_COLORS).toHaveLength(10);
  });
});
