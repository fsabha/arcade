import { describe, it, expect } from 'vitest';
import { aabb, shrink } from '../src/collision';

describe('aabb', () => {
  it('detects overlap and treats touching edges as a miss', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(aabb(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(aabb(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(aabb(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
});

describe('shrink', () => {
  it('insets the box and never goes negative', () => {
    expect(shrink({ x: 10, y: 10, w: 16, h: 8 }, 2, 1)).toEqual({ x: 12, y: 11, w: 12, h: 6 });
    expect(shrink({ x: 0, y: 0, w: 2, h: 2 }, 5).w).toBe(0);
  });
});
