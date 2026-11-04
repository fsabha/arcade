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
  it('runs menu, how-to, a game with jumps and vines, pause and game over without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); renderer.draw(game); input.endFrame(); } };
    step(30);
    input.tap('down'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('howto');
    input.tap('confirm'); step();
    input.tap('up'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');

    // Run back and forth through many rooms, jumping every half second, pausing once.
    input.held.add('right');
    for (let i = 0; i < 60 * 90 && game.state === 'playing'; i++) {
      if (i % 30 === 0) input.tap('fire');
      if (i % 600 === 0) { const dir = (i / 600) % 2 === 0 ? 'right' : 'left'; input.held.clear(); input.held.add(dir); }
      if (i === 600) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      step();
    }
    expect(game.roomsVisited).toBeGreaterThan(1);
    expect(game.deaths + game.treasures + game.roomsVisited).toBeGreaterThan(1);
    // force the end and walk through the game over screen
    if (game.state === 'playing') { game.timeLeft = 0.01; step(5); }
    expect(game.state).toBe('gameover');
    step(60 * 3);
    input.tap('confirm'); step();
    expect(['initials', 'menu']).toContain(game.state);
    if (game.state === 'initials') {
      for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); }
      expect(game.state).toBe('ranking');
    }
  });
});
