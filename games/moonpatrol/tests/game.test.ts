import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { buildCourse } = await import('../src/course');
const { spriteMaps } = await import('../src/sprites');

const dt = 1 / 60;
function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.startGame();
  game.ground = [];
  game.ufoWaves = [];
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}

describe('course', () => {
  it('lays out 26 letters with obstacles that get meaner, and ufo waves', () => {
    const c = buildCourse('beginner', 1);
    expect(c.ground.length).toBeGreaterThan(40);
    expect(c.ground.every((o) => o.x >= 0 && o.x < cfg.COURSE_LEN)).toBe(true);
    expect(c.ground.filter((o) => o.kind === 'tank').every((o) => o.x >= 12 * cfg.LETTER_LEN)).toBe(true);
    expect(c.ufos.length).toBeGreaterThan(5);
    expect(cfg.letterOf(5 * cfg.LETTER_LEN)).toBe(5);
    expect(cfg.letterName(25)).toBe('Z');
  });
  it('sprites are rectangular', () => {
    for (const [name, rows] of Object.entries(spriteMaps())) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
  });
});

describe('moon patrol rules', () => {
  it('starts with 3 lives at letter A and cruises on its own', () => {
    const { game, step } = playing();
    expect(game.lives).toBe(3);
    expect(game.letter).toBe(0);
    step(60);
    expect(game.distance).toBeGreaterThan(50);
  });

  it('accelerating and braking change the scrolling speed', () => {
    const { game, input, step } = playing();
    input.press('right'); step(90);
    expect(game.speed).toBeCloseTo(cfg.SPEED_FAST, 0);
    input.release('right'); input.press('left'); step(120);
    expect(game.speed).toBeCloseTo(cfg.SPEED_SLOW, 0);
  });

  it('a crater swallows the buggy unless it jumps', () => {
    const { game, step } = playing();
    game.ground = [{ kind: 'crater', x: game.buggyWorldX + 40, w: cfg.CRATER_SMALL, hp: 1, alive: true, fireT: 0 }];
    step(60);
    expect(game.buggy.alive).toBe(false);
    expect(game.death).toBe('crater');
    const g2 = playing();
    g2.game.ground = [{ kind: 'crater', x: g2.game.buggyWorldX + 40, w: cfg.CRATER_SMALL, hp: 1, alive: true, fireT: 0 }];
    g2.step(12);
    g2.input.tap('up'); g2.step(1);
    expect(g2.game.buggy.jumpT).toBeGreaterThanOrEqual(0);
    g2.step(60);
    expect(g2.game.buggy.alive).toBe(true);
  });

  it('the forward shot breaks a rock for 50; a big rock takes two shots', () => {
    const { game, input, step } = playing();
    game.ground = [{ kind: 'rock', x: game.buggyWorldX + 120, w: cfg.ROCK_W, hp: 1, alive: true, fireT: 0 }];
    input.press('fire'); step(1); input.release('fire');
    step(40);
    expect(game.ground[0].alive).toBe(false);
    expect(game.score).toBe(cfg.POINTS.rock);
    game.ground = [{ kind: 'bigRock', x: game.buggyWorldX + 120, w: cfg.BIG_ROCK_W, hp: 2, alive: true, fireT: 0 }];
    input.press('fire'); step(1); input.release('fire'); step(30);
    expect(game.ground[0].alive).toBe(true);
    expect(game.ground[0].hp).toBe(1);
  });

  it('the upward shot downs a ufo; its bomb digs a crater ahead', () => {
    const { game, input, step } = playing();
    game.ufos.push({ kind: 'small', x: game.buggyWorldX + cfg.BUGGY_W / 2, y: cfg.HUD_H + 40, t: 0, bombT: 99, alive: true, dir: -1 });
    input.press('fire'); step(1); input.release('fire');
    for (let i = 0; i < 40 && game.ufos.length; i++) { game.ufos[0].x = game.buggyWorldX + cfg.BUGGY_W / 2; step(1); } // hovering right above
    expect(game.ufos.length).toBe(0);
    expect(game.score).toBe(cfg.POINTS.ufoSmall);
    game.bombs.push({ x: game.buggyWorldX + 160, y: cfg.GROUND_Y - 5, alive: true });
    step(5);
    expect(game.ground.some((o) => o.kind === 'crater')).toBe(true);
  });

  it('reaching E pays the checkpoint bonus; dying restarts the section', () => {
    const { game, step } = playing();
    game.distance = 5 * cfg.LETTER_LEN - cfg.BUGGY_X - 10;
    game.sectionTime = 5;
    step(20);
    expect(game.checkpointIndex).toBe(1);
    expect(game.score).toBe(cfg.CHECKPOINT_BONUS);
    game.distance += 400;
    game.die('crash');
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.lives).toBe(2);
    expect(game.distance).toBeCloseTo(5 * cfg.LETTER_LEN, -1);
  });

  it('extra lives at 10000, 30000 and 50000', () => {
    const { game } = playing();
    const add = (game as unknown as { addScore(n: number): void }).addScore.bind(game);
    add(10000); expect(game.lives).toBe(4);
    add(20000); expect(game.lives).toBe(5);
    add(20000); expect(game.lives).toBe(6);
    add(50000); expect(game.lives).toBe(6);
  });
});
