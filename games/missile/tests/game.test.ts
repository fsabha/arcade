import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { gameSpec } = await import('../src/games');
const { Field } = await import('../src/field');

const dt = 1 / 60;
function playing(gameNumber = 1) {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.gameNumber = gameNumber;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  step(Math.ceil(cfg.WAVE_START_TIME * 60) + 2); // cities rose, wave is on
  return { game, input, step };
}

describe('manual tables', () => {
  it('scoring multiplier follows table 1', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20].map(cfg.multiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6]);
  });
  it('game select matrix: slow/fast target, dumb/smart cruise, first wave 1/7/11/15, 17 for children', () => {
    expect(gameSpec(1)).toMatchObject({ fastCursor: false, smartCruise: false, firstWave: 1 });
    expect(gameSpec(2)).toMatchObject({ fastCursor: true, smartCruise: false, firstWave: 1 });
    expect(gameSpec(3)).toMatchObject({ fastCursor: false, smartCruise: true, firstWave: 1 });
    expect(gameSpec(5).firstWave).toBe(7);
    expect(gameSpec(9).firstWave).toBe(11);
    expect(gameSpec(16)).toMatchObject({ fastCursor: true, smartCruise: true, firstWave: 15 });
    expect(gameSpec(17).children).toBe(true);
  });
});

describe('missile command rules', () => {
  it('starts with six cities, 30 ABMs (10 loaded) and the chosen first wave', () => {
    const { game } = playing(5);
    expect(game.citiesAlive).toBe(6);
    expect(game.abms).toBe(30);
    expect(game.loaded).toBe(10);
    expect(game.dump).toBe(20);
    expect(game.wave).toBe(7);
  });

  it('fires at most three ABMs at once and each costs one', () => {
    const { game, input, step } = playing();
    for (let i = 0; i < 5; i++) { input.tap('fire'); step(1); }
    expect(game.field.abmsFlying).toBe(3);
    expect(game.abms).toBe(27);
  });

  it('an enemy missile inside an explosion is worth 25 x multiplier', () => {
    const { game, step } = playing();
    game.field.queue = 0;
    game.field.icbms = [];
    game.field.launchIcbm(game.cities, 160);
    const m = game.field.icbms[0];
    game.field.explode(m.x, m.y + 2);
    step(6);
    expect(game.field.icbms.length).toBe(0);
    expect(game.score).toBe(25);
  });

  it('a missile reaching its city destroys it; reaching the base loses the loaded ABMs', () => {
    const { game, step } = playing();
    game.field.queue = 0;
    game.field.icbms = [];
    game.field.launchIcbm(game.cities, 40);
    const m = game.field.icbms[0];
    m.target = 0; m.tx = cfg.CITY_X[0];
    m.y = cfg.GROUND_Y;
    step(2);
    expect(game.cities[0]).toBe(false);
    game.field.launchIcbm(game.cities, 160);
    const b = game.field.icbms[0];
    b.target = 6; b.tx = cfg.BASE_X; b.y = cfg.GROUND_Y;
    game.abms = 27;
    step(2);
    expect(game.abms).toBe(20);
    expect(game.baseDown).toBeGreaterThan(0);
  });

  it('end of wave pays 5 per unused ABM and 100 per city, times the multiplier, then starts the next wave', () => {
    const { game, step } = playing();
    game.wave = 3; // x2
    game.field = new Field(3, false, false, 1);
    game.field.queue = 0;
    game.abms = 4;
    step(2);
    expect(game.phase).toBe('tally');
    step(Math.ceil(cfg.TALLY_TIME * 60) + 60);
    expect(game.score).toBe(4 * 5 * 2 + 6 * 100 * 2);
    expect(game.wave).toBe(4);
    expect(game.abms).toBe(30);
  });

  it('a bonus city every 10000 points rebuilds a ruin at the end of the wave', () => {
    const { game, step } = playing();
    game.cities[2] = false;
    (game as unknown as { addScore(n: number): void }).addScore(10000);
    expect(game.bonusCities).toBe(1);
    game.field.queue = 0;
    step(2 + Math.ceil(cfg.TALLY_TIME * 60) + 120);
    expect(game.cities[2]).toBe(true);
    expect(game.bonusCities).toBe(0);
  });

  it('the game ends when all six cities are gone at the end of a wave', () => {
    const { game, step } = playing();
    game.cities = Array(6).fill(false);
    step(2 + Math.ceil(cfg.TALLY_TIME * 60) + 120);
    expect(game.state).toBe('gameover');
  });

  it('tap moves the cursor and fires', () => {
    const { game } = playing();
    game.tap(100, 80);
    expect(game.cursor).toEqual({ x: 100, y: 80 });
    expect(game.abms).toBe(29);
  });

  it('smart cruise missiles sidestep explosions, dumb ones do not', () => {
    const smart = new Field(8, false, true, 2);
    const dumb = new Field(8, false, false, 2);
    for (const f of [smart, dumb]) {
      f.queue = 0; f.cruiseQueue = 0;
      f.launchCruise(Array(6).fill(true));
      const c = f.cruises[0];
      c.x = 100; c.y = 80; c.dir = 1; c.tx = 300;
      f.explode(118, 80, 2);
      f.explosions[0].t = 0.2;
      for (let i = 0; i < 10; i++) { f.update(1 / 60, Array(6).fill(true)); f.explosions[0].t = 0.2; f.explosions[0].alive = true; }
    }
    expect(smart.cruises[0].y).not.toBeCloseTo(80, 0);
    expect(dumb.cruises[0].y).toBeCloseTo(80, 0);
  });
});
