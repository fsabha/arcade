import { describe, it, expect } from 'vitest';
import { normalizeText, textWidth } from '../src/font';
import { spriteMaps } from '../src/sprites';

describe('font', () => {
  it('strips accents and uppercases PT-BR text', () => {
    expect(normalizeText('Oxigênio e tubarão')).toBe('OXIGENIO E TUBARAO');
  });
  it('computes width as 4px per char minus trailing gap', () => {
    expect(textWidth('ABC')).toBe(11);
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
    expect([maps.sub[0].length, maps.sub.length]).toEqual([16, 8]);
    expect([maps.esub[0].length, maps.esub.length]).toEqual([16, 8]);
    expect([maps.shark0[0].length, maps.shark0.length]).toEqual([16, 8]);
    expect([maps.shark1[0].length, maps.shark1.length]).toEqual([16, 8]);
    expect([maps.diver0[0].length, maps.diver0.length]).toEqual([8, 8]);
    expect([maps.patrol[0].length, maps.patrol.length]).toEqual([24, 8]);
  });
});
