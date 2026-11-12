import { describe, it, expect } from 'vitest';
import { Barricade, makeBarricades, SHIELD_SHAPE } from '../src/barricade';
import { SHIELD_W, SHIELD_H, SHIELDS, W } from '../src/config';

describe('Barricade', () => {
  it('builds from the template shape', () => {
    const b = new Barricade(10, 100);
    expect(SHIELD_SHAPE).toHaveLength(SHIELD_H);
    for (const r of SHIELD_SHAPE) expect(r).toHaveLength(SHIELD_W);
    expect(b.get(0, 0)).toBe(false);
    expect(b.get(5, 0)).toBe(true);
    expect(b.get(10, 14)).toBe(false); // arch
    expect(b.pixelCount()).toBe(SHIELD_SHAPE.join('').split('X').length - 1);
  });

  it('finds the first hit scanning bottom-up for player shots and top-down for invader shots', () => {
    const b = new Barricade(10, 100);
    const up = b.firstHit({ x: 11, y: 100, w: 1, h: SHIELD_H }, -1)!;
    expect(up.r).toBe(SHIELD_H - 1);
    const down = b.firstHit({ x: 11, y: 100, w: 1, h: SHIELD_H }, 1)!;
    expect(down.r).toBe(3); // column 1 starts at row 3
    expect(b.firstHit({ x: 0, y: 0, w: 5, h: 5 }, 1)).toBeNull();
  });

  it('blasts a hole around the impact and marks dirty', () => {
    const b = new Barricade(10, 100);
    b.dirty = false;
    const before = b.pixelCount();
    b.blast(10, 6);
    expect(b.get(10, 6)).toBe(false);
    expect(b.get(10, 5)).toBe(false);
    expect(b.pixelCount()).toBeLessThan(before);
    expect(b.dirty).toBe(true);
  });

  it('carves invader overlap', () => {
    const b = new Barricade(10, 100);
    const n = b.carve({ x: 10, y: 104, w: 8, h: 4 });
    expect(n).toBe(32);
    expect(b.get(0, 4)).toBe(false);
    expect(b.carve({ x: 10, y: 104, w: 8, h: 4 })).toBe(0);
  });

  it('lays out four shields evenly inside the screen', () => {
    const bs = makeBarricades();
    expect(bs).toHaveLength(SHIELDS);
    expect(bs[0].x).toBeGreaterThan(0);
    expect(bs[SHIELDS - 1].x + SHIELD_W).toBeLessThan(W);
    for (let i = 1; i < bs.length; i++) expect(bs[i].x - bs[i - 1].x).toBe(bs[1].x - bs[0].x);
  });
});
