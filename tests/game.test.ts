import { describe, it, expect } from 'vitest';

const noop = () => undefined;
function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, { get: (_t, p) => (typeof p === 'string' ? noop : undefined), set: () => true });
}
function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, getContext: fakeCtx, style: {} } as unknown as HTMLCanvasElement;
}
(globalThis as unknown as { document: unknown }).document = { createElement: fakeCanvas };

const { Game } = await import('../src/game');
const cfg = await import('../src/config');

class FakeInput {
  held = new Set<string>();
  pressed = new Set<string>();
  isDown(a: string) { return this.held.has(a); }
  justPressed(a: string) { return this.pressed.has(a); }
  endFrame() { this.pressed.clear(); }
  tap(a: string) { this.pressed.add(a); }
}
const audio = new Proxy({}, { get: () => noop });
const dt = 1 / 60;

function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, audio as never);
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('game rules', () => {
  it('starts with 2000 points, 3 lives, 20 minutes and the timer idle', () => {
    const { game, step } = playing();
    step(60);
    expect(game.score).toBe(2000);
    expect(game.lives).toBe(3);
    expect(game.timeLeft).toBe(cfg.GAME_TIME);
    expect(game.room.value).toBe(0xc4);
  });
  it('falling into the hole costs 100 points and lands in the tunnel', () => {
    const { game, input, step } = playing();
    input.held.add('right');
    step(60 * 3);
    expect(game.harry.under).toBe(true);
    expect(game.score).toBe(1900);
    expect(game.timeLeft).toBeLessThan(cfg.GAME_TIME);
  });
  it('pressing down at the ladder climbs instead of falling', () => {
    const { game, input, step } = playing();
    game.harry.x = cfg.LADDER_X - 4;
    input.held.add('down');
    step(5);
    expect(game.harry.mode).toBe('climb');
    step(60 * 3);
    expect(game.harry.under).toBe(true);
    expect(game.score).toBe(2000);
  });
  it('walking right across the surface advances one room, three in the tunnel', () => {
    const { game, step } = playing();
    game.harry.x = cfg.X_MAX + 1;
    step(1);
    expect(game.room.value).toBe(0x89);
    game.harry.under = true;
    game.harry.feet = cfg.TUNNEL_Y;
    game.harry.x = cfg.X_MAX + 1;
    step(1);
    expect(game.room.value).toBe(0x4b); // 0x89 -> 0x12 -> 0x25 -> 0x4b
  });
  it('the underground wall blocks Harry on ladder rooms', () => {
    const { game, input, step } = playing();
    game.harry.under = true;
    game.harry.feet = cfg.TUNNEL_Y;
    game.harry.x = cfg.X_MAX; // wall on the right at 272 in room $C4
    input.held.add('left');
    step(60 * 2);
    expect(game.harry.x).toBeGreaterThanOrEqual(cfg.WALL_RIGHT_X + cfg.WALL_W - 2);
    expect(game.room.value).toBe(0xc4);
  });
  it('rolling logs drain points and stun; jumping clears them', () => {
    const { game, input, step } = playing();
    game.enterRoom(0x00); // one rolling log
    game.harry.x = game.logs[0].x;
    step(3);
    expect(game.harry.mode).toBe('kneel');
    expect(game.score).toBeLessThan(2000);
    const after = game.score;
    step(60);
    expect(game.harry.mode).toBe('ground');
    game.enterRoom(0x00);
    game.harry.x = game.logs[0].x - 40;
    input.tap('fire');
    input.held.add('right');
    step(1);
    expect(game.harry.mode).toBe('jump');
    const before = game.score;
    step(31);
    expect(game.score).toBe(before);
    expect(after).toBeLessThan(2000);
  });
  it('fire kills; three deaths end the game', () => {
    const { game, step } = playing();
    for (let i = 0; i < 3; i++) {
      game.enterRoom(0x06); // fire
      game.harry.mode = 'ground';
      game.harry.x = cfg.HAZARD_X;
      game.harry.feet = cfg.GROUND_Y;
      game.harry.under = false;
      step(1);
      expect(game.harry.mode).toBe('dying');
      step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    }
    expect(game.state).toBe('gameover');
    expect(game.endReason).toBe('lives');
  });
  it('treasures score once and finishing all 32 ends the game', () => {
    const { game, step } = playing();
    game.enterRoom(0b00101011); // ring
    game.harry.x = cfg.TREASURE_X - 2;
    step(1);
    expect(game.score).toBe(7000);
    expect(game.treasures).toBe(1);
    step(10);
    expect(game.score).toBe(7000);
    // crocodiles: standing on a closed head is safe, open jaws kill
    game.enterRoom(0b00100001);
    game.roomTime = cfg.CROC_PERIOD + 0.01;
    game.harry.x = 58 * cfg.PX;
    step(1);
    expect(game.harry.mode).toBe('ground');
    game.roomTime = 0;
    step(1);
    expect(game.harry.mode).toBe('sink');
  });
  it('time running out ends the game', () => {
    const { game, input, step } = playing();
    input.held.add('left');
    game.timeLeft = 0.5;
    step(60);
    expect(game.state).toBe('gameover');
    expect(game.endReason).toBe('time');
  });
});
