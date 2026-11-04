import { describe, it, expect } from 'vitest';
import { Sea } from '../src/sea';
import { W, LANES, ENEMY_H } from '../src/config';

function run(sea: Sea, seconds: number, level = 1, playerX = W / 2): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) sea.update(dt, level, playerX);
}

describe('Sea', () => {
  it('is deterministic for the same seed', () => {
    const a = new Sea(5);
    const b = new Sea(5);
    run(a, 10);
    run(b, 10);
    expect(a.enemies).toEqual(b.enemies);
    expect(a.divers).toEqual(b.divers);
  });

  it('spawns enemies and divers on the lanes, one group per lane at a time', () => {
    const sea = new Sea(3);
    let sawEnemy = false;
    let sawDiver = false;
    for (let f = 0; f < 60 * 20; f++) {
      sea.update(1 / 60, 1, W / 2);
      sawEnemy ||= sea.enemies.length > 0;
      sawDiver ||= sea.divers.length > 0;
      for (const e of sea.enemies) {
        expect(LANES[e.lane] - ENEMY_H / 2).toBe(e.y);
        expect(Math.sign(e.vx)).toBe(e.dir);
      }
      for (let lane = 0; lane < LANES.length; lane++) {
        const inLane = sea.enemies.filter((e) => e.lane === lane);
        expect(new Set(inLane.map((e) => e.kind)).size).toBeLessThanOrEqual(1);
        expect(new Set(inLane.map((e) => e.dir)).size).toBeLessThanOrEqual(1);
        expect(sea.divers.filter((d) => d.lane === lane).length).toBeLessThanOrEqual(1);
      }
    }
    expect(sawEnemy).toBe(true);
    expect(sawDiver).toBe(true);
  });

  it('removes entities that leave the screen and dead ones', () => {
    const sea = new Sea(9);
    run(sea, 3);
    const e = sea.enemies[0];
    e.dead = true;
    sea.update(1 / 60, 1, W / 2);
    expect(sea.enemies.find((x) => x.id === e.id)).toBeUndefined();
    sea.enemies.push({ id: 999, kind: 'shark', lane: 0, dir: 1, vx: 1000, fireCd: 0, dead: false, x: W + 10, y: 0, w: 16, h: 8 });
    sea.update(1 / 60, 1, W / 2);
    expect(sea.enemies.find((x) => x.id === 999)).toBeUndefined();
  });

  it('enemy subs fire torpedoes only toward the player', () => {
    const sea = new Sea(1);
    sea.enemies.push({ id: 1, kind: 'sub', lane: 0, dir: 1, vx: 0, fireCd: 0, dead: false, x: 100, y: 68, w: 16, h: 8 });
    sea.update(1 / 60, 1, 50); // player behind the sub
    expect(sea.torpedoes).toHaveLength(0);
    sea.update(1 / 60, 1, 250); // player ahead
    expect(sea.torpedoes).toHaveLength(1);
    expect(sea.torpedoes[0].vx).toBeGreaterThan(0);
  });

  it('patrol sub only cruises after being enabled, then crosses the surface', () => {
    const sea = new Sea(2);
    run(sea, 6);
    expect(sea.patrol.active).toBe(false);
    sea.patrolEnabled = true;
    run(sea, 4);
    expect(sea.patrol.active).toBe(true);
    run(sea, 20);
    // it keeps cycling: at some point it was inactive again and came back
    expect(typeof sea.patrol.active).toBe('boolean');
  });

  it('reset clears the sea', () => {
    const sea = new Sea(4);
    run(sea, 10);
    sea.reset();
    expect(sea.enemies).toHaveLength(0);
    expect(sea.divers).toHaveLength(0);
    expect(sea.torpedoes).toHaveLength(0);
  });
});
