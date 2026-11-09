import { describe, it, expect } from 'vitest';
import { World, BASE_GIFTS, BASE_KIT, INVULNERABLE, type LevelDef } from '../src/world';
import { LEVELS } from '../src/levels';
import { BOSSES, startBoss, hitBoss } from '../src/boss';
import { campaign } from './bot';

const lv = (extra: Partial<LevelDef> = {}): LevelDef => ({ ...LEVELS[0], river: 1, rate: 0, trials: [], ...extra });
const run = (w: World, s: number, each?: (w: World) => void) => { for (let i = 0; i < s * 60; i++) { each?.(w); w.update(1 / 60); } };
const kinds = (w: World) => w.events.map((e) => e.kind);
/** a world with no rows and no fire, to test one thing at a time */
const bare = (extra: Partial<LevelDef> = {}) => { const w = new World(1.9, lv(extra), 3, BASE_GIFTS, BASE_KIT, 1); w.blocks = []; w.riverLeft = 0; return w; };

describe('ribomba blocks', () => {
  it('×n turns one soldier into n, once per gate', () => {
    const w = bare();
    w.blocks = [w.makeBlock('mul', 3, 0.5, 0.4, 0.5)];
    w.blue.add(0.5, w.laneY(0.5) + 0.01, 0, -0.55, 1, 0, 0.5);
    const before = w.blue.n;
    (w as unknown as { moveBlue(dt: number): void }).moveBlue(1 / 30);
    expect(w.blue.n).toBe(before + 2);
    (w as unknown as { moveBlue(dt: number): void }).moveBlue(1 / 30);
    expect(w.blue.n).toBe(before + 2);
  });

  it('a crate eats soldiers until it breaks and hands over its upgrade', () => {
    const w = bare();
    const b = w.makeBlock('box', 3, 0.5, 0.4, 0.5, 'duplo');
    w.blocks = [b];
    for (let i = 0; i < 3; i++) w.blue.add(0.5, w.laneY(0.5) + 0.004, 0, -0.55, 1, 0, 0.5);
    (w as unknown as { moveBlue(dt: number): void }).moveBlue(1 / 60);
    expect(b.gone).toBe(true);
    expect(w.blue.n).toBe(0);
    expect(w.kit.barrels).toBe(2);
    expect(kinds(w)).toContain('break');
  });

  it('the middle of a row is never the best block; rows alternate their good side', () => {
    const w = new World(1.9, LEVELS[3], 3, BASE_GIFTS, BASE_KIT, 7);
    for (let k = 0; k < 6; k++) {
      w.buildRows(false);
      for (const y of [0.74, 0.5]) {
        const row = w.blocks.filter((b) => b.y === y);
        const mid = row.find((b) => b.x0 === 0.5)!;
        const value = (b: typeof mid) => (b.kind === 'mul' ? b.n * 10 : b.kind === 'add' ? b.n : b.up ? 5 : -1);
        expect(row.some((b) => b !== mid && value(b) > value(mid))).toBe(true);
      }
    }
  });
});

describe('ribomba river and lives', () => {
  it('blue and red cancel one for one', () => {
    const w = bare();
    w.blue.add(0.5, 1, 0, 0, 1, 0, 0.5);
    w.red.add(0.5, 1.005, 0, 0, 1, 0, 0.5);
    w.red.add(0.5, 0.6, 0, 0, 1, 0, 0.5);
    (w as unknown as { clash(): void }).clash();
    expect(w.blue.n).toBe(0);
    expect(w.red.n).toBe(1);
  });

  it('a red reaching the line costs a life and sweeps the reds behind it', () => {
    const w = bare();
    w.red.add(0.3, w.bottom - 0.02, 0, 0.3, 1, 0, 0.5);
    for (let i = 0; i < 10; i++) w.red.add(0.3 + i * 0.03, w.bottom - 0.2, 0, 0.1, 1, 0, 0.5);
    w.red.add(0.5, w.top + 0.1, 0, 0.1, 1, 0, 0.5);
    w.cannon.tx = w.cannon.x = 0.9;
    run(w, 0.3);
    expect(w.lives).toBe(2);
    expect(kinds(w)).toContain('breach');
    expect(w.red.n).toBe(1);
    expect(w.inv).toBeGreaterThan(INVULNERABLE - 0.5);
  });

  it('the river changes bank', () => {
    const w = new World(1.9, LEVELS[0], 3, BASE_GIFTS, BASE_KIT, 3);
    const seen = new Set<number>();
    run(w, 40, () => seen.add(Math.round(w.mouth * 4)));
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});

describe('ribomba captains', () => {
  it('weak point ×3, armour ×0.2, a miss does nothing', () => {
    const w = bare();
    const b = startBoss(w, BOSSES[0]);
    b.intro = 0; b.x = 0.5; b.weakDx = 0.12; b.open = 1;
    hitBoss(w, b, 0.62, 1);
    expect(b.max - b.hp).toBeCloseTo(3);
    hitBoss(w, b, 0.5, 1);
    expect(b.max - b.hp).toBeCloseTo(3.2);
    hitBoss(w, b, 0.95, 1);
    expect(b.max - b.hp).toBeCloseTo(3.2);
  });

  it('every captain attacks where the cannon is, and a standing cannon gets hit', () => {
    for (let k = 0; k < BOSSES.length; k++) {
      const w = new World(1.9, { ...LEVELS[k], river: 1, trials: [] }, 9, BASE_GIFTS, BASE_KIT, k + 1);
      w.riverLeft = 0;
      run(w, 2);
      w.red.n = 0;
      run(w, 25, () => { w.aim(0.3); w.red.n = 0; });
      expect(w.boss, `captain ${k}`).not.toBeNull();
      expect(w.lives, BOSSES[k].name).toBeLessThan(9);
    }
  });

  it('fury below 30%', () => {
    const w = bare();
    const b = startBoss(w, BOSSES[2]);
    b.intro = 0;
    b.hp = b.max * 0.31;
    hitBoss(w, b, b.x + 0.1, 0.02 * b.max);
    expect(b.fury).toBe(true);
    expect(kinds(w)).toContain('fury');
  });
});

describe('ribomba difficulty (bots)', () => {
  it('a passive cannon (sitting in the middle) loses the first stage', () => {
    for (let s = 1; s <= 4; s++) expect(campaign('passive', s).reached).toBe(1);
  });
  it('random play does not get far', () => {
    for (let s = 1; s <= 4; s++) expect(campaign('random', s).reached).toBeLessThanOrEqual(2);
  });
  it('skilled play gets well into the campaign, but it is a struggle', () => {
    const res = Array.from({ length: 8 }, (_, i) => campaign('skilled', i + 1));
    const reached = res.map((r) => r.reached).sort((a, b) => a - b);
    expect(reached[4]).toBeGreaterThanOrEqual(3);
    expect(res.filter((r) => r.won).length).toBeLessThanOrEqual(3);
    // lives are lost along the way
    expect(res.reduce((a, r) => a + r.lost.reduce((x, y) => x + y, 0), 0)).toBeGreaterThan(8);
  }, 120000);
});
