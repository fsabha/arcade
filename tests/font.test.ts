import { describe, it, expect } from 'vitest';
import { normalizeText, textWidth } from '../src/font';
import { spriteMaps, sharkColor, SHARK_COLORS } from '../src/sprites';

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
    // Wide (2:1) Atari pixels: every map is an even number of px wide.
    expect([maps.sub0[0].length, maps.sub0.length]).toEqual([16, 9]);
    expect([maps.sub1[0].length, maps.sub1.length]).toEqual([16, 9]);
    expect([maps.esub0[0].length, maps.esub0.length]).toEqual([16, 8]);
    expect([maps.esub1[0].length, maps.esub1.length]).toEqual([16, 8]);
    expect([maps.shark0[0].length, maps.shark0.length]).toEqual([16, 8]);
    expect([maps.shark1[0].length, maps.shark1.length]).toEqual([16, 8]);
    expect([maps.shark2[0].length, maps.shark2.length]).toEqual([16, 8]);
    expect([maps.diver0[0].length, maps.diver0.length]).toEqual([16, 5]);
    expect([maps.diver1[0].length, maps.diver1.length]).toEqual([16, 5]);
    expect([maps.diver2[0].length, maps.diver2.length]).toEqual([16, 5]);
    expect([maps.patrol[0].length, maps.patrol.length]).toEqual([24, 8]);
    expect([maps.life[0].length, maps.life.length]).toEqual([8, 5]);
    expect([maps.diverIcon[0].length, maps.diverIcon.length]).toEqual([8, 4]);
  });
  it('use wide pixels (each atari pixel doubled horizontally)', () => {
    for (const rows of Object.values(spriteMaps())) {
      for (const r of rows) for (let x = 0; x < r.length; x += 2) expect(r[x]).toBe(r[x + 1]);
    }
  });
  it('cycle shark colours by level', () => {
    expect(sharkColor(1)).toBe(SHARK_COLORS[0]);
    expect(sharkColor(2)).toBe(SHARK_COLORS[1]);
    expect(sharkColor(SHARK_COLORS.length + 1)).toBe(SHARK_COLORS[0]);
    expect(new Set(SHARK_COLORS).size).toBe(SHARK_COLORS.length);
  });
});
