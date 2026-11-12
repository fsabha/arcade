import { describe, it, expect } from 'vitest';
import { Formation, tickInterval, kindForRow, startY, KIND_SIZE } from '../src/formation';
import { ROWS, COLS, W, FORMATION_MARGIN, STEP_X, STEP_DOWN, TICK_MIN, TICK_MAX, FORMATION_Y0, FORMATION_Y_MAX } from '../src/config';

describe('Formation', () => {
  it('starts with a full 5x11 grid of the right kinds', () => {
    const f = new Formation(1);
    expect(f.invaders).toHaveLength(ROWS * COLS);
    expect(f.aliveCount).toBe(55);
    expect(f.at(0, 0).kind).toBe('squid');
    expect(f.at(1, 0).kind).toBe('crab');
    expect(f.at(4, 0).kind).toBe('octopus');
    expect(kindForRow(2)).toBe('crab');
  });

  it('marches right, drops and reverses at the edge, then marches left', () => {
    const f = new Formation(1);
    const y0 = f.y;
    let dropped = 0;
    let steps = 0;
    while (dropped < 2 && steps < 500) {
      if (f.step()) dropped++;
      steps++;
      const b = f.bounds()!;
      expect(b.left).toBeGreaterThanOrEqual(FORMATION_MARGIN);
      expect(b.right).toBeLessThanOrEqual(W - FORMATION_MARGIN);
    }
    expect(dropped).toBe(2);
    expect(f.y).toBe(y0 + 2 * STEP_DOWN);
    expect(f.dir).toBe(1);
  });

  it('moves STEP_X per tick and toggles the animation frame', () => {
    const f = new Formation(1);
    const x0 = f.x;
    expect(f.frame).toBe(0);
    f.step();
    expect(f.x).toBe(x0 + STEP_X);
    expect(f.frame).toBe(1);
  });

  it('uses the alive invaders only for bounds and edge detection', () => {
    const f = new Formation(1);
    for (const inv of f.invaders) if (inv.col !== 5) inv.alive = false;
    const b = f.bounds()!;
    const r = f.rect(f.at(0, 5));
    expect(b.left).toBe(f.rect(f.at(4, 5)).x);
    expect(b.top).toBe(r.y);
    expect(f.aliveCount).toBe(5);
    expect(f.bounds()).not.toBeNull();
    for (const inv of f.invaders) inv.alive = false;
    expect(f.bounds()).toBeNull();
    expect(f.step()).toBe(false);
  });

  it('picks the bottom-most alive invader per column as shooters', () => {
    const f = new Formation(1);
    f.at(4, 0).alive = false;
    f.at(3, 0).alive = false;
    for (let r = 0; r < ROWS; r++) f.at(r, 1).alive = false;
    const s = f.shooters();
    expect(s).toHaveLength(COLS - 1);
    expect(s[0]).toBe(f.at(2, 0));
    expect(s[1]).toBe(f.at(4, 2));
  });

  it('hit-tests against sprite rects', () => {
    const f = new Formation(1);
    const r = f.rect(f.at(4, 3));
    expect(f.hitTest({ x: r.x + 1, y: r.y + 1, w: 1, h: 1 })).toBe(f.at(4, 3));
    f.at(4, 3).alive = false;
    expect(f.hitTest({ x: r.x + 1, y: r.y + 1, w: 1, h: 1 })).toBeNull();
    expect(KIND_SIZE.octopus).toEqual([12, 8]);
  });
});

describe('tickInterval', () => {
  it('is slow with a full formation and fast with one invader, never below the floor', () => {
    expect(tickInterval(55, 1)).toBeCloseTo(TICK_MAX, 5);
    expect(tickInterval(1, 1)).toBeCloseTo(TICK_MIN, 5);
    expect(tickInterval(20, 1)).toBeLessThan(tickInterval(40, 1));
    expect(tickInterval(55, 5)).toBeLessThan(tickInterval(55, 1));
    expect(tickInterval(1, 50)).toBeGreaterThanOrEqual(TICK_MIN * 0.55 - 1e-9);
  });
});

describe('startY', () => {
  it('starts lower on later waves, capped', () => {
    expect(startY(1)).toBe(FORMATION_Y0);
    expect(startY(2)).toBeGreaterThan(FORMATION_Y0);
    expect(startY(50)).toBe(FORMATION_Y_MAX);
  });
});
