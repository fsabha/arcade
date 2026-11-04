import { describe, it, expect } from 'vitest';
import { aabb, hitsBank, bounceInChannel } from '../src/collision';
import type { RiverRow } from '../src/river';

const row = (left: number, right: number, island: [number, number] | null = null): RiverRow => ({ left, right, island });

describe('aabb', () => {
  it('detects overlap and touching edges correctly', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(aabb(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(aabb(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false); // edge touch is not a hit
    expect(aabb(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
    expect(aabb(a, { x: -5, y: -5, w: 6, h: 6 })).toBe(true);
  });
});

describe('hitsBank', () => {
  it('is false when fully in water', () => {
    expect(hitsBank({ x: 100, y: 0, w: 16, h: 16 }, () => row(50, 190))).toBe(false);
  });

  it('is true when crossing the left or right bank', () => {
    expect(hitsBank({ x: 45, y: 0, w: 16, h: 16 }, () => row(50, 190))).toBe(true);
    expect(hitsBank({ x: 180, y: 0, w: 16, h: 16 }, () => row(50, 190))).toBe(true);
  });

  it('is true when overlapping an island', () => {
    const r = () => row(20, 220, [110, 130]);
    expect(hitsBank({ x: 100, y: 0, w: 16, h: 16 }, r)).toBe(true);
    expect(hitsBank({ x: 60, y: 0, w: 16, h: 16 }, r)).toBe(false);
    expect(hitsBank({ x: 131, y: 0, w: 16, h: 16 }, r)).toBe(false);
  });

  it('samples several rows along the box height', () => {
    const rows = (y: number) => (y >= 8 ? row(120, 200) : row(20, 200));
    expect(hitsBank({ x: 40, y: 0, w: 16, h: 16 }, rows)).toBe(true);
    expect(hitsBank({ x: 40, y: 0, w: 16, h: 4 }, rows)).toBe(false);
  });
});

describe('bounceInChannel', () => {
  it('flips direction at channel edges and clamps position', () => {
    const r = row(50, 150);
    expect(bounceInChannel({ x: 48, y: 0, w: 16, h: 8 }, -30, r)).toEqual({ x: 51, vx: 30 });
    expect(bounceInChannel({ x: 140, y: 0, w: 16, h: 8 }, 30, r)).toEqual({ x: 133, vx: -30 });
    expect(bounceInChannel({ x: 80, y: 0, w: 16, h: 8 }, 30, r)).toEqual({ x: 80, vx: 30 });
  });

  it('respects the island as a wall for the channel the box is in', () => {
    const r = row(20, 220, [100, 140]);
    expect(bounceInChannel({ x: 90, y: 0, w: 16, h: 8 }, 30, r)).toEqual({ x: 83, vx: -30 });
    expect(bounceInChannel({ x: 138, y: 0, w: 16, h: 8 }, -30, r)).toEqual({ x: 141, vx: 30 });
  });
});
