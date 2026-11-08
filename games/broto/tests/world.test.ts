import { describe, it, expect } from 'vitest';
import { World, BASE_GIFTS, PETAL_HP, SPROUT_HP, DEW_REFILL, type LevelDef, type GateDef } from '../src/world';
import { LEVELS } from '../src/levels';

const lv = (gates: GateDef[], extra: Partial<LevelDef> = {}): LevelDef => ({ name: 'T', gates, horde: 0, opening: 0, rate: 0, foeSpeed: 0.1, heartHp: 100, par: 60, ...extra });
const run = (w: World, s: number, each?: (w: World) => void) => { for (let i = 0; i < s * 60; i++) { each?.(w); w.update(1 / 60); } };
/** one seed just below gate g, heading up */
const seedBelow = (w: World, g: GateDef, dx = 0) => w.seeds.add(g.x + dx, w.laneY(g.y) + 0.01, 0, -0.36, 1, 0, 0, 0.5);

describe('broto gates', () => {
  it('×n turns one seed into n, once per gate', () => {
    const g: GateDef = { op: 'mul', n: 3, x: 0.5, w: 0.4, y: 0.5 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 1);
    seedBelow(w, g);
    run(w, 0.3);
    expect(w.seeds.n).toBe(3);
    run(w, 0.5);
    expect(w.seeds.n).toBe(3); // the copies do not cross the same gate again
  });

  it('Orvalho lets out n seeds, then needs to refill', () => {
    const g: GateDef = { op: 'add', n: 5, x: 0.5, w: 0.4, y: 0.5 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 2);
    seedBelow(w, g);
    seedBelow(w, g, 0.05);
    run(w, 0.3);
    expect(w.seeds.n).toBe(2 + 5); // the second seed came while it was refilling
    expect(DEW_REFILL).toBeGreaterThan(0.3);
  });

  it('Espinho absorbs n seeds and is spent; Geada keeps one in two', () => {
    const t: GateDef = { op: 'sub', n: 3, x: 0.25, w: 0.4, y: 0.5 };
    const f: GateDef = { op: 'div', n: 2, x: 0.75, w: 0.4, y: 0.5 };
    const w = new World(2, lv([t, f]), 3, BASE_GIFTS, 3);
    for (let i = 0; i < 5; i++) w.seeds.add(0.25 + (i - 2) * 0.03, w.laneY(0.5) + 0.01 + i * 0.002, 0, -0.36, 1, 0, 0, i);
    for (let i = 0; i < 6; i++) w.seeds.add(0.75 + (i - 3) * 0.03, w.laneY(0.5) + 0.01 + i * 0.002, 0, -0.36, 1, 0, 0, i);
    run(w, 0.4);
    expect(w.gates[0].left).toBe(0);
    expect(w.seeds.n).toBe(2 + 3);
  });

  it("Olho-d'Água multiplies only through its centre", () => {
    const g: GateDef = { op: 'well', n: 5, x: 0.5, w: 0.5, y: 0.5 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 4);
    seedBelow(w, g, 0);
    seedBelow(w, g, 0.18);
    run(w, 0.3);
    expect(w.seeds.n).toBe(5 + 1);
    expect(w.wellHits).toBe(1);
  });

  it('a gate wilts after its uses', () => {
    const g: GateDef = { op: 'mul', n: 2, x: 0.5, w: 0.6, y: 0.5, uses: 2 };
    const w = new World(2, lv([g]), 3, BASE_GIFTS, 5);
    for (let i = 0; i < 4; i++) w.seeds.add(0.3 + i * 0.12, w.laneY(0.5) + 0.01, 0, -0.36, 1, 0, 0, i);
    run(w, 0.3);
    expect(w.seeds.n).toBe(4 + 2);
  });

  it('a sprout skips the gates', () => {
    const g: GateDef = { op: 'mul', n: 3, x: 0.5, w: 0.6, y: 0.8 };
    const w = new World(2, lv([g]), 3, { ...BASE_GIFTS, sproutEvery: 1 }, 6);
    w.charge = 1;
    expect(w.sprout()).toBe(true);
    run(w, 2);
    expect(w.seeds.n).toBe(1);
    expect(w.seeds.hp[0]).toBe(SPROUT_HP);
  });
});

describe('broto crowds', () => {
  it('seed and ash cancel hit point for hit point; an ember takes three', () => {
    const w = new World(2, lv([]), 3, BASE_GIFTS, 7);
    w.ash.add(0.5, 1, 0, 0, 3, 1, 0, 0);
    for (let i = 0; i < 4; i++) w.seeds.add(0.5, 1.04 + i * 0.02, 0, -0.36, 1, 0, 0, i);
    run(w, 0.6);
    expect(w.ash.n).toBe(0);
    expect(w.seeds.n).toBe(1);
  });

  it('the heart is shielded while its horde lasts, then cracks', () => {
    const w = new World(2, lv([], { horde: 1, opening: 1, heartHp: 10 }), 3, BASE_GIFTS, 8);
    w.ash.x[0] = 0.05; w.ash.y[0] = w.bottom - 0.3; // out of the way
    for (let i = 0; i < 5; i++) w.seeds.add(0.5, w.top + 0.02 + i * 0.002, 0, -0.36, 1, 0, 0, i);
    w.update(1 / 10);
    expect(w.heartHp).toBe(10);
    expect(w.events.some((e) => e.kind === 'shield')).toBe(true);
    w.ash.n = 0;
    for (let i = 0; i < 10; i++) w.seeds.add(0.5, w.top + 0.02, 0, -0.36, 1, 0, 0, i);
    run(w, 0.5);
    expect(w.done).toBe('win');
  });

  it('ash at the flower tears petals, and the run ends with none', () => {
    const w = new World(2, lv([]), 2, BASE_GIFTS, 9);
    for (let i = 0; i < PETAL_HP + 1; i++) w.ash.add(0.5, w.bottom - 0.025, 0, 0.2, 1, 0, 0, i);
    run(w, 0.5);
    expect(w.petals).toBe(1);
    expect(w.events.some((e) => e.kind === 'petal')).toBe(true);
    for (let i = 0; i < PETAL_HP; i++) w.ash.add(0.5, w.bottom - 0.025, 0, 0.2, 1, 0, 0, i);
    run(w, 0.5);
    expect(w.done).toBe('lose');
  });

  it('the final heart has stages that bring the horde back', () => {
    const w = new World(2, lv([], { heartHp: 90, stages: 3, stageWave: 20 }), 3, BASE_GIFTS, 10);
    w.heartHp = 59;
    w.update(1 / 60);
    expect(w.stage).toBe(1);
    expect(w.hordeLeft).toBe(20);
    expect(w.open).toBe(false);
  });

  it('ignores time that does not move forward', () => {
    const w = new World(2, LEVELS[0], 3, BASE_GIFTS, 11);
    const t = w.t;
    w.update(0); w.update(-1); w.update(NaN);
    expect(w.t).toBe(t);
  });
});

describe('broto stages', () => {
  // a player who holds the stream on the column whose gates multiply most
  const play = (k: number) => {
    const gifts = { ...BASE_GIFTS, rate: 10 * Math.pow(1.15, Math.floor(k / 2)), pollen: k >= 3 ? 2 : 1, bark: k >= 5 ? 0.1 : 0 };
    const w = new World(1.9, LEVELS[k], 3, gifts, 7 + k);
    w.sower.firing = true;
    let t = 0;
    while (!w.done && t < 200) {
      let best = 0.5, bv = -1;
      for (let x = 0.1; x <= 0.9; x += 0.02) {
        let v = 1;
        for (const g of w.gates) {
          if (Math.abs(x - g.cx) >= g.w / 2 || (g.uses !== undefined && g.used >= g.uses)) continue;
          v *= g.op === 'mul' ? g.n : g.op === 'well' ? (Math.abs(x - g.cx) < g.w * 0.15 ? g.n : 1) : g.op === 'add' ? 1.4 : g.op === 'div' ? 0.5 : g.left > 0 ? 0.7 : 1;
        }
        if (w.stones.some((s) => Math.abs(x - s.x) < s.w / 2 + 0.02)) v = 0;
        if (v > bv + 1e-6) { bv = v; best = x; }
      }
      w.aim(best);
      w.sprout();
      w.update(1 / 30); t += 1 / 30;
      w.events.length = 0;
    }
    return w;
  };
  it.each([0, 4, 9])('a careful player can finish stage %i', (k) => {
    expect(play(k).done).toBe('win');
  });
});
