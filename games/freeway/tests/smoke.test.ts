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
const { MATCH_TIME, CHICKEN_START_Y } = await import('../src/config');

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
  it('plays a whole match: crosses, gets hit, and ends on time', () => {
    const input = new FakeInput();
    const game = new Game(input as never, audio as never);
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = () => { game.update(dt); renderer.draw(game); input.endFrame(); };
    for (let i = 0; i < 30; i++) step();
    // pick game 4 (all trucks) on difficulty A via the menu
    input.tap('down'); step();
    for (let i = 0; i < 3; i++) { input.tap('right'); step(); }
    expect(game.gameNumber).toBe(4);
    input.tap('down'); step();
    input.tap('right'); step();
    expect(game.difficulty).toBe('A');
    input.tap('up'); step(); input.tap('up'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    expect(game.chickenY).toBe(CHICKEN_START_Y);

    input.held.add('up');
    const frames = Math.ceil((MATCH_TIME + 1) * 60);
    for (let i = 0; i < frames && game.state === 'playing'; i++) step();
    expect(game.state).toBe('gameover');
    expect(game.timeLeft).toBe(0);
    expect(game.traffic.frozen).toBe(true);
    expect(game.crossings + game.hits).toBeGreaterThan(0);
    expect(game.score).toBe(game.crossings);
  });
});
