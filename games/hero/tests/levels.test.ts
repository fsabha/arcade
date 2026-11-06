import { describe, it, expect } from 'vitest';
import { levelMap, LEVEL_COUNT } from '../src/levels';
import { World } from '../src/world';
import { COLS, ROWS, TILE } from '../src/config';

/** Flood fill through non-solid tiles from the start; can the miner be reached if every D wall were removed? */
function reachable(w: World): boolean {
  const seen = new Set<string>();
  const stack = [[Math.floor(w.start.x / TILE), Math.floor(w.start.y / TILE)]];
  const goal = `${Math.floor(w.miner.x / TILE)},${Math.floor(w.miner.y / TILE)}`;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (k === goal) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = w.tile(x + dx, y + dy);
      if (c !== '#' && c !== 'M' && c !== 'L') stack.push([x + dx, y + dy]);
    }
  }
  return false;
}

describe('levels', () => {
  it('has ten base layouts, each a whole number of screens with one start and one miner', () => {
    expect(LEVEL_COUNT).toBe(10);
    for (let l = 1; l <= 20; l++) {
      const m = levelMap(l);
      expect(m[0].length % COLS, `level ${l} width`).toBe(0);
      expect(m.length % ROWS, `level ${l} height`).toBe(0);
      for (const r of m) expect(r.length).toBe(m[0].length);
      expect(m.join('').split('H').length - 1, `level ${l} starts`).toBe(1);
      expect(m.join('').split('X').length - 1, `level ${l} miners`).toBe(1);
    }
  });
  it('the miner is reachable from the start on every level (walls can be blown up)', () => {
    for (let l = 1; l <= 20; l++) expect(reachable(new World(l)), `level ${l}`).toBe(true);
  });
  it('levels 11-20 mirror the first ten and add vermin', () => {
    const a = new World(1);
    const b = new World(11);
    expect(b.critters.length).toBeGreaterThanOrEqual(a.critters.length);
    expect(b.start.x).not.toBe(a.start.x);
  });
  it('builds rafts and tentacles on lava stretches', () => {
    const w = new World(5);
    expect(w.rafts.length).toBe(3);
    expect(w.tentacles.length).toBe(1);
    expect(w.tile(Math.floor(w.rafts[0].x / TILE), Math.floor(w.rafts[0].y / TILE))).toBe('L');
  });
});
