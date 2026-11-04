import { describe, it, expect } from 'vitest';
import { project, screenWidth } from '../src/projection';
import { W, PLAY_H, HORIZON, NEAR_Z, ROAD_HALF } from '../src/config';

describe('project', () => {
  it('maps the near plane onto the bottom row and far depths toward the horizon', () => {
    expect(project(0, NEAR_Z).y).toBeCloseTo(PLAY_H, 6);
    const far = project(0, NEAR_Z * 100);
    expect(far.y).toBeGreaterThan(HORIZON);
    expect(far.y).toBeLessThan(HORIZON + 2);
    expect(project(0, NEAR_Z).x).toBe(W / 2);
  });

  it('shrinks lateral offsets with depth', () => {
    const near = project(ROAD_HALF, NEAR_Z);
    const far = project(ROAD_HALF, NEAR_Z * 4);
    expect(near.x - W / 2).toBeCloseTo((far.x - W / 2) * 4, 6);
    expect(screenWidth(ROAD_HALF, near.scale)).toBeCloseTo(near.x - W / 2, 6);
  });

  it('keeps the road inside the canvas at the bottom row', () => {
    const near = project(0, NEAR_Z);
    expect(screenWidth(ROAD_HALF, near.scale) * 2).toBeLessThanOrEqual(W);
  });
});
