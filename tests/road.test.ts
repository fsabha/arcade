import { describe, it, expect } from 'vitest';
import { Road, curveAmplitude } from '../src/road';
import { SEG_LEN } from '../src/config';

describe('Road', () => {
  it('is deterministic for the same seed', () => {
    const a = new Road(5);
    const b = new Road(5);
    a.ensure(SEG_LEN * 2000);
    b.ensure(SEG_LEN * 2000);
    expect(a.segments.map((s) => s.curve)).toEqual(b.segments.map((s) => s.curve));
  });

  it('starts straight and indexes segments by z', () => {
    const r = new Road(1);
    for (let i = 0; i < 40; i++) expect(r.segments[i].curve).toBe(0);
    expect(r.indexAt(0)).toBe(0);
    expect(r.indexAt(SEG_LEN - 1)).toBe(0);
    expect(r.indexAt(SEG_LEN)).toBe(1);
    expect(r.segmentAt(SEG_LEN * 3.5).index).toBe(3);
  });

  it('grows on demand and keeps indexes contiguous', () => {
    const r = new Road(9);
    expect(r.ensure(SEG_LEN * 500)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(SEG_LEN * 500);
    r.segments.forEach((s, i) => expect(s.index).toBe(i));
    expect(r.ensure(SEG_LEN * 10)).toBe(false);
  });

  it('eases curves so consecutive segments never jump too much', () => {
    const r = new Road(77);
    r.ensure(SEG_LEN * 3000);
    for (let i = 1; i < r.segments.length; i++) {
      expect(Math.abs(r.segments[i].curve - r.segments[i - 1].curve)).toBeLessThan(1.5);
      expect(Math.abs(r.segments[i].curve)).toBeLessThanOrEqual(curveAmplitude(i) + 1e-9);
    }
  });

  it('contains curves in both directions', () => {
    const r = new Road(3);
    r.ensure(SEG_LEN * 2000);
    expect(r.segments.some((s) => s.curve > 1)).toBe(true);
    expect(r.segments.some((s) => s.curve < -1)).toBe(true);
  });
});
