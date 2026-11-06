import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');

describe('smoke', () => {
  it('runs menus, a game with random shots, pause and game over without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); renderer.draw(game); input.endFrame(); } };
    step(30);
    input.tap('down'); step(); input.tap('right'); step(); // game 2
    expect(game.gameNumber).toBe(2);
    input.tap('down'); step(); input.tap('down'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('howto');
    input.tap('confirm'); step();
    input.tap('up'); step(); input.tap('up'); step(); input.tap('up'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    let seed = 5;
    let waves = 0;
    for (let i = 0; i < 60 * 240 && game.state === 'playing'; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (i % 12 === 0) input.tap('fire');
      if (i % 30 === 0) { input.held.clear(); input.held.add(['left', 'right', 'up', 'down'][seed % 4]); }
      if (i % 50 === 0) game.tap(seed % 320, 40 + (seed % 120));
      if (i === 300) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      if (game.phase === 'tally' && game.phaseTime === 0) waves++;
      step();
    }
    if (game.state === 'playing') { game.cities = Array(6).fill(false); game.field.abort(); step(600); }
    expect(game.state).toBe('gameover');
    step(130);
    input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  });
});
