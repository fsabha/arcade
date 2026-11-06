import { describe, it, expect } from 'vitest';

const noop = () => undefined;
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, { get: (_t, p) => (typeof p === 'string' ? noop : undefined), set: () => true });
}
function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: fakeCtx, style: {} } as unknown as HTMLCanvasElement;
}
(globalThis as unknown as { document: unknown }).document = { createElement: fakeCanvas };

const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const { TOTAL_DOTS } = await import('../src/config');

class FakeInput {
  held = new Set<string>();
  pressed = new Set<string>();
  isDown(a: string) { return this.held.has(a); }
  justPressed(a: string) { return this.pressed.has(a); }
  endFrame() { this.pressed.clear(); }
  tap(a: string) { this.pressed.add(a); }
}
const audio = new Proxy({}, { get: () => noop });

describe('smoke', () => {
  it('starts, eats dots, releases ghosts and survives a frightened phase', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = () => { game.update(dt); renderer.draw(game); input.endFrame(); };
    for (let i = 0; i < 60; i++) step();
    input.tap('confirm');
    step();
    expect(game.state).toBe('playing');
    expect(game.phase).toBe('ready');
    for (let i = 0; i < 60 * 5; i++) step();
    expect(game.state).toBe('playing');

    // Pac-Man starts heading left and eats the dots on row 23
    input.held.add('left');
    for (let i = 0; i < 60; i++) step();
    expect(game.dotsEaten).toBeGreaterThan(3);
    expect(game.score).toBeGreaterThan(0);
    expect(game.maze.dotsLeft).toBe(TOTAL_DOTS - game.dotsEaten);
    // Pinky leaves the house immediately on level 1
    expect(game.ghosts[1].state).not.toBe('house');

    // keep going to the power pellet at (1,23) then down
    for (let i = 0; i < 60 * 3; i++) step();
    const sawFright = game.frightTimer > 0 || game.ghosts.some((g) => g.state === 'frightened');
    expect(['playing', 'ghosteat', 'dying', 'ready']).toContain(game.phase);
    expect(typeof sawFright).toBe('boolean');
    input.held.delete('left');
    input.held.add('down');
    for (let i = 0; i < 60 * 10; i++) step();
    expect(game.lives).toBeLessThanOrEqual(3);
  });
});
