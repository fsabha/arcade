import { describe, it, expect } from 'vitest';
import { Actor } from '../src/actors';
import { Maze, tileCenter } from '../src/maze';
import { W, TILE } from '../src/config';

const open = (c: number, r: number) => Maze.isOpen(c, r);

describe('Actor.advance', () => {
  it('moves along the corridor and stops at a wall', () => {
    const a = new Actor(tileCenter(1), tileCenter(1), 'right');
    const moved = a.advance(5 * TILE, open);
    expect(moved).toBeCloseTo(5 * TILE, 5);
    expect(a.col).toBe(6);
    // row 1 from col 1 to col 12 is open, col 13 is wall
    a.advance(100 * TILE, open);
    expect(a.col).toBe(12);
    expect(a.atCenter()).toBe(true);
  });

  it('calls atCenter at every tile centre and can turn there', () => {
    const a = new Actor(tileCenter(1), tileCenter(1), 'right');
    const visits: number[] = [];
    a.advance(3 * TILE, open, () => { visits.push(a.col); return true; });
    expect(visits).toEqual([1, 2, 3]);
    a.advance(1, open, () => { visits.push(a.col); return true; }); // arrival centre is handled on the next step
    expect(visits).toEqual([1, 2, 3, 4]);
    // turn down at (6,1): tile (6,2) is a dot corridor
    const b = new Actor(tileCenter(6), tileCenter(1), 'right');
    b.advance(TILE, open, () => { if (b.col === 6) b.dir = 'down'; return true; });
    expect(b.row).toBe(2);
    expect(b.col).toBe(6);
  });

  it('reports the offset from the tile centre along the movement axis', () => {
    const a = new Actor(tileCenter(1) - 2, tileCenter(1), 'right');
    expect(a.centerOffset()).toBeCloseTo(-2);
    a.x = tileCenter(1) + 3;
    expect(a.centerOffset()).toBeCloseTo(3);
    a.dir = 'left';
    expect(a.centerOffset()).toBeCloseTo(-3);
  });

  it('wraps through the tunnel', () => {
    const a = new Actor(tileCenter(1), tileCenter(14), 'left');
    a.advance(4 * TILE, open);
    expect(a.x).toBeGreaterThan(W);
    a.dir = 'right';
    a.advance(8 * TILE, open);
    expect(a.x).toBeLessThan(W / 2);
    expect(a.row).toBe(14);
  });
});
