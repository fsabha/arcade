import { describe, it, expect } from 'vitest';

// Headless smoke test: run the whole game loop (logic + renderer) against stub canvas APIs.
const noop = () => undefined;
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 }) : typeof p === 'string' ? noop : undefined),
    set: () => true,
  });
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
  it('runs menu and a few seconds of play without throwing or stalling', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const t0 = Date.now();
    for (let i = 0; i < 120; i++) { game.update(dt); renderer.draw(game); input.endFrame(); }
    input.tap('confirm');
    game.update(dt); input.endFrame();
    expect(game.state).toBe('playing');
    input.held.add('up');
    for (let i = 0; i < 60 * 20; i++) {
      if (i % 300 === 0) input.held.add('right'); else if (i % 300 === 150) { input.held.delete('right'); input.held.add('left'); }
      game.update(dt); renderer.draw(game); input.endFrame();
    }
    expect(game.speed).toBeGreaterThan(0);
    expect(game.km).toBeGreaterThan(0);
    expect(game.traffic.cars.length).toBeGreaterThan(0);
    expect(Date.now() - t0).toBeLessThan(4000);
  });
});
