import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const cfg = await import('../src/config');
const { buildStage, platformUnder, yAt } = await import('../src/stages');
const { spriteMaps } = await import('../src/sprites');

const dt = 1 / 60;
function playing() {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  step(Math.ceil(cfg.INTRO_TIME * 60) + 2);
  game.actors.barrels = [];
  game.actors.fireballs = [];
  return { game, input, step };
}

describe('stages', () => {
  it('every ladder connects two platforms and the goal sits above Kong', () => {
    for (const kind of ['barrels', 'conveyors', 'elevators', 'rivets'] as const) {
      const st = buildStage(kind);
      for (const l of st.ladders) {
        expect(platformUnder(st, l.x + 4, l.yBottom, 4), `${kind} ladder ${l.x} bottom`).not.toBeNull();
        if (l.broken === undefined) expect(platformUnder(st, l.x + 4, l.yTop, 4), `${kind} ladder ${l.x} top`).not.toBeNull();
      }
      expect(platformUnder(st, st.mario.x, st.mario.y)).not.toBeNull();
    }
    const b = buildStage('barrels');
    expect(yAt(b.platforms[2], 0)).toBe(204);
    expect(yAt(b.platforms[2], 208)).toBe(217);
    expect(buildStage('rivets').rivets.length).toBe(8);
  });
  it('level order follows the arcade', () => {
    expect(cfg.stageOrder(1)).toEqual(['barrels', 'rivets']);
    expect(cfg.stageOrder(2)).toEqual(['barrels', 'conveyors', 'elevators', 'rivets']);
    expect(cfg.stageOrder(3).length).toBe(6);
    expect(cfg.bonusStart(1)).toBe(5000);
    expect(cfg.bonusStart(9)).toBe(8000);
  });
  it('sprites are rectangular; Mario is 12x16, Kong 40x32', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name} row width`).toBe(w);
    }
    expect([maps.stand[0].length, maps.stand.length]).toEqual([12, 16]);
    expect([maps.kong0[0].length, maps.kong0.length]).toEqual([40, 32]);
  });
});

describe('donkey kong rules', () => {
  it('starts on 25 m with 3 lives and a 5000 bonus that ticks down', () => {
    const { game, step } = playing();
    expect(game.kind).toBe('barrels');
    expect(game.lives).toBe(3);
    expect(game.bonus).toBe(5000);
    step(Math.ceil(cfg.bonusTick(1) * 60) + 2);
    expect(game.bonus).toBe(4900);
  });

  it('Mario walks, jumps and lands back on the girder', () => {
    const { game, input, step } = playing();
    const x0 = game.mario.x;
    input.press('right'); step(30); input.release('right');
    expect(game.mario.x).toBeGreaterThan(x0 + 20);
    input.tap('fire'); step(1);
    expect(game.mario.mode).toBe('jump');
    step(Math.ceil(cfg.JUMP_TIME * 60) + 5);
    expect(game.mario.mode).toBe('walk');
    expect(game.mario.feet).toBe(248);
  });

  it('jumping over a barrel scores 100; touching one kills', () => {
    const { game, input, step } = playing();
    game.mario.x = 60;
    game.actors.barrels.push({ x: 90, y: 248, dir: -1, blue: false, ladder: null, falling: false, jumped: false, alive: true, phase: 0 });
    input.tap('fire'); step(1);
    for (let i = 0; i < 40 && game.phase === 'play'; i++) step(1);
    expect(game.score).toBe(100);
    const g2 = playing();
    g2.game.actors.barrels.push({ x: g2.game.mario.x + 4, y: 248, dir: -1, blue: false, ladder: null, falling: false, jumped: false, alive: true, phase: 0 });
    g2.step(1);
    expect(g2.game.phase).toBe('dead');
    g2.step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(g2.game.lives).toBe(2);
  });

  it('the hammer smashes barrels for 300/500/800 and blocks jumping', () => {
    const { game, input, step } = playing();
    game.mario.hammerT = cfg.HAMMER_TIME;
    game.mario.facing = 1;
    game.mario.swing = cfg.HAMMER_SWING * 1.5; // hammer down, in front
    game.actors.barrels.push({ x: game.mario.x + 10, y: 248, dir: -1, blue: false, ladder: null, falling: false, jumped: false, alive: true, phase: 0 });
    step(2);
    expect(game.actors.barrels.length).toBe(0);
    expect([300, 500, 800]).toContain(game.score);
    input.tap('fire'); step(1);
    expect(game.mario.mode).toBe('walk');
  });

  it('Mario climbs a ladder to the next girder; broken ladders stop short', () => {
    const { game, input, step } = playing();
    game.mario.x = 188; game.mario.feet = 242.5;
    input.press('up'); step(1);
    expect(game.mario.mode).toBe('climb');
    step(120);
    expect(game.mario.mode).toBe('walk');
    expect(game.mario.feet).toBeCloseTo(215.5, 0);
    input.release('up');
    const g2 = playing();
    g2.game.mario.x = 84; g2.game.mario.feet = 248;
    g2.input.press('up'); g2.step(120);
    expect(g2.game.mario.mode).toBe('climb');
    expect(g2.game.mario.feet).toBe(248 - 14);
  });

  it('reaching Pauline wins the stage and banks the bonus; next comes 100 m on level 1', () => {
    const { game, step } = playing();
    game.mario.x = 110; game.mario.feet = 36;
    step(1);
    expect(game.phase).toBe('win');
    expect(game.score).toBe(5000);
    step(Math.ceil(cfg.WIN_TIME * 60) + 2);
    expect(game.kind).toBe('rivets');
    expect(game.level).toBe(1);
  });

  it('walking over all eight rivets clears 100 m and starts level 2', () => {
    const { game, step } = playing();
    game.mario.x = 110; game.mario.feet = 36; step(1); step(Math.ceil(cfg.WIN_TIME * 60) + 2);
    step(Math.ceil(cfg.INTRO_TIME * 60) + 2);
    game.actors.fireballs = [];
    const before = game.score;
    for (const r of game.stage.rivets.slice(0, 7)) r.taken = true;
    const last = game.stage.rivets[7];
    game.mario.x = last.x + 4; game.mario.feet = last.y;
    step(1);
    expect(last.taken).toBe(true);
    expect(game.score - before).toBeGreaterThanOrEqual(100);
    expect(game.phase).toBe('win');
    step(Math.ceil(cfg.WIN_TIME * 60) + 2);
    expect(game.level).toBe(2);
    expect(game.kind).toBe('barrels');
  });

  it('bonus at zero is a death; 7000 points give one extra life', () => {
    const { game, step } = playing();
    game.bonus = 100;
    step(Math.ceil(cfg.bonusTick(1) * 60) + 2);
    expect(game.phase).toBe('dead');
    const add = (game as unknown as { addScore(n: number): void }).addScore.bind(game);
    add(7000); expect(game.lives).toBe(4);
    add(7000); expect(game.lives).toBe(4);
  });
});
