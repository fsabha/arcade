import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');

const dt = 1 / 60;
function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.startGame();
  game.store.obstacles = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('keystone kapers rules', () => {
  it('starts with Kelly on floor 1, 3 Kops in reserve and a 50 second timer', () => {
    const { game } = playing();
    expect(game.reserve).toBe(3);
    expect(game.timer).toBe(cfg.TIMER_START);
    expect(game.kelly.floor).toBe(0);
    expect(game.harry.floor).toBe(0);
    expect(game.harry.x).toBeGreaterThan(game.kelly.x);
  });

  it('catching Harry pays 100 x the seconds left on krook 1 and starts krook 2', () => {
    const { game, step } = playing();
    game.timer = 37.4;
    game.store.loot = [];
    game.kelly.x = game.harry.x;
    step(1);
    expect(game.kelly.mode).toBe('caught');
    expect(game.score).toBe(38 * 100);
    step(Math.ceil(cfg.CAUGHT_TIME * 60) + 2);
    expect(game.krook).toBe(2);
    expect(game.timer).toBeCloseTo(cfg.TIMER_START, 0);
  });

  it('multiplier is 200 for krooks 9-16 and 300 from the 17th', () => {
    expect(cfg.catchMultiplier(8)).toBe(100);
    expect(cfg.catchMultiplier(9)).toBe(200);
    expect(cfg.catchMultiplier(16)).toBe(200);
    expect(cfg.catchMultiplier(17)).toBe(300);
  });

  it('a shopping cart KOs Kelly and costs 9 seconds; the cart is gone afterwards', () => {
    const { game, step } = playing();
    game.timer = 40;
    game.store.obstacles.push({ kind: 'cart', floor: 0, x: game.kelly.x + 2, dir: -1, speed: 0, phase: 0, bounce: 0 });
    step(1);
    expect(game.kelly.mode).toBe('ko');
    expect(game.timer).toBeCloseTo(31, 0);
    expect(game.store.obstacles.length).toBe(0);
    step(Math.ceil(cfg.KO_TIME * 60) + 2);
    expect(game.kelly.mode).toBe('run');
  });

  it('jumping clears a cart, ducking clears a biplane', () => {
    const { game, input, step } = playing();
    input.tap('fire');
    step(1);
    step(Math.round(cfg.JUMP_TIME * 30)); // top of the jump
    game.store.obstacles.push({ kind: 'cart', floor: 0, x: game.kelly.x + 2, dir: -1, speed: 0, phase: 0, bounce: 0 });
    step(1);
    expect(game.kelly.mode).toBe('run');
    game.store.obstacles = [];
    step(60);
    input.press('down');
    step(2);
    expect(game.kelly.ducking).toBe(true);
    game.store.obstacles.push({ kind: 'plane', floor: 0, x: game.kelly.x + 2, dir: -1, speed: 0, phase: 0, bounce: 0 });
    step(1);
    expect(game.kelly.mode).toBe('run');
    input.release('down');
    step(2);
    expect(game.kelly.mode).toBe('lost');
    expect(game.lossReason).toBe('plane');
  });

  it('running out of time costs a Kop and restarts the same krook', () => {
    const { game, step } = playing();
    game.timer = 0.01;
    step(2);
    expect(game.kelly.mode).toBe('lost');
    expect(game.lossReason).toBe('time');
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.reserve).toBe(2);
    expect(game.krook).toBe(1);
    expect(game.timer).toBeCloseTo(cfg.TIMER_START, 0);
  });

  it('Harry follows the escalators up to the roof and escapes off the left edge', () => {
    const { game, step } = playing();
    game.timer = 1e9;
    game.kelly.x = 10; // stay out of his way
    const floors = new Set<number>();
    for (let i = 0; i < 60 * 80 && !game.harry.escaped; i++) { floors.add(game.harry.floor); step(1); }
    expect([...floors].sort()).toEqual([0, 1, 2, 3]);
    expect(game.harry.escaped).toBe(true);
    expect(game.kelly.mode).toBe('lost');
    expect(game.lossReason).toBe('escape');
  });

  it('loot is worth 50 points and a bonus Kop comes every 10000 (max 3)', () => {
    const { game, step } = playing();
    const l = game.store.loot[0];
    l.floor = 0;
    l.x = game.kelly.x + 4;
    step(1);
    expect(l.taken).toBe(true);
    expect(game.score).toBe(50);
    game.reserve = 2;
    (game as unknown as { addScore(n: number): void }).addScore(10000);
    expect(game.reserve).toBe(3);
    (game as unknown as { addScore(n: number): void }).addScore(10000);
    expect(game.reserve).toBe(3);
  });

  it('Kelly rides the elevator up and steps out on another floor', () => {
    const { game, input, step } = playing();
    game.timer = 1e9;
    const e = game.store.elevator;
    e.floor = 0; e.target = 1; e.progress = 0; e.dwell = 1; e.dir = 1;
    game.kelly.x = cfg.ELEV_X - cfg.KELLY_W / 2;
    input.tap('up');
    step(1);
    expect(game.kelly.mode).toBe('elevator');
    for (let i = 0; i < 60 * 5 && !(e.open && e.floor === 1); i++) step(1);
    expect(e.floor).toBe(1);
    input.tap('down');
    step(1);
    expect(game.kelly.mode).toBe('run');
    expect(game.kelly.floor).toBe(1);
    expect(game.kelly.feet).toBe(cfg.FEET[1]);
  });

  it('Kelly rides the right escalator from floor 1 to floor 2', () => {
    const { game, input, step } = playing();
    game.timer = 1e9;
    game.harry.x = -500; // out of reach
    game.kelly.x = cfg.WORLD_W - 120;
    input.press('right');
    for (let i = 0; i < 60 * 4 && game.kelly.floor === 0; i++) step(1);
    expect(game.kelly.floor).toBe(1);
    expect(game.kelly.feet).toBe(cfg.FEET[1]);
  });
});
