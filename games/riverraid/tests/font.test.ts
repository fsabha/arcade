import { describe, it, expect } from 'vitest';
import { normalizeText, textWidth } from '../src/font';
import { spriteMaps } from '../src/sprites';

describe('font', () => {
  it('strips accents and uppercases PT-BR text', () => {
    expect(normalizeText('Seção combustível')).toBe('SECAO COMBUSTIVEL');
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
    expect([maps.player[0].length, maps.player.length]).toEqual([16, 16]);
    expect([maps.ship[0].length, maps.ship.length]).toEqual([32, 8]);
    expect([maps.heli0[0].length, maps.heli0.length]).toEqual([16, 12]);
    expect([maps.jet[0].length, maps.jet.length]).toEqual([16, 8]);
    expect([maps.fuel[0].length, maps.fuel.length]).toEqual([16, 24]);
    expect([maps.bridge[0].length, maps.bridge.length]).toEqual([96, 16]);
  });
});
