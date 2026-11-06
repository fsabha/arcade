import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');

describe('smoke', () => {
  it('runs menus, every stage with random play, pause and game over without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const renderer = new Renderer(fakeCanvas());
    const dt = 1 / 60;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); renderer.draw(game); input.endFrame(); } };
    step(30);
    input.tap('down'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('howto');
    input.tap('confirm'); step();
    input.tap('up'); step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    game.lives = 99; // random play dies a lot; we want to see several stages
    let seed = 21;
    // visit every stage kind by forcing wins now and then
    const kinds = new Set<string>();
    for (let i = 0; i < 60 * 300 && game.state === 'playing'; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      kinds.add(game.kind);
      if (i % 15 === 0) input.tap(['fire', 'up', 'down', 'fire'][seed % 4]);
      if (i % 40 === 0) { input.held.clear(); input.held.add(seed % 2 ? 'right' : 'left'); if (seed % 5 === 0) input.held.add('up'); }
      if (i === 300) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      if (i % 300 === 200 && game.phase === 'play') { game.mario.x = game.stage.goal.x + 10; game.mario.feet = game.stage.goal.y + game.stage.goal.h; game.mario.mode = 'walk'; if (game.kind === 'rivets') for (const r of game.stage.rivets) r.taken = true; }
      if (game.kind === 'rivets' && game.phase === 'play' && game.stage.rivets.every((r) => r.taken)) { game.mario.x = 68; game.mario.feet = 208; }
      step();
    }
    expect(kinds.size).toBeGreaterThanOrEqual(2);
    if (game.state === 'playing') { game.lives = 1; game.die('teste'); step(120); }
    expect(game.state).toBe('gameover');
    step(130);
    input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  });
});
