import { it, expect } from 'vitest';
const noop = () => undefined;
(globalThis as unknown as { document: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => noop, set: () => true }), style: {} }) };
const { Game } = await import('../src/game');
class FakeInput { held = new Set<string>(); pressed = new Set<string>(); isDown(a: string) { return this.held.has(a); } justPressed(a: string) { return this.pressed.has(a); } endFrame() { this.pressed.clear(); } tap(a: string) { this.pressed.add(a); } }
it('Harry can grab the vine, swing across the tar pit and land on the far side', () => {
  let crossed = false;
  for (let delay = 0; delay < 160 && !crossed; delay += 4) {
    const input = new FakeInput();
    const g = new Game(input as never, new Proxy({}, { get: () => noop }) as never);
    g.startGame();
    g.enterRoom(0b00010000);
    g.harry.x = 40;
    for (let i = 0; i < delay; i++) { g.update(1 / 60); input.endFrame(); }
    input.held.add('right');
    let swung = false;
    for (let i = 0; i < 60 * 6 && g.state === 'playing'; i++) {
      if (g.harry.mode === 'ground' && g.harry.x >= 60 && !swung) input.tap('fire');
      if (g.harry.mode === 'swing') { swung = true; if (g.vineTip.x > 200) input.tap('down'); }
      g.update(1 / 60); input.endFrame();
      if (swung && g.harry.mode === 'ground' && g.harry.x > 216) { crossed = true; break; }
    }
  }
  expect(crossed).toBe(true);
});
