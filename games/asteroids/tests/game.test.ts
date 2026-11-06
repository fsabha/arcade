import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { GAME_NUMBERS } = await import('../src/games');

const dt = 1 / 60;
function playing(gameNumber = 1, difficulty: 'A' | 'B' = 'B') {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.gameIndex = GAME_NUMBERS.indexOf(gameNumber);
  game.difficulty = difficulty;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('asteroids rules', () => {
  it('starts with four ships, six large asteroids and the chosen game', () => {
    const { game } = playing(2);
    expect(game.ships).toBe(4);
    expect(game.field.asteroids).toHaveLength(6);
    expect(game.spec.fast).toBe(true);
  });
  it('rotates in 16 steps, thrusts with inertia and wraps', () => {
    const { game, input, step } = playing();
    input.held.add('right');
    step(10);
    expect(game.ship.dir).toBeGreaterThan(0);
    input.held.clear();
    const d = game.ship.dir;
    input.held.add('up');
    step(30);
    expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeGreaterThan(20);
    expect(game.ship.dir).toBe(d);
    input.held.clear();
    const v = Math.hypot(game.ship.vx, game.ship.vy);
    step(60);
    expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeLessThan(v);
  });
  it('shooting a large asteroid scores 20 and leaves two mediums', () => {
    const { game, input, step } = playing();
    const a = game.field.asteroids[0];
    game.field.asteroids = [a]; // nothing else drifting into the line of fire
    game.ship.x = a.x - 30; game.ship.y = a.y; game.ship.dir = 4; // facing right
    a.vx = 0; a.vy = 0;
    input.tap('fire');
    step(1);
    expect(game.field.shots).toHaveLength(1);
    step(20);
    expect(game.score).toBe(20);
    expect(game.field.asteroids.filter((k) => k.size === 'medium')).toHaveLength(2);
  });
  it('hitting an asteroid costs a ship; the ship comes back in the clear centre', () => {
    const { game, step } = playing();
    const a = game.field.asteroids[0];
    game.ship.x = a.x; game.ship.y = a.y;
    step(1);
    expect(game.ship.mode).toBe('dead');
    expect(game.ships).toBe(3);
    // keep the centre clear (a new wave would spawn and drift in otherwise)
    for (let i = 0; i < Math.ceil((cfg.DEATH_TIME + cfg.RESPAWN_WAIT) * 60) + 5; i++) { game.field.asteroids = []; step(1); }
    expect(game.ship.mode).toBe('alive');
    expect(game.ship.x).toBe(cfg.W / 2);
  });
  it('shields protect for two seconds and then blow the ship up (game 9)', () => {
    const { game, input, step } = playing(9);
    const a = game.field.asteroids[0];
    a.vx = 0; a.vy = 0;
    game.ship.x = a.x; game.ship.y = a.y;
    input.held.add('down');
    step(30);
    expect(game.ship.mode).toBe('alive');
    step(Math.ceil(cfg.SHIELD_MAX * 60) + 2);
    expect(game.ship.mode).toBe('dead');
  });
  it('hyperspace moves the ship somewhere else (game 1); flip turns it around (game 17)', () => {
    const h = playing(1);
    h.game.field.asteroids = []; // nowhere to re-enter into a rock
    h.input.tap('down'); h.step(1);
    expect(h.game.ship.mode).toBe('hyper');
    h.step(Math.ceil(cfg.HYPERSPACE_TIME * 60) + 2);
    expect(h.game.ship.mode).toBe('alive');
    const f = playing(17);
    f.input.tap('down'); f.step(1);
    expect(f.game.ship.dir).toBe(8);
  });
  it('extra ship at the game bonus threshold; none in game 7', () => {
    const a = playing(1);
    a.game['addScore'](5000);
    expect(a.game.ships).toBe(5);
    const b = playing(7);
    b.game['addScore'](50000);
    expect(b.game.ships).toBe(4);
  });
  it('difficulty A brings satellites; UFOs only after 7500 points', () => {
    const { game, step } = playing(1, 'A');
    game.saucerT = 0.01;
    step(2);
    expect(game.field.saucer?.kind).toBe('satellite');
    game.field.saucer = null;
    game.score = 20000;
    game.saucerT = 0.01;
    step(2);
    expect((game.field.saucer as { kind: string } | null)?.kind).toBe('ufo');
    const b = playing(1, 'B');
    b.game.saucerT = 0.01;
    b.step(60);
    expect(b.game.field.saucer).toBeNull();
  });
  it('clearing the field starts the next wave with two more asteroids', () => {
    const { game, step } = playing();
    game.field.asteroids = [];
    step(Math.ceil(cfg.WAVE_PAUSE * 60) + 2);
    expect(game.wave).toBe(2);
    expect(game.field.asteroids).toHaveLength(8);
  });
});
