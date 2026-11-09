import { describe, it, expect } from 'vitest';
import { World, BASE_GIFTS, PETAL_HP, SPROUT_HP, SAP_MAX, WILT_TIME, type LevelDef, type GateDef } from '../src/world';
import { LEVELS } from '../src/levels';
import { BOSSES, startBoss, hitBoss } from '../src/boss';
import { campaign } from './bot';

const lv = (gates: GateDef[], extra: Partial<LevelDef> = {}): LevelDef => ({ name: 'T', gates, horde: 1, opening: 0, rate: 0, foeSpeed: 0.1, boss: 0, trials: [], warn: 1, hit: 8, par: 60, ...extra });
const run = (w: World, s: number, each?: (w: World) => void) => { for (let i = 0; i < s * 60; i++) { each?.(w); w.update(1 / 60); } };
const seedBelow = (w: World, g: GateDef, dx = 0) => w.seeds.add(g.x + dx, w.laneY(g.y) + 0.01, 0, -0.5, 1, 0, 0, 0.5);
const kinds = (w: World) => w.events.map((e) => e.kind);

describe('broto gates', () => {
  it('×n turns one seed into n, once per gate', () => {
    const g: GateDef = { op: 'mul', n: 3, x: 0.5, w: 0.4, y: 0.5 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 1);
    seedBelow(w, g);
    run(w, 0.3);
    expect(w.seeds.n).toBe(3);
    run(w, 0.3);
    expect(w.seeds.n).toBe(3);
  });

  it("Olho-d'Água multiplies only through its centre; winter turns ×2 into ÷2", () => {
    const g: GateDef = { op: 'well', n: 5, x: 0.5, w: 0.5, y: 0.5 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 4);
    seedBelow(w, g, 0);
    seedBelow(w, g, 0.18);
    run(w, 0.3);
    expect(w.seeds.n).toBe(6);
    const r: GateDef = { op: 'mul', n: 2, x: 0.5, w: 0.6, y: 0.5 };
    const w2 = new World(2, lv([r]), 3, BASE_GIFTS, 5);
    w2.winter = 5;
    for (let i = 0; i < 4; i++) w2.seeds.add(0.3 + i * 0.12, w2.laneY(0.5) + 0.01, 0, -0.5, 1, 0, 0, i);
    run(w2, 0.3);
    expect(w2.seeds.n).toBe(2);
  });
});

describe('broto sap', () => {
  it('holding the stream drains the sap and the Sower wilts; letting go refills it', () => {
    const w = new World(2, lv([]), 3, BASE_GIFTS, 6);
    w.sower.firing = true;
    run(w, 12);
    expect(kinds(w)).toContain('wilt');
    expect(w.wilt).toBeGreaterThan(0);
    const n = w.seeds.n;
    w.events.length = 0;
    run(w, 1);
    expect(kinds(w)).not.toContain('fire'); // wilted: nothing comes out
    w.sower.firing = false;
    run(w, WILT_TIME + 2);
    expect(w.sap).toBeGreaterThan(80);
    expect(n).toBeGreaterThan(0);
  });

  it('starting with a full tank lets out a burst of strong seeds', () => {
    const w = new World(2, lv([]), 3, BASE_GIFTS, 7);
    expect(w.sap).toBe(SAP_MAX);
    w.sower.firing = true;
    run(w, 0.5);
    expect(kinds(w)).toContain('burst');
    expect(Array.from(w.seeds.hp.slice(0, w.seeds.n)).some((h) => h === 2)).toBe(true);
  });
});

describe('broto hazards', () => {
  it('a telegraphed drop hurts the Sower only if it stays in the column', () => {
    const w = new World(2, lv([]), 3, BASE_GIFTS, 8);
    w.drop(0.5, 0.14, 8, 0, 0.5);
    w.aim(0.5);
    run(w, 2);
    expect(w.petalHp).toBe(2 * PETAL_HP); // a direct blow takes a whole petal
    const w2 = new World(2, lv([]), 3, BASE_GIFTS, 8);
    w2.drop(0.5, 0.14, 8, 0, 0.5);
    w2.aim(0.85);
    run(w2, 2);
    expect(w2.petalHp).toBe(3 * PETAL_HP);
  });

  it('a band strikes everywhere but its gap', () => {
    const w = new World(2, lv([]), 3, BASE_GIFTS, 9);
    w.band([0.3], 0.25, 10, 0, 0.3);
    w.aim(0.3);
    run(w, 1);
    expect(w.petalHp).toBe(3 * PETAL_HP);
    const w2 = new World(2, lv([]), 3, BASE_GIFTS, 9);
    w2.band([0.3], 0.25, 10, 0, 0.3);
    w2.aim(0.75);
    run(w2, 1);
    expect(w2.petalHp).toBe(2 * PETAL_HP);
  });
});

describe('broto guardians', () => {
  it('the guardian comes when the horde is spent', () => {
    const w = new World(2, lv([], { horde: 3, opening: 3 }), 3, BASE_GIFTS, 10);
    w.hordeLeft = 0;
    expect(w.phase).toBe('horde');
    w.ash.n = 0; w.hordeLeft = 0;
    w.update(1 / 60);
    expect(w.phase).toBe('boss');
    expect(kinds(w)).toContain('boss');
  });

  it('the thistle sends seeds back while its mirror is up', () => {
    const w = new World(2, lv([], { boss: 2 }), 3, BASE_GIFTS, 11);
    const b = startBoss(w, BOSSES[2]);
    b.intro = 0;
    b.mirror = 2;
    hitBoss(w, b, b.x, 1, false);
    expect(b.hp).toBe(b.max);
    expect(w.ash.n).toBe(1);
    expect(kinds(w)).toContain('reflect');
    b.mirror = 0;
    hitBoss(w, b, b.x, 1, false);
    expect(b.hp).toBe(b.max - 1);
  });

  it('the dry heart heals in its contraction and only a Sprout breaks its last tenth', () => {
    const w = new World(2, lv([], { boss: 9 }), 3, BASE_GIFTS, 12);
    const b = startBoss(w, BOSSES[9]);
    b.intro = 0;
    b.hp = 100;
    b.contract = 1;
    hitBoss(w, b, b.x, 5, false);
    expect(b.hp).toBe(105);
    b.contract = 0;
    b.hp = b.max * 0.05;
    hitBoss(w, b, b.x, 5, false);
    expect(b.hp).toBe(b.max * 0.05);
    hitBoss(w, b, b.x, SPROUT_HP, true);
    expect(b.hp).toBeLessThanOrEqual(0);
  });

  it('the frost queen shields her core until her crystals break', () => {
    const w = new World(2, lv([], { boss: 4 }), 3, BASE_GIFTS, 13);
    const b = startBoss(w, BOSSES[4]);
    b.intro = 0;
    expect(b.parts.length).toBe(6);
    const p = b.parts[0];
    hitBoss(w, b, p.x, p.hp, false);
    expect(p.hp).toBe(0);
    expect(b.hp).toBe(b.max - p.max);
  });

  it('ignores time that does not move forward', () => {
    const w = new World(2, LEVELS[0], 3, BASE_GIFTS, 14);
    const t = w.t;
    w.update(0); w.update(-1); w.update(NaN);
    expect(w.t).toBe(t);
  });
});

describe('broto difficulty (bots play the whole campaign)', () => {
  it('holding the stream in the middle is not enough: the passive bot falls by stage 2', () => {
    const runs = [1, 2, 3, 4, 5].map((s) => campaign('passive', s));
    for (const r of runs) expect(r.reached).toBeLessThanOrEqual(2);
  });

  it('a skilled player gets far, and loses petals from the middle stages on', () => {
    const runs = [1, 2, 3, 4, 5, 6].map((s) => campaign('skilled', s));
    const reached = runs.map((r) => r.reached).sort((a, b) => a - b);
    expect(reached[Math.floor(reached.length / 2)]).toBeGreaterThanOrEqual(5);
    const late = runs.flatMap((r) => r.petalsLost.slice(4));
    expect(late.filter((p) => p > 0).length / Math.max(1, late.length)).toBeGreaterThan(0.3);
  }, 120000);
});
