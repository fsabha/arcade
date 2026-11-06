import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');

const dt = 1 / 60;
function playing(gameNumber = 1) {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.gameNumber = gameNumber;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('H.E.R.O. rules', () => {
  it('starts with 3 reserve lives, 6 sticks, full power and the power idle until he moves', () => {
    const { game, input, step } = playing();
    expect(game.reserve).toBe(3);
    expect(game.sticks).toBe(6);
    step(60);
    expect(game.power).toBe(cfg.POWER_MAX);
    input.held.add('right');
    step(60);
    expect(game.power).toBeLessThan(cfg.POWER_MAX);
  });
  it('games 1-5 start at levels 1, 5, 9, 13, 17', () => {
    for (let n = 1; n <= 5; n++) expect(playing(n).game.level).toBe(cfg.GAME_STARTS[n - 1]);
  });
  it('falls slowly, flies up with the prop-pack and lands on rock', () => {
    const { game, input, step } = playing();
    const y0 = game.hero.y;
    step(30);
    expect(game.hero.y).toBeGreaterThan(y0);
    input.held.add('up');
    step(30);
    expect(game.hero.y).toBeLessThan(y0 + 5);
    input.held.clear();
    step(60 * 3);
    expect(game.hero.grounded).toBe(true);
  });
  it('dynamite blows a wall for 75 points, and kills the hero if he stays close', () => {
    const { game, input, step } = playing();
    step(60 * 3); // land on the wall ledge of level 1
    expect(game.hero.grounded).toBe(true);
    const wallsBefore = game.world.tiles.flat().filter((c) => c === 'D').length;
    game.hero.x = 8 * cfg.TILE - 14; // next to the D wall at columns 8-10
    input.tap('down');
    step(1);
    expect(game.sticks).toBe(5);
    expect(game.dynamite).not.toBeNull();
    step(Math.ceil(cfg.FUSE_TIME * 60) + 1);
    expect(game.world.tiles.flat().filter((c) => c === 'D').length).toBeLessThan(wallsBefore);
    expect(game.score).toBe(75);
    expect(game.hero.mode).toBe('dead');
  });
  it('the laser kills critters for 50 and slowly cuts walls', () => {
    const { game, input, step } = playing();
    const c = game.world.critters[0];
    game.hero.x = c.x - cfg.HERO_W - 8;
    game.hero.y = c.y - 4;
    game.hero.facing = 1;
    input.held.add('fire');
    step(1);
    expect(c.alive).toBe(false);
    expect(game.score).toBe(50);
    // a vertical wall across the corridor of level 3
    game.level = 3; game['startLevel']();
    expect(game.world.tile(21, 13)).toBe('D');
    game.hero.x = 20 * cfg.TILE; game.hero.facing = 1;
    input.held.add('fire');
    // hover in place (no floor under this corridor)
    for (let i = 0; i < Math.ceil(cfg.LASER_BURN_TIME * 60) + 2; i++) { game.hero.y = 13 * cfg.TILE; step(1); }
    expect(game.world.tile(21, 13)).toBe('.');
    expect(game.world.tile(22, 13)).toBe('D');
  });
  it('touching a critter or magma costs a life; running out of lives ends the game', () => {
    const { game, step } = playing();
    for (let i = 0; i < 4; i++) {
      game.hero.mode = 'alive';
      const c = game.world.critters.find((k) => k.alive) ?? game.world.critters[0];
      c.alive = true;
      game.hero.x = c.x; game.hero.y = c.y;
      step(1);
      expect(game.hero.mode).toBe('dead');
      step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    }
    expect(game.state).toBe('gameover');
  });
  it('a lantern darkens its screen', () => {
    const { game, step } = playing();
    const l = game.world.lanterns[0];
    game.hero.x = l.x; game.hero.y = l.y;
    step(1);
    expect(l.lit).toBe(false);
    expect(game.isDark).toBe(true);
  });
  it('rescuing the miner pays 1000 + 50 per stick + power bonus and starts the next level', () => {
    const { game, step } = playing();
    game.hero.x = game.world.miner.x; game.hero.y = game.world.miner.y;
    game.power = 100;
    step(1);
    expect(game.hero.mode).toBe('rescue');
    expect(game.score).toBe(1000 + 6 * 50 + 100 * cfg.powerUnitValue(1));
    step(Math.ceil(cfg.RESCUE_TIME * 60) + 2);
    expect(game.level).toBe(2);
    expect(game.sticks).toBe(6);
    expect(game.power).toBe(cfg.POWER_MAX);
  });
  it('extra life every 20000, max six in reserve; level label is PRO after 20', () => {
    const { game } = playing();
    game.hero.x = game.world.miner.x; game.hero.y = game.world.miner.y;
    game.level = 20; game.power = 255;
    game.update(dt);
    expect(game.score).toBeGreaterThan(5000);
    expect(game.reserve).toBe(3);
    game.score = 19999; game['addScore'](1);
    expect(game.reserve).toBe(4);
    game.level = 21;
    expect(game.levelLabel).toBe('PRO');
    game.gameNumber = 5;
    expect(game.levelLabel).toBe('');
  });
});
