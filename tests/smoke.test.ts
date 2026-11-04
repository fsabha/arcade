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
const { PLAYER_MIN_Y, OXYGEN_MAX } = await import('../src/config');

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
  it('runs menu, dives, shoots and surfaces without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = () => { game.update(dt); renderer.draw(game); input.endFrame(); };
    for (let i = 0; i < 120; i++) step();
    input.tap('confirm');
    step();
    expect(game.state).toBe('playing');
    expect(game.player.y).toBe(PLAYER_MIN_Y);

    // dive for 5 s, firing now and then
    input.held.add('down');
    for (let i = 0; i < 300; i++) { if (i % 40 === 0) input.tap('fire'); step(); }
    input.held.delete('down');
    expect(game.dived).toBe(true);
    expect(game.oxygen).toBeLessThan(OXYGEN_MAX);

    // surfacing with no divers costs a life (unless something already killed us)
    const livesBefore = game.score.lives;
    input.held.add('up');
    for (let i = 0; i < 400; i++) step();
    expect(['dying', 'playing']).toContain(game.state);
    for (let i = 0; i < 200; i++) step();
    expect(game.score.lives).toBeLessThanOrEqual(livesBefore);
    expect(game.score.lives).toBeGreaterThanOrEqual(livesBefore - 2);
  });
});
