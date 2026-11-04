import { describe, it, expect } from 'vitest';
import { Traffic } from '../src/traffic';
import { W, LANES, laneTop, laneDir, LANE_H, WRAP_MARGIN } from '../src/config';

describe('Traffic', () => {
  it("is deterministic and keeps every lane's copies inside the lane", () => {
    const a = new Traffic(3, 42);
    const b = new Traffic(3, 42);
    expect(a.vehicles).toEqual(b.vehicles);
    for (let lane = 1; lane <= LANES; lane++) {
      const vs = a.vehicles.filter((v) => v.lane === lane);
      expect(vs.length).toBeGreaterThanOrEqual(1);
      for (const v of vs) {
        expect(v.dir).toBe(laneDir(lane));
        expect(v.y).toBeGreaterThanOrEqual(laneTop(lane));
        expect(v.y + v.h).toBeLessThanOrEqual(laneTop(lane) + LANE_H);
      }
    }
    expect(a.vehicles.filter((v) => v.lane === 1)).toHaveLength(3);
    expect(a.vehicles.filter((v) => v.lane === 5)[0].truck).toBe(true);
  });

  it('moves vehicles in their lane direction and wraps around', () => {
    const t = new Traffic(1, 1);
    const v = t.vehicles.find((x) => x.lane === 1)!;
    v.x = 0;
    t.update(0.1);
    expect(v.x).toBeCloseTo(t.laneSpeed(1) * 0.1, 5);
    const u = t.vehicles.find((x) => x.lane === 10)!;
    u.x = 100;
    t.update(0.1);
    expect(u.x).toBeCloseTo(100 - t.laneSpeed(10) * 0.1, 5);
    for (let i = 0; i < 60 * 30; i++) t.update(1 / 60);
    for (const x of t.vehicles) {
      expect(x.x).toBeGreaterThanOrEqual(-WRAP_MARGIN - 1e-6);
      expect(x.x).toBeLessThanOrEqual(W + WRAP_MARGIN + 1e-6);
    }
  });

  it('games 5-8 change lane speeds over time; games 1-4 do not', () => {
    const fixed = new Traffic(2, 3);
    const s0 = fixed.laneSpeed(3);
    for (let i = 0; i < 600; i++) fixed.update(1 / 60);
    expect(fixed.laneSpeed(3)).toBe(s0);

    const rnd = new Traffic(6, 3);
    const seen = new Set<number>();
    for (let i = 0; i < 60 * 30; i++) { rnd.update(1 / 60); seen.add(Math.round(rnd.laneSpeed(3) * 100)); }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('freezes when the match ends', () => {
    const t = new Traffic(1, 5);
    t.frozen = true;
    const xs = t.vehicles.map((v) => v.x);
    t.update(1);
    expect(t.vehicles.map((v) => v.x)).toEqual(xs);
  });
});
