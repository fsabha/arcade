import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const cfg = await import('../src/config');
const { STAGES } = await import('../src/stages');
const { DEFS, HEROES } = await import('../src/defs');

const dt = 1 / 60;
function playing(hero: 'ax' | 'tyris' | 'gilius' = 'ax') {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.heroId = hero;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  step(Math.ceil(cfg.STAGE_INTRO_TIME * 60) + 2);
  return { game, input, step };
}

describe('data', () => {
  it('has eight stages ending with Death Adder and Death Bringer, and every spawn/mount exists', () => {
    expect(STAGES.length).toBe(8);
    expect(STAGES[6].waves.at(-1)!.spawns[0].def).toBe('deathadder');
    expect(STAGES[7].waves.at(-1)!.spawns[0].def).toBe('deathbringer');
    for (const s of STAGES) {
      for (const w of s.waves) for (const sp of w.spawns) expect(DEFS[sp.def], sp.def).toBeDefined();
      for (const m of s.mounts) expect(DEFS[m.def]?.mount, m.def).toBeDefined();
    }
    expect(cfg.MAX_POTS).toEqual({ ax: 4, tyris: 6, gilius: 3 });
    expect(HEROES.gilius.rig.weapon).toBe('axe');
  });
});

describe('golden axe', () => {
  it('starts on the Wilderness with 3 lives, 3 credits, 3 bars of health and one pot', () => {
    const { game } = playing();
    expect(game.stageIndex).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.continues).toBe(3);
    expect(game.hero.hp).toBe(3 * cfg.BAR);
    expect(game.hero.magic).toBe(1);
    expect(game.phase).toBe('play');
  });

  it('walks right, the camera follows and the first wave spawns Heningers', () => {
    const { game, input, step } = playing();
    input.press('right');
    step(60 * 8);
    expect(game.brawl.scrollX).toBeGreaterThan(100);
    expect(game.brawl.enemies.length).toBeGreaterThan(0);
    expect(game.brawl.enemies[0].def.name).toBe('HENINGER');
  });

  it('magic spends every pot and knocks every enemy on screen down; damage grows with pots', () => {
    const { game, input, step } = playing('gilius');
    game.hero.magic = 3;
    const e = game.brawl.spawn('heninger0', game.hero.x + 80, game.hero.y, 'enemy');
    input.tap('special'); step(1);
    expect(game.hero.magic).toBe(0);
    expect(e.hp).toBeLessThanOrEqual(0);
    expect(game.magicFx?.kind).toBe('gilius');
    expect(game.magicFx?.level).toBe(3);
  });

  it('a pot beyond the limit is worth 100 points; meat heals a bar', () => {
    const { game, step } = playing('gilius');
    game.hero.magic = 3;
    game.brawl.addItem({ kind: 'pot', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.score).toBe(cfg.POINTS.potBonus);
    game.hero.hp = 2;
    game.brawl.addItem({ kind: 'food', x: game.hero.x + 2, y: game.hero.y, value: cfg.BAR });
    step(2);
    expect(game.hero.hp).toBe(2 + cfg.BAR);
  });

  it('losing all health costs a life, then a credit with a countdown, then game over', () => {
    const { game, input, step } = playing();
    game.killHero();
    step(60 * 4);
    expect(game.lives).toBe(2);
    expect(game.phase).toBe('play');
    game.lives = 0;
    game.killHero();
    step(60 * 4);
    expect(game.phase).toBe('continue');
    input.tap('fire'); step(1);
    expect(game.continues).toBe(2);
    expect(game.lives).toBe(3);
    game.lives = 0; game.continues = 0;
    game.killHero();
    step(60 * 4);
    expect(game.state).toBe('gameover');
  });

  it('clearing a stage pays 1000, visits the camp with thieves, then moves on', () => {
    const { game, step } = playing();
    game.brawl.hooks.onStageClear!();
    expect(game.phase).toBe('clear');
    expect(game.score).toBe(1000);
    step(Math.ceil(cfg.CLEAR_TIME * 60) + 2);
    expect(game.phase).toBe('camp');
    expect(game.brawl.actors.filter((a) => a.team === 'neutral').length).toBe(game.campThieves);
    step(Math.ceil(cfg.CAMP_TIME * 60) + 2);
    expect(game.stageIndex).toBe(1);
    expect(game.phase).toBe('intro');
  });

  it('renders every phase and the menus without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const r = new Renderer(fakeCanvas());
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); r.draw(game); input.endFrame(); } };
    step(10);
    input.tap('down'); step(); input.tap('right'); step();
    expect(game.heroId).toBe('tyris');
    input.tap('up'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    let seed = 3;
    for (let i = 0; i < 60 * 60 && game.state === 'playing'; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (i % 20 === 0) input.tap(['fire', 'jump', 'special', 'fire'][seed % 4]);
      if (i % 45 === 0) { input.held.clear(); input.held.add(seed % 3 ? 'right' : 'left'); if (seed % 4 === 0) input.held.add('up'); }
      if (i === 200) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      step();
    }
    game.lives = 0; game.continues = 0; game.killHero(); step(60 * 5);
    expect(game.state).toBe('gameover');
    step(130); input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  });
});
