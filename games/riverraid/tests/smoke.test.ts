import { describe, it, expect } from 'vitest';

// Headless smoke test: run the whole game loop (logic + renderer) against stub canvas APIs.
const noop = () => undefined;
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, p) => (typeof p === 'string' ? noop : undefined),
    set: () => true,
  });
}
function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: fakeCtx, style: {} } as unknown as HTMLCanvasElement;
}
(globalThis as unknown as { document: unknown }).document = { createElement: fakeCanvas };

const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const { DYING_TIME, FUEL_MAX } = await import('../src/config');

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
  it('runs the menu, flies, pauses and resumes without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = () => { game.update(dt); renderer.draw(game); input.endFrame(); };
    for (let i = 0; i < 60; i++) step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    expect(game.phase).toBe('flying');
    for (let i = 0; i < 120; i++) step();
    expect(game.fuel).toBeLessThan(FUEL_MAX);
    input.tap('pause'); step();
    expect(game.state).toBe('paused');
    input.tap('pause'); step();
    expect(game.state).toBe('playing');
  });

  it('runs out of fuel, explodes and respawns with one life less', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const dt = 1 / 60;
    const step = () => { game.update(dt); input.endFrame(); };
    input.tap('confirm'); step();
    const lives = game.score.lives;
    game.fuel = 0.001;
    step();
    expect(game.state).toBe('playing');
    expect(game.phase).toBe('dying');
    expect(game.deathReason).toBe('SEM COMBUSTIVEL');
    for (let i = 0; i < Math.ceil(DYING_TIME * 60) + 2; i++) step();
    expect(game.phase).toBe('flying');
    expect(game.score.lives).toBe(lives - 1);
    expect(game.fuel).toBeGreaterThan(FUEL_MAX - 1); // refilled, one frame of flying already spent
  });
});
