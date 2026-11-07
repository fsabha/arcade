import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const cfg = await import('../src/config');
const { STAGES } = await import('../src/stages');
const { DEFS, HEROES, ENEMIES, BOSSES, WEAPONS } = await import('../src/defs');

const dt = 1 / 60;
function playing(hero: 'axel' | 'blaze' | 'adam' = 'axel') {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.heroId = hero;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  step(Math.ceil(cfg.ROUND_INTRO_TIME * 60) + 2);
  return { game, input, step };
}

describe('data', () => {
  it('has eight rounds, each ending with a boss, and every spawn, item and weapon exists', () => {
    expect(STAGES.length).toBe(8);
    const lastBoss = STAGES.map((s) => s.waves.at(-1)!);
    expect(lastBoss.every((w) => w.boss)).toBe(true);
    expect(lastBoss.map((w) => w.spawns[0].def)).toEqual(['antonio', 'souther', 'abadede', 'bongo', 'mona', 'souther', 'bongo', 'mrx']);
    for (const b of BOSSES) expect(ENEMIES[b], b).toBeDefined();
    for (const s of STAGES) {
      for (const w of s.waves) for (const sp of w.spawns) expect(DEFS[sp.def], sp.def).toBeDefined();
      for (const it of s.items) if (it.kind === 'weapon') expect(WEAPONS).toContain(it.weapon);
    }
    // the elevator does not scroll; the HQ is a boss rush before Mr. X
    expect(STAGES[6].length).toBe(cfg.W);
    expect(STAGES[7].waves.filter((w) => w.boss).length).toBeGreaterThanOrEqual(5);
    // heroes: Blaze fastest and weakest, Adam strongest and slowest
    expect(HEROES.blaze.speed).toBeGreaterThan(HEROES.axel.speed);
    expect(HEROES.axel.speed).toBeGreaterThan(HEROES.adam.speed);
    const kick = (id: string) => HEROES[id].attacks.combo3.frames[0].damage;
    expect(kick('adam')).toBeGreaterThan(kick('axel'));
    expect(kick('axel')).toBeGreaterThan(kick('blaze'));
    for (const id of cfg.HERO_IDS) for (const w of WEAPONS) expect(HEROES[id].weaponAttacks?.[w]?.combo1, `${id} ${w}`).toBeDefined();
    // the named enemies carry their weapons
    expect(ENEMIES.nora.rig.weapon).toBe('whip');
    expect(ENEMIES.souther.rig.weapon).toBe('claws');
    expect(ENEMIES.jack0.ai?.ranged?.kind).toBe('knife');
    expect(ENEMIES.antonio.ai?.ranged?.returns).toBe(true);
    expect(ENEMIES.mrx.ai?.ranged?.burst).toBe(3);
  });
});

describe('streets of rage', () => {
  it('starts on the City Street with 3 lives, 3 credits, a full bar and one police call', () => {
    const { game } = playing();
    expect(game.roundIndex).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.continues).toBe(3);
    expect(game.hero.hp).toBe(cfg.HERO_HP);
    expect(game.hero.magic).toBe(1);
    expect(game.phase).toBe('play');
  });

  it('walks right, the camera follows and the first wave spawns Galsias', () => {
    const { game, input, step } = playing();
    input.press('right');
    step(60 * 8);
    expect(game.brawl.scrollX).toBeGreaterThan(100);
    expect(game.brawl.enemies.length).toBeGreaterThan(0);
    expect(game.brawl.enemies[0].def.name).toBe('GALSIA');
  });

  it('the police special spends one call and the napalm knocks every enemy on screen down', () => {
    const { game, input, step } = playing('blaze');
    const e1 = game.brawl.spawn('galsia0', game.hero.x + 80, game.hero.y, 'enemy');
    const e2 = game.brawl.spawn('donovan0', game.hero.x + 160, game.hero.y - 20, 'enemy');
    e1.ai.cooldown = e2.ai.cooldown = 99;
    input.tap('special'); step(1);
    expect(game.hero.magic).toBe(0);
    expect(game.policeFx).not.toBeNull();
    expect(game.hero.state).toBe('special');
    step(Math.ceil(cfg.POLICE_BLAST_AT * 60) + 2);
    expect(game.policeFx?.blasted).toBe(true);
    expect(e1.hp).toBeLessThanOrEqual(0);
    expect(e2.hp).toBeLessThanOrEqual(0);
    expect(['fly', 'down', 'die']).toContain(e1.state);
    // no calls left: the button does nothing
    step(Math.ceil(cfg.POLICE_TIME * 60));
    input.tap('special'); step(1);
    expect(game.policeFx).toBeNull();
    expect(game.hero.state).not.toBe('special');
  });

  it('a police car item grants another call, up to the limit', () => {
    const { game, step } = playing();
    game.brawl.addItem({ kind: 'special', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.hero.magic).toBe(2);
    game.hero.magic = cfg.MAX_SPECIALS;
    game.brawl.addItem({ kind: 'special', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.hero.magic).toBe(cfg.MAX_SPECIALS);
    expect(game.score).toBe(cfg.POINTS.moneyBag);
  });

  it('a pipe on the floor changes the attack to a swing and is dropped on a knockdown', () => {
    const { game, input, step } = playing();
    const b = game.brawl;
    b.addItem({ kind: 'weapon', weapon: 'pipe', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.hero.weapon).toBe('pipe');
    const bare = HEROES.axel.attacks.combo1.frames[0];
    const e = b.spawn('galsia0', game.hero.x + 26, game.hero.y, 'enemy');
    e.ai.cooldown = 99; game.hero.facing = 1;
    input.tap('fire'); step(1);
    expect(game.hero.move).toBe('combo1');
    step(14);
    expect(e.hp).toBe(e.maxHp - (bare.damage + 2)); // the pipe hits harder than the fist and reaches further
    // knocked down: the pipe falls next to the hero and can be picked up again
    b.damage(e, game.hero, 2, 'down', 60);
    expect(game.hero.weapon).toBeNull();
    expect(b.items.some((i) => i.kind === 'weapon' && i.weapon === 'pipe')).toBe(true);
    step(60 * 3);
    e.x = game.hero.x - 200;
    const pipe = b.items.find((i) => i.kind === 'weapon')!;
    game.hero.x = pipe.x; game.hero.y = pipe.y;
    input.press('up'); step(2); input.release('up');
    expect(game.hero.weapon).toBe('pipe');
  });

  it('the pepper shaker dazes an enemy instead of hurting it', () => {
    const { game, input, step } = playing();
    const b = game.brawl;
    b.addItem({ kind: 'weapon', weapon: 'shaker', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.hero.weapon).toBe('shaker');
    const e = b.spawn('galsia0', game.hero.x + 22, game.hero.y, 'enemy');
    e.ai.cooldown = 99; game.hero.facing = 1;
    input.tap('fire'); step(16);
    expect(e.stunned).toBeGreaterThan(1);
    expect(e.hp).toBe(e.maxHp - 1);
  });

  it('apples heal a third, chickens heal everything, money pays, 1-UP adds a life', () => {
    const { game, step } = playing();
    const b = game.brawl;
    game.hero.hp = 4;
    b.addItem({ kind: 'food', x: game.hero.x + 2, y: game.hero.y, value: cfg.APPLE_HEAL });
    step(2);
    expect(game.hero.hp).toBe(4 + cfg.APPLE_HEAL);
    b.addItem({ kind: 'food', x: game.hero.x + 2, y: game.hero.y, value: cfg.CHICKEN_HEAL });
    step(2);
    expect(game.hero.hp).toBe(cfg.HERO_HP);
    b.addItem({ kind: 'points', x: game.hero.x + 2, y: game.hero.y, value: cfg.POINTS.goldBar });
    step(2);
    expect(game.score).toBe(cfg.POINTS.goldBar);
    b.addItem({ kind: 'life', x: game.hero.x + 2, y: game.hero.y });
    step(2);
    expect(game.lives).toBe(4);
  });

  it('defeating an enemy scores its points and shows its bar while it is hit', () => {
    const { game, input, step } = playing('adam');
    const b = game.brawl;
    const e = b.spawn('galsia0', game.hero.x + 24, game.hero.y, 'enemy');
    e.ai.cooldown = 99; game.hero.facing = 1;
    input.tap('fire'); step(12);
    expect(game.focus).toBe(e);
    expect(game.focusT).toBeGreaterThan(0);
    e.hp = 1;
    b.damage(game.hero, e, 1, 'down', 60);
    step(60 * 3);
    expect(game.score).toBe(ENEMIES.galsia0.points);
  });

  it('losing the bar costs a life, then a credit with a countdown, then game over', () => {
    const { game, input, step } = playing();
    game.hero.magic = 0;
    game.killHero();
    step(60 * 4);
    expect(game.lives).toBe(2);
    expect(game.phase).toBe('play');
    expect(game.hero.magic).toBe(cfg.SPECIALS_PER_LIFE); // every life starts with one police call
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

  it('clearing a round pays 1000 and moves to the next one; the last one ends the game', () => {
    const { game, step } = playing();
    game.brawl.hooks.onStageClear!();
    expect(game.phase).toBe('clear');
    expect(game.score).toBe(cfg.POINTS.roundClear);
    step(Math.ceil(cfg.CLEAR_TIME * 60) + 2);
    expect(game.roundIndex).toBe(1);
    expect(game.phase).toBe('intro');
    expect(game.brawl.stage.id).toBe('innercity');
    game.roundIndex = STAGES.length - 1;
    game.startRound();
    step(Math.ceil(cfg.ROUND_INTRO_TIME * 60) + 2);
    expect(game.brawl.stage.id).toBe('hq');
    game.brawl.hooks.onStageClear!();
    step(Math.ceil(cfg.CLEAR_TIME * 60) + 2);
    expect(game.phase).toBe('ending');
  });

  it('the elevator round throws its waves without scrolling', () => {
    const { game, step } = playing();
    game.roundIndex = 6;
    game.startRound();
    step(Math.ceil(cfg.ROUND_INTRO_TIME * 60) + 2);
    expect(game.brawl.stage.id).toBe('elevator');
    step(60);
    expect(game.brawl.scrollX).toBe(0);
    expect(game.brawl.waveActive).toBe(true);
    expect(game.brawl.enemies.length).toBeGreaterThan(0);
  });

  it('Antonio throws a boomerang that comes back; Mr. X fires a burst', () => {
    const { game, step } = playing();
    const b = game.brawl;
    const a = b.spawn('antonio', game.hero.x + 120, game.hero.y, 'enemy');
    a.ai.cooldown = 0;
    step(10);
    const boom = b.projectiles.find((p) => p.kind === 'boomerang');
    expect(boom).toBeDefined();
    expect(boom!.turnAt).toBeDefined();
    const vx0 = boom!.vx;
    step(90);
    expect(boom!.returning || !boom!.alive).toBe(true);
    if (boom!.alive) expect(Math.sign(boom!.vx)).toBe(-Math.sign(vx0));
    a.hp = 0; b.damage(game.hero, a, 1, 'down', 50); step(60 * 2);
    const x = b.spawn('mrx', game.hero.x + 150, game.hero.y, 'enemy');
    x.ai.cooldown = 0;
    step(10);
    expect(b.projectiles.filter((p) => p.kind === 'bullet').length).toBe(3);
  });

  it('renders every phase and the menus without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const r = new Renderer(fakeCanvas());
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); r.draw(game); input.endFrame(); } };
    step(10);
    input.tap('down'); step(); input.tap('right'); step();
    expect(game.heroId).toBe('blaze');
    input.tap('down'); step(); input.tap('right'); step();
    expect(game.difficulty).toBe('hard');
    input.tap('up'); step(); input.tap('up'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    let seed = 3;
    for (let i = 0; i < 60 * 60 && game.state === 'playing'; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (i % 20 === 0) input.tap(['fire', 'jump', 'special', 'fire'][seed % 4]);
      if (i % 45 === 0) { input.held.clear(); input.held.add(seed % 3 ? 'right' : 'left'); if (seed % 4 === 0) input.held.add('up'); }
      if (i === 200) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      step();
    }
    // every theme draws, including the elevator and the HQ, plus the police car and the ending
    for (let s = 0; s < STAGES.length; s++) {
      game.roundIndex = s;
      game.startRound();
      step(Math.ceil(cfg.ROUND_INTRO_TIME * 60) + 2);
      game.brawl.spawn('galsia0', game.hero.x + 60, game.hero.y, 'enemy');
      game.hero.magic = 1;
      input.tap('special'); step(Math.ceil(cfg.POLICE_TIME * 60) + 2);
    }
    (game as unknown as { phase: string }).phase = 'ending'; step(60 * 7); input.tap('fire'); step();
    expect(game.state).toBe('gameover');
    step(130); input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  });
});
