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
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  return { game, input, step };
}
/** Puts Bailey over the first floe of a row and lands him there. */
function placeOnRow(game: InstanceType<typeof Game>, row: number) {
  const x = game.sea.floes(row)[0] + 8;
  game.bailey.x = x;
  game.bailey.row = row;
  game.bailey.feet = cfg.ROW_FEET[row];
  game.bailey.mode = 'stand';
}

describe('frostbite rules', () => {
  it('starts on the shore with 3 reserve lives, 45 degrees and an empty igloo', () => {
    const { game } = playing();
    expect(game.reserve).toBe(3);
    expect(game.temperature).toBe(45);
    expect(game.blocks).toBe(0);
    expect(game.bailey.row).toBe(-1);
  });
  it('landing on a white floe adds a block and 10 points, then the row is blue', () => {
    const { game, input, step } = playing();
    const x = game.sea.floes(0)[0];
    game.bailey.x = x + 8 - game.sea.rows[0].dir * game.sea.speed * cfg.JUMP_TIME * 0; // floes keep moving; start centred
    game.bailey.x = x + 10;
    input.tap('down');
    step(1);
    expect(game.bailey.mode).toBe('jump');
    // steer with the floe so the landing stays on it
    for (let i = 0; i < 40 && game.bailey.mode === 'jump'; i++) { game.bailey.x = game.sea.floes(0)[0] + 10; step(1); }
    expect(game.bailey.mode).toBe('stand');
    expect(game.blocks).toBe(1);
    expect(game.score).toBe(10);
    expect(game.sea.rows[0].white).toBe(false);
  });
  it('landing in the water costs a life', () => {
    const { game, input, step } = playing();
    const gap = game.sea.floes(0)[0] + game.sea.floeW + 6;
    game.bailey.x = gap;
    input.tap('down');
    step(1);
    for (let i = 0; i < 40 && game.bailey.mode === 'jump'; i++) { game.bailey.x = game.sea.floes(0)[0] + game.sea.floeW + 6; step(1); }
    expect(game.bailey.mode).toBe('splash');
    step(Math.ceil(cfg.DEATH_TIME * 60) + 2);
    expect(game.reserve).toBe(2);
    expect(game.bailey.row).toBe(-1);
  });
  it('reversing a floe costs a block; four blue rows turn white again', () => {
    const { game, input, step } = playing();
    game.blocks = 3;
    placeOnRow(game, 2);
    const dir = game.sea.rows[2].dir;
    input.tap('fire');
    step(1);
    expect(game.sea.rows[2].dir).toBe(-dir);
    expect(game.blocks).toBe(2);
    for (const r of game.sea.rows) r.white = false;
    game.sea.rows[3].white = true;
    game.bailey.x = game.sea.floes(3)[0] + 10;
    game.bailey.row = 2; game.bailey.feet = cfg.ROW_FEET[2]; game.bailey.mode = 'stand';
    input.tap('down'); step(1);
    for (let i = 0; i < 40 && (game.bailey.mode as string) === 'jump'; i++) { game.bailey.x = game.sea.floes(3)[0] + 10; step(1); }
    expect(game.sea.rows.every((r) => r.white)).toBe(true);
  });
  it('the temperature falls one degree per second and freezes Bailey at zero', () => {
    const { game, step } = playing();
    step(60 * 3 + 2);
    expect(game.temperature).toBe(42);
    game.temperature = 1;
    step(61);
    expect(game.bailey.mode).toBe('freeze');
  });
  it('entering the finished igloo pays the bonus and starts the next level', () => {
    const { game, step } = playing();
    game.blocks = 16;
    game.iglooDone = true;
    game.temperature = 30;
    game.bailey.x = cfg.IGLOO_DOOR_X - 8;
    step(1);
    expect(game.bailey.mode).toBe('enter');
    expect(game.score).toBe(160 + 10 * 30 * 1);
    step(Math.ceil(cfg.ENTER_TIME * 60) + 2);
    expect(game.level).toBe(2);
    expect(game.blocks).toBe(0);
    expect(game.temperature).toBe(45);
  });
  it('extra life every 5000 points, up to nine', () => {
    const { game } = playing();
    game.blocks = 16; game.iglooDone = true; game.temperature = 45; game.level = 9;
    game.bailey.x = cfg.IGLOO_DOOR_X - 8;
    game.update(dt);
    expect(game.score).toBe(1440 + 4050);
    expect(game.reserve).toBe(4);
  });
  it('a goose pushes Bailey along the row; the bear chases him off the shore from level 4', () => {
    const { game, step } = playing();
    const r = 1; // geese on row 2 at level 1
    const g = game.sea.rows[r].group!;
    expect(g.kind).toBe('goose');
    placeOnRow(game, r);
    g.xs[0] = game.bailey.x;
    const before = game.bailey.x;
    game.sea.speed = 0; g.speed = 60;
    step(1);
    expect(game.bailey.x).not.toBe(before);
    // bear
    game.level = 4; game['startLevel'](); game.bailey.x = 150; game.bearX = 150;
    step(1);
    expect(game.bailey.mode).toBe('chased');
    step(60 * 4);
    expect(game.reserve).toBe(2);
  });
  it('the advanced game starts at level 5 (night shift)', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    game.variation = 'advanced';
    game.startGame();
    expect(game.level).toBe(5);
    expect(cfg.isNight(game.level)).toBe(true);
  });
});
