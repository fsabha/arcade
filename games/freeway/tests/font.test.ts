import { describe, it, expect } from 'vitest';
import { normalizeText } from '@arcade/shared';
import { spriteMaps, LANE_COLORS } from '../src/sprites';

describe('font and sprites', () => {
  it('normalizes PT-BR text', () => {
    expect(normalizeText('Rodovia à meia-noite')).toBe('RODOVIA A MEIA-NOITE');
  });
  it('sprite maps are rectangular and match the hit boxes', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    expect([maps.chicken0[0].length, maps.chicken0.length]).toEqual([12, 12]);
    expect([maps.car[0].length, maps.car.length]).toEqual([16, 8]);
    expect([maps.truck[0].length, maps.truck.length]).toEqual([32, 10]);
    expect(LANE_COLORS).toHaveLength(10);
  });
});
