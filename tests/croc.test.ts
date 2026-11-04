import { it, expect } from 'vitest';
import { crocOpen } from '../src/world';
const noop = () => undefined;
(globalThis as unknown as { document: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => noop, set: () => true }), style: {} }) };
const { Game } = await import('../src/game');
const { PX, HARRY_W, CROC_PERIOD } = await import('../src/config');
class FakeInput { held = new Set<string>(); pressed = new Set<string>(); isDown(a: string) { return this.held.has(a); } justPressed(a: string) { return this.pressed.has(a); } endFrame() { this.pressed.clear(); } tap(a: string) { this.pressed.add(a); } }

it('the crocodile pit can be crossed head by head while the jaws are closed', () => {
  const input = new FakeInput();
  const g = new Game(input as never, new Proxy({}, { get: () => noop }) as never);
  g.startGame();
  g.enterRoom(0b00100001); // crocodiles, no vine
  g.harry.x = 60;
  // wait on the bank until the jaws have just closed
  while (!(crocOpen(g.roomTime) === false && crocOpen(g.roomTime - 1 / 60) === true)) { g.update(1 / 60); input.endFrame(); }
  expect(g.roomTime).toBeCloseTo(CROC_PERIOD, 1);
  input.held.add('right');
  // jump whenever the feet centre is 4 u into a safe spot (bank edge or a head) and still grounded
  const launch = [40, 60, 76, 92]; // u: bank edge, then the right half of each head
  let next = 0;
  for (let i = 0; i < 60 * 4 && g.state === 'playing'; i++) {
    const cu = (g.harry.x + HARRY_W / 2) / PX;
    if (g.harry.mode === 'ground' && next < launch.length && cu >= launch[next]) { input.tap('fire'); next++; }
    g.update(1 / 60); input.endFrame();
    if (g.harry.mode === 'ground' && cu >= 110) break;
  }
  expect(g.harry.mode).toBe('ground');
  expect((g.harry.x + HARRY_W / 2) / PX).toBeGreaterThanOrEqual(108);
  expect(g.deaths).toBe(0);
});
