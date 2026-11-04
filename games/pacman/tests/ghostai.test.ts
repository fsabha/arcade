import { describe, it, expect } from 'vitest';
import { chaseTarget, scatterTarget, chooseDir, randomDir } from '../src/ghostai';
import { Maze } from '../src/maze';
import { SCATTER_TARGETS } from '../src/config';

const open = (c: number, r: number) => Maze.isOpen(c, r);

describe('chase targets', () => {
  const pac = { x: 10, y: 20 };
  const blinky = { x: 4, y: 20 };

  it('Blinky targets Pac-Man directly', () => {
    expect(chaseTarget('blinky', pac, 'left', blinky, { x: 0, y: 0 })).toEqual(pac);
  });

  it('Pinky targets four tiles ahead, with the up overflow bug', () => {
    expect(chaseTarget('pinky', pac, 'right', blinky, { x: 0, y: 0 })).toEqual({ x: 14, y: 20 });
    expect(chaseTarget('pinky', pac, 'up', blinky, { x: 0, y: 0 })).toEqual({ x: 6, y: 16 });
  });

  it('Inky doubles the vector from Blinky to two tiles ahead of Pac-Man', () => {
    expect(chaseTarget('inky', pac, 'right', blinky, { x: 0, y: 0 })).toEqual({ x: 20, y: 20 });
    expect(chaseTarget('inky', pac, 'up', blinky, { x: 0, y: 0 })).toEqual({ x: 12, y: 16 });
  });

  it('Clyde chases when far and scatters when within 8 tiles', () => {
    expect(chaseTarget('clyde', pac, 'left', blinky, { x: 0, y: 0 })).toEqual(pac);
    expect(chaseTarget('clyde', pac, 'left', blinky, { x: 12, y: 20 })).toEqual(SCATTER_TARGETS.clyde);
    expect(scatterTarget('blinky')).toEqual({ x: 25, y: -3 });
  });
});

describe('chooseDir', () => {
  it('never reverses and prefers the shortest straight-line distance', () => {
    // tile (6,5) is a 4-way intersection on the top corridor
    const at = { x: 6, y: 5 };
    expect(chooseDir(at, 'right', { x: 6, y: 20 }, open, true)).toBe('down');
    expect(chooseDir(at, 'right', { x: 0, y: 5 }, open, true)).not.toBe('left');
    expect(chooseDir(at, 'down', { x: 6, y: 0 }, open, true)).not.toBe('up');
  });

  it('breaks ties up, left, down, right', () => {
    const at = { x: 6, y: 5 };
    // target equidistant from the up and down neighbours → up wins
    expect(chooseDir(at, 'right', { x: 6, y: 5 }, open, true)).toBe('up');
  });

  it('respects the no-up zones only when restricted', () => {
    const at = { x: 12, y: 11 };
    expect(chooseDir(at, 'right', { x: 12, y: 0 }, open, true)).not.toBe('up');
    expect(chooseDir(at, 'right', { x: 12, y: 0 }, open, false)).toBe('up');
  });

  it('random direction never reverses when another exit exists', () => {
    const at = { x: 6, y: 5 };
    for (let i = 0; i < 20; i++) expect(randomDir(at, 'right', open, () => i / 20)).not.toBe('left');
  });
});
