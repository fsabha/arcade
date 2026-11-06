import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { Field, hits } = await import('../src/field');
const { spriteMaps } = await import('../src/sprites');

const dt = 1 / 60;
function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.startGame();
  input.press('right'); game.update(dt); input.endFrame(); input.release('right'); // leaves the ready phase
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('sprites', () => {
  it('maps are rectangular', () => {
    for (const [name, rows] of Object.entries(spriteMaps())) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
  });
});

describe('chopper command rules', () => {
  it('starts with 3 choppers, 12 trucks and 12 enemies; the world loops five screens', () => {
    const { game } = playing();
    expect(game.reserve).toBe(2);
    expect(game.field.trucksAlive).toBe(12);
    expect(game.field.enemiesAlive).toBe(12);
    expect(cfg.WORLD_W).toBe(5 * cfg.W);
    expect(cfg.deltaX(cfg.WORLD_W - 10, 10)).toBe(20);
  });

  it('overlap works across the loop seam', () => {
    expect(hits({ x: cfg.WORLD_W - 4, y: 10, w: 8, h: 4 }, { x: 2, y: 11, w: 8, h: 4 })).toBe(true);
    expect(hits({ x: 100, y: 10, w: 8, h: 4 }, { x: 120, y: 11, w: 8, h: 4 })).toBe(false);
  });

  it('a bullet downs a helicopter for 100 and a jet for 200', () => {
    const { game, step } = playing();
    const f = game.field;
    const far = { kind: 'heli' as const, x: cfg.wrapX(game.chopper.x + 800), y: 40, dir: -1 as const, speed: 0, targetY: 40, fireT: 1e9, alive: true, phase: 0 }; // keeps the wave going
    f.enemies = [
      { kind: 'heli', x: game.chopper.x + 60, y: game.chopper.y, dir: -1, speed: 0, targetY: game.chopper.y, fireT: 99, alive: true, phase: 0 }, far,
    ];
    f.fire(game.chopper.x, game.chopper.y, 1);
    step(20);
    expect(game.score).toBe(100);
    f.enemies = [
      { kind: 'jet', x: game.chopper.x + 60, y: game.chopper.y + 1, dir: -1, speed: 0, targetY: game.chopper.y, fireT: 99, alive: true, phase: 0 }, far,
    ];
    f.fire(game.chopper.x, game.chopper.y, 1);
    step(20);
    expect(game.score).toBe(300);
  });

  it('clearing the wave pays trucks x wave x 100 and starts the next wave', () => {
    const { game, step } = playing();
    for (const e of game.field.enemies) e.alive = false;
    game.field.trucks[0].alive = false;
    step(1);
    expect(game.phase).toBe('bonus');
    expect(game.lastBonus).toBe(11 * 1 * 100);
    step(Math.ceil(cfg.WAVE_PAUSE * 60) + 2);
    expect(game.wave).toBe(2);
    expect(game.field.trucksAlive).toBe(12);
  });

  it('a missile splits in two and kills the chopper on contact', () => {
    const { game, step } = playing();
    const f = game.field;
    f.enemies = [{ kind: 'heli', x: cfg.wrapX(game.chopper.x + 800), y: 40, dir: -1 as const, speed: 0, targetY: 40, fireT: 1e9, alive: true, phase: 0 }];
    f.missiles.push({ x: game.chopper.x - 100, y: game.chopper.y + 4, vx: cfg.MISSILE_SPEED, vy: 0, t: 0, split: false, alive: true });
    step(Math.ceil(cfg.MISSILE_SPLIT_TIME * 60) + 2);
    expect(f.missiles.length).toBe(2);
    f.missiles = [{ x: game.chopper.x + 4, y: game.chopper.y + 4, vx: 0, vy: 0, t: 1, split: true, alive: true }];
    step(1);
    expect(game.chopper.alive).toBe(false);
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.reserve).toBe(1);
    expect(game.phase).toBe('ready');
    expect(f.missiles.length).toBe(0);
  });

  it('after losing a chopper the ready phase waits for a fresh press, not a held direction', () => {
    const { game, input, step } = playing();
    game.field.enemies = [{ kind: 'heli', x: cfg.wrapX(game.chopper.x + 800), y: 40, dir: -1 as const, speed: 0, targetY: 40, fireT: 1e9, alive: true, phase: 0 }];
    input.held.add('right');
    game.die();
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.phase).toBe('ready');
    expect(game.afterLoss).toBe(true);
    step(10); // still holding right from before the crash: nothing happens
    expect(game.phase).toBe('ready');
    input.tap('fire'); step();
    expect(game.phase).toBe('wave');
    expect(game.afterLoss).toBe(false);
  });

  it('crashing into the convoy kills the chopper and a truck', () => {
    const { game, step } = playing();
    game.field.enemies = [{ kind: 'heli', x: cfg.wrapX(game.chopper.x + 800), y: 40, dir: -1 as const, speed: 0, targetY: 40, fireT: 1e9, alive: true, phase: 0 }];
    const t = game.field.trucks[3];
    game.chopper.x = t.x;
    game.chopper.y = cfg.GROUND_Y - cfg.TRUCK_H - 4;
    step(1);
    expect(t.alive).toBe(false);
    expect(game.chopper.alive).toBe(false);
  });

  it('an extra chopper every 10000 up to six in the fleet', () => {
    const { game } = playing();
    const add = (game as unknown as { addScore(n: number): void }).addScore.bind(game);
    add(10000);
    expect(game.reserve).toBe(3);
    add(50000);
    expect(game.reserve).toBe(cfg.MAX_CHOPPERS - 1);
  });

  it('commander level flies faster than cadet', () => {
    expect(cfg.heliSpeed(1, 'commander')).toBeGreaterThan(cfg.heliSpeed(1, 'cadet'));
    expect(cfg.heliSpeed(12, 'cadet')).toBe(cfg.heliSpeed(10, 'cadet'));
    const f = new Field(3, 'cadet', 1, 0);
    expect(f.enemies.filter((e) => e.kind === 'jet').length).toBe(cfg.jetsInWave(3));
  });
});
