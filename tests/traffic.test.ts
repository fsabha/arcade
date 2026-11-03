import { describe, it, expect } from 'vitest';
import { Traffic } from '../src/traffic';
import { MAX_SPEED, ROAD_HALF, CAR_W, HIT_DX, HIT_DZ } from '../src/config';
import { difficulty, quotaFor } from '../src/scoring';

describe('Traffic', () => {
  it('spawns deterministic cars on the road ahead', () => {
    const a = new Traffic(1, 5000);
    const b = new Traffic(1, 5000);
    a.spawn(60000, 1);
    b.spawn(60000, 1);
    expect(a.cars).toEqual(b.cars);
    expect(a.cars.length).toBeGreaterThan(5);
    for (const c of a.cars) {
      expect(c.z).toBeGreaterThanOrEqual(5000);
      expect(Math.abs(c.x) + CAR_W / 2).toBeLessThanOrEqual(ROAD_HALF);
      expect(c.speed).toBeGreaterThan(0);
      expect(c.speed).toBeLessThan(MAX_SPEED);
    }
  });

  it('counts cars the player overtakes and cars that overtake the player', () => {
    const t = new Traffic(2, 0);
    t.cars.push({ id: 1, z: 1000, x: 0, speed: 0, color: 'red', behind: false });
    t.cars.push({ id: 2, z: 100, x: 400, speed: 5000, color: 'blue', behind: true });
    // player moves from z=500 to z=1500: passes car 1; car 2 moves to 600 (still behind)
    let r = t.update(0.1, 1500, 0);
    expect(r).toEqual({ passed: 1, passedBy: 0 });
    // now the player stops at 1500; car 2 goes 600 -> 1600, overtaking
    r = t.update(0.2, 1500, 0);
    expect(r).toEqual({ passed: 0, passedBy: 1 });
  });

  it('drops cars left far behind the camera', () => {
    const t = new Traffic(3, 0);
    t.cars.push({ id: 1, z: 0, x: 0, speed: 0, color: 'red', behind: true });
    t.update(0.016, 10000, 10000);
    expect(t.cars).toHaveLength(0);
  });

  it('detects collisions only inside the hit box', () => {
    const t = new Traffic(4, 0);
    t.cars.push({ id: 1, z: 1000, x: 100, speed: 0, color: 'red', behind: false });
    expect(t.collision(1000, 100)?.id).toBe(1);
    expect(t.collision(1000 + HIT_DZ + 1, 100)).toBeNull();
    expect(t.collision(1000, 100 + HIT_DX + 1)).toBeNull();
    expect(t.collision(1000 - HIT_DZ + 1, 100 - HIT_DX + 1)?.id).toBe(1);
  });

  it('slows a faster car that is about to rear-end one in the same lane', () => {
    const t = new Traffic(5, 0);
    t.cars.push({ id: 1, z: 2000, x: 0, speed: 3000, color: 'red', behind: false });
    t.cars.push({ id: 2, z: 1500, x: 20, speed: 8000, color: 'blue', behind: false });
    t.update(0.016, 0, 0);
    expect(t.cars[1].speed).toBe(3000);
  });
});

describe('rules', () => {
  it('quota is 200 on day 1 and 300 afterwards', () => {
    expect(quotaFor(1)).toBe(200);
    expect(quotaFor(2)).toBe(300);
    expect(quotaFor(9)).toBe(300);
  });

  it('difficulty tightens gaps and raises speeds with the day, within bounds', () => {
    const d1 = difficulty(1);
    const d5 = difficulty(5);
    expect(d5.gap).toBeLessThan(d1.gap);
    expect(d5.pairChance).toBeGreaterThan(d1.pairChance);
    expect(d5.maxSpeed).toBeGreaterThan(d1.maxSpeed);
    expect(difficulty(50).gap).toBe(2600);
    expect(difficulty(50).pairChance).toBeLessThanOrEqual(0.45);
    expect(difficulty(50).maxSpeed).toBeLessThanOrEqual(0.72);
  });
});
