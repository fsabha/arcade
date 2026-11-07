import { describe, it, expect } from 'vitest';
import { World, MAX_SHIELD, DASH_TIME } from '../src/world';

const run = (w: World, seconds: number, each?: (w: World) => void) => {
  for (let i = 0; i < seconds * 60; i++) { each?.(w); w.update(1 / 60); }
};

describe('cometa world', () => {
  it('climbs, scores distance and lays the course ahead of the camera', () => {
    const w = new World(2.1, 42);
    run(w, 5);
    expect(w.camY).toBeGreaterThan(2.5);
    expect(w.score).toBeGreaterThan(20);
    expect(w.orbs.length + w.rocks.length).toBeGreaterThan(0);
    for (const o of w.orbs) expect(o.y).toBeGreaterThan(w.camY - 0.4);
    expect(Math.max(...w.orbs.map((o) => o.y))).toBeGreaterThan(w.camY + w.H * 0.8);
  });

  it('steering is relative and clamped to the playfield', () => {
    const w = new World(2, 1);
    w.steer(0.2, 0);
    expect(w.comet.tx).toBeCloseTo(0.75, 5);
    w.steer(5, 0);
    expect(w.comet.tx).toBe(0.96);
    w.steer(0, -10);
    expect(w.comet.ty).toBe(0.72);
    run(w, 1);
    expect(w.comet.x).toBeGreaterThan(0.9);
  });

  it('collecting orbs builds a combo, a multiplier and dash charge', () => {
    const w = new World(2, 3);
    const c = w.comet;
    for (let i = 0; i < 12; i++) w.orbs.push({ x: c.x, y: c.y + 0.05 + i * 0.02, taken: false, phase: 0 });
    run(w, 0.5);
    expect(w.combo).toBeGreaterThanOrEqual(12);
    expect(w.mult).toBeGreaterThanOrEqual(3);
    expect(w.charges).toBeGreaterThan(1.9);
    expect(w.events.some((e) => e.kind === 'orb')).toBe(true);
  });

  it('a rock costs a shield point, three end the run; a dash smashes rocks instead', () => {
    const w = new World(2, 5);
    w.rocks = []; w.holes = [];
    const hitRock = () => w.rocks.push({ x: w.comet.x, y: w.comet.y + 0.02, r: 0.05, vx: 0, vy: 0, spin: 0, a: 0, seed: 0, broken: false });
    hitRock();
    w.update(1 / 60);
    expect(w.shield).toBe(MAX_SHIELD - 1);
    expect(w.combo).toBe(0);
    // invulnerable for a moment
    hitRock();
    w.update(1 / 60);
    expect(w.shield).toBe(MAX_SHIELD - 1);
    w.inv = 0;
    w.charges = 1;
    expect(w.tap()).toBe(true);
    expect(w.tap()).toBe(false);
    hitRock();
    w.update(1 / 60);
    expect(w.shield).toBe(MAX_SHIELD - 1);
    expect(w.events.some((e) => e.kind === 'break')).toBe(true);
    run(w, DASH_TIME + 0.1);
    for (let k = 0; k < 2; k++) { w.inv = 0; w.dashT = 0; hitRock(); w.update(1 / 60); }
    expect(w.over).toBe(true);
    expect(w.events.some((e) => e.kind === 'over')).toBe(true);
  });

  it('gates pay when flown through, black holes pull and pay a slingshot', () => {
    const w = new World(2, 9);
    w.orbs = []; w.rocks = [];
    w.gates.push({ x1: w.comet.x - 0.1, x2: w.comet.x + 0.1, y: w.comet.y + 0.05, passed: false, missed: false });
    run(w, 0.3);
    expect(w.gates.some((g) => g.passed) || w.events.some((e) => e.kind === 'gate')).toBe(true);

    const v = new World(2, 11);
    v.orbs = []; v.rocks = []; v.gates = [];
    const c = v.comet;
    v.holes.push({ x: c.x + 0.2, y: c.y + 0.25, core: 0.034, reach: 0.34, close: 0, paid: false });
    const x0 = c.x;
    run(v, 0.15);
    expect(v.comet.x).toBeGreaterThan(x0); // pulled towards the hole
    v.holes[0].close = 0.5;
    v.holes[0].x = c.x + 0.3; v.holes[0].y = c.y; // now well outside the inner zone
    v.update(1 / 60);
    expect(v.events.some((e) => e.kind === 'sling')).toBe(true);
  });

  it('a long run speeds up and keeps memory bounded', () => {
    const w = new World(2.2, 77);
    w.inv = 1e9;
    run(w, 120, (x) => { x.inv = 1e9; });
    expect(w.speed).toBeGreaterThan(1.5);
    expect(w.orbs.length + w.rocks.length + w.holes.length + w.gates.length).toBeLessThan(200);
    expect(w.holes.length + w.gates.length).toBeGreaterThanOrEqual(0);
  });
});
