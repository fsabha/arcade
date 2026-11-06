import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { Traffic, submersion, DIVE_TOTAL, LANES } = await import('../src/lanes');

const dt = 1 / 60;
function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  const hop = (dir: 'up' | 'down' | 'left' | 'right') => { input.tap(dir); step(1); step(Math.ceil(cfg.HOP_TIME * 60) + 1); };
  return { game, input, step, hop };
}

describe('lanes', () => {
  it('has five road lanes and five river lanes that wrap around', () => {
    expect(LANES.filter((l) => l.row >= 9 && l.row <= 13).length).toBe(5);
    expect(LANES.filter((l) => l.row >= 3 && l.row <= 7).length).toBe(5);
    const t = new Traffic(1, 1);
    const n = t.movers.length;
    for (let i = 0; i < 60 * 60; i++) t.update(dt);
    expect(t.movers.length).toBe(n);
    for (const m of t.movers) { expect(m.x).toBeGreaterThan(-cfg.PERIOD); expect(m.x).toBeLessThan(cfg.W + cfg.PERIOD); }
  });
  it('diving turtles go under and come back', () => {
    const m = { kind: 'turtle' as const, row: 7, x: 0, w: 48, dir: -1 as const, speed: 0, dive: 0, phase: 0 };
    expect(submersion(m)).toBe(0);
    m.dive = 5.5; expect(submersion(m)).toBe(1);
    m.dive = DIVE_TOTAL - 0.01; expect(submersion(m)).toBeLessThan(0.05);
  });
  it('level 2 adds the snake and the crocodile, level 3 the otters', () => {
    const kinds = (l: number) => new Set(new Traffic(l, 1).movers.map((m) => m.kind));
    expect(kinds(1).has('snake')).toBe(false);
    expect(kinds(2).has('snake')).toBe(true);
    expect(kinds(2).has('croc')).toBe(true);
    expect(kinds(3).has('otter')).toBe(true);
  });
});

describe('frogger rules', () => {
  it('starts with 3 frogs, 30 seconds and the frog on the sidewalk', () => {
    const { game } = playing();
    expect(game.lives).toBe(3);
    expect(game.timeLeft).toBe(30);
    expect(game.frog.row).toBe(cfg.ROW_START);
  });

  it('a forward hop pays 10 once per row; backwards pays nothing', () => {
    const { game, hop } = playing();
    game.traffic.movers = [];
    hop('up');
    expect(game.frog.row).toBe(13);
    expect(game.score).toBe(10);
    hop('down'); hop('up');
    expect(game.score).toBe(10);
    hop('up');
    expect(game.score).toBe(20);
  });

  it('a car squashes the frog and a life is lost after the animation', () => {
    const { game, hop, step } = playing();
    game.traffic.movers = [];
    hop('up');
    game.traffic.movers.push({ kind: 'car', row: 13, x: game.frog.x, w: 16, dir: -1, speed: 0, dive: -1, phase: 0 });
    step(1);
    expect(game.frog.mode).toBe('dead');
    expect(game.death).toBe('splat');
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.lives).toBe(2);
    expect(game.frog.row).toBe(cfg.ROW_START);
  });

  it('landing in the water drowns; landing on a log carries the frog along', () => {
    const { game, hop, step } = playing();
    game.traffic.movers = [];
    game.frog.row = 8; // median
    hop('up');
    expect(game.death).toBe('drown');
    const g2 = playing();
    g2.game.traffic.movers = [{ kind: 'log', row: 7, x: g2.game.frog.x - 16, w: 48, dir: 1, speed: 30, dive: -1, phase: 0 }];
    g2.game.frog.row = 8;
    const x0 = g2.game.frog.x;
    g2.hop('up');
    expect(g2.game.frog.mode).toBe('idle');
    g2.step(60);
    expect(g2.game.frog.x).toBeGreaterThan(x0 + 20);
    void step;
  });

  it('a submerged turtle drowns the frog', () => {
    const { game, hop } = playing();
    game.traffic.movers = [{ kind: 'turtle', row: 7, x: game.frog.x - 16, w: 48, dir: -1, speed: 0, dive: 5.5, phase: 0 }];
    game.frog.row = 8;
    hop('up');
    expect(game.death).toBe('drown');
  });

  it('reaching a bay pays 50 plus 10 per half second left; the wall kills', () => {
    const { game, hop } = playing();
    game.frog.x = cfg.HOME_X[2];
    game.traffic.movers = [{ kind: 'log', row: 3, x: game.frog.x - 16, w: 48, dir: 1, speed: 0, dive: -1, phase: 0 }];
    game.frog.row = 3;
    game.timeLeft = 20;
    game.fly.bay = -1;
    hop('up');
    expect(game.homes[2]).toBe(true);
    expect([50 + 39 * 10, 50 + 40 * 10]).toContain(game.lastHomeBonus);
    const g2 = playing();
    g2.game.frog.x = cfg.HOME_X[2] + 24; // between bays
    g2.game.traffic.movers = [{ kind: 'log', row: 3, x: g2.game.frog.x - 16, w: 48, dir: 1, speed: 0, dive: -1, phase: 0 }];
    g2.game.frog.row = 3;
    g2.hop('up');
    expect(g2.game.death).toBe('splat');
  });

  it('the fly adds 200 and five frogs home add 1000 and start the next level', () => {
    const { game, hop, step } = playing();
    game.homes = [true, true, true, true, false];
    game.frog.x = cfg.HOME_X[4];
    game.traffic.movers = [{ kind: 'log', row: 3, x: game.frog.x - 16, w: 48, dir: 1, speed: 0, dive: -1, phase: 0 }];
    game.frog.row = 3;
    game.timeLeft = 0.2;
    game.fly = { bay: 4, t: 3 };
    const before = game.score;
    hop('up');
    expect(game.lastHomeBonus).toBe(50 + 200);
    expect(game.score - before).toBe(250 + 1000);
    expect(game.frog.mode).toBe('clear');
    step(Math.ceil(cfg.LEVEL_CLEAR_TIME * 60) + 2);
    expect(game.level).toBe(2);
    expect(game.homes.every((h) => !h)).toBe(true);
  });

  it('time running out costs a frog; 20000 points give one extra frog', () => {
    const { game, step } = playing();
    game.timeLeft = 0.01;
    step(2);
    expect(game.death).toBe('time');
    (game as unknown as { addScore(n: number): void }).addScore(20000);
    expect(game.lives).toBe(4);
    (game as unknown as { addScore(n: number): void }).addScore(20000);
    expect(game.lives).toBe(4);
  });
});
