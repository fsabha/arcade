import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');

describe('smoke', () => {
  it('runs menus, a game with random flying, pause and game over without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); renderer.draw(game); input.endFrame(); } };
    step(30);
    input.tap('down'); step(); input.tap('right'); step();
    expect(game.level).toBe('commander');
    input.tap('down'); step(); input.tap('down'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('howto');
    input.tap('confirm'); step();
    input.tap('up'); step(); input.tap('up'); step(); input.tap('up'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    let seed = 9;
    for (let i = 0; i < 60 * 180 && game.state === 'playing'; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (i % 40 === 0) { input.held.clear(); input.held.add(['left', 'right', 'up', 'down'][seed % 4]); if (seed % 3) input.held.add('fire'); }
      if (i === 300) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      step();
    }
    if (game.state === 'playing') { game.reserve = 0; game.die(); step(120); }
    expect(game.state).toBe('gameover');
    step(130);
    input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  });
});
