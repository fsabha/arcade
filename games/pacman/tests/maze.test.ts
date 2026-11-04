import { describe, it, expect } from 'vitest';
import { Maze, MAP } from '../src/maze';
import { COLS, ROWS, TOTAL_DOTS } from '../src/config';

describe('maze', () => {
  it('is 28x31 and horizontally symmetric', () => {
    expect(MAP.length).toBe(ROWS);
    for (const row of MAP) {
      expect(row.length).toBe(COLS);
      expect(row).toBe([...row].reverse().join(''));
    }
  });

  it('has 240 dots and 4 power pellets', () => {
    const m = new Maze();
    expect(m.dotsLeft).toBe(TOTAL_DOTS);
    let pellets = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m.dotAt(c, r) === 2) pellets++;
    expect(pellets).toBe(4);
  });

  it('eats dots once and tracks the count', () => {
    const m = new Maze();
    expect(m.eat(1, 1)).toBe(1);
    expect(m.eat(1, 1)).toBe(0);
    expect(m.dotsLeft).toBe(TOTAL_DOTS - 1);
    expect(m.eat(1, 3)).toBe(2);
    m.reset();
    expect(m.dotsLeft).toBe(TOTAL_DOTS);
  });

  it('blocks walls and the door for Pac-Man, opens the door for ghosts, tunnel wraps', () => {
    expect(Maze.isOpen(0, 0)).toBe(false);
    expect(Maze.isOpen(1, 1)).toBe(true);
    expect(Maze.isOpen(13, 12)).toBe(false);
    expect(Maze.isOpen(13, 12, true)).toBe(true);
    expect(Maze.isOpen(-1, 14)).toBe(true);
    expect(Maze.isOpen(28, 14)).toBe(true);
    expect(Maze.isOpen(-1, 13)).toBe(false);
    expect(Maze.isTunnel(0, 14)).toBe(true);
    expect(Maze.isTunnel(10, 14)).toBe(false);
    expect(Maze.isHouse(13, 14)).toBe(true);
  });

  it('start positions are open and dot-free', () => {
    const m = new Maze();
    expect(Maze.isOpen(13, 23)).toBe(true);
    expect(Maze.isOpen(14, 23)).toBe(true);
    expect(m.dotAt(13, 23)).toBe(0);
    expect(m.dotAt(14, 23)).toBe(0);
    expect(Maze.isOpen(13, 11)).toBe(true);
    expect(Maze.isOpen(14, 11)).toBe(true);
  });
});
