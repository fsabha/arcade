import { describe, it, expect } from 'vitest';
import { installFakeDocument, fakeCanvas, FakeInput, fakeAudio } from '@arcade/shared/testing';

// Headless smoke test: run the whole game loop (logic + renderer) against stub canvas APIs.
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const { DYING_TIME } = await import('../src/config');

describe('smoke', () => {
  it('runs the menu, plays, pauses and resumes without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const renderer = new Renderer(fakeCanvas());
    const step = () => { game.update(1 / 60); renderer.draw(game); input.endFrame(); };
    for (let i = 0; i < 60; i++) step();
    input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    expect(game.phase).toBe('play');
    input.press('fire');
    for (let i = 0; i < 120; i++) step();
    input.tap('pause'); step();
    expect(game.state).toBe('paused');
    input.tap('pause'); step();
    expect(game.state).toBe('playing');
  });

  it('loses every life and reaches game over', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const renderer = new Renderer(fakeCanvas());
    const step = () => { game.update(1 / 60); renderer.draw(game); input.endFrame(); };
    input.tap('confirm'); step();
    game.score.lives = 1;
    game.grace = 0;
    game.shots.push({ x: game.player.x, y: game.player.y, w: 2, h: 7, frame: 0, t: 0 });
    step();
    expect(game.phase).toBe('dying');
    for (let i = 0; i < Math.ceil(DYING_TIME * 60) + 2; i++) step();
    expect(game.state).toBe('gameover');
  });
});
