import { describe, it, expect } from 'vitest';
import { World, LINK, LOOSE_TIME, SECTOR_LEN, MEMORIES, TIDE_TIME, type ChallengeKind } from '../src/world';

const run = (w: World, seconds: number, each?: (w: World) => void) => {
  for (let i = 0; i < seconds * 60; i++) { each?.(w); w.update(1 / 60); }
};
const clear = (w: World) => { w.lights = []; w.creatures = []; w.debris = []; w.lanterns = []; };

describe('lume world', () => {
  it('sinks, fades and lays the descent ahead', () => {
    const w = new World(2.1, 1);
    run(w, 4);
    expect(w.camY).toBeGreaterThan(1);
    expect(w.energy).toBeLessThan(1);
    expect(w.lights.length).toBeGreaterThan(0);
    expect(Math.max(...w.lights.map((o) => o.y))).toBeGreaterThan(w.camY + w.H * 0.8);
  });

  it('rescued lights feed the light and follow as a tail', () => {
    const w = new World(2, 2);
    clear(w);
    w.energy = 0.5;
    for (let i = 0; i < 5; i++) w.lights.push({ x: w.lume.x, y: w.lume.y + 0.02 + i * 0.03, phase: 0 });
    run(w, 1);
    expect(w.tail.length).toBe(5);
    expect(w.energy).toBeGreaterThan(0.5);
    // the chain keeps its spacing
    let prev = w.lume as { x: number; y: number };
    for (const n of w.tail) { expect(Math.hypot(n.x - prev.x, n.y - prev.y)).toBeLessThanOrEqual(LINK + 1e-6); prev = n; }
  });

  it('a creature on the tail cuts it; the loose part can be picked up again or goes out', () => {
    const w = new World(2, 3);
    clear(w);
    for (let i = 0; i < 6; i++) w.tail.push({ x: w.lume.x, y: w.lume.y - (i + 1) * LINK });
    const n2 = w.tail[2];
    w.creatures.push({ kind: 'mine', x: n2.x, y: n2.y, r: 0.04, x0: n2.x, phase: 0, speed: 0, stun: 0, seed: 0, dir: 1 });
    w.update(1 / 60);
    expect(w.tail.length).toBeLessThan(6);
    expect(w.loose.length).toBeGreaterThan(0);
    expect(w.events.some((e) => e.kind === 'cut')).toBe(true);
    w.creatures = [];
    // fly back through the loose lights
    const p = w.loose[0];
    w.lume.x = w.lume.tx = p.x; w.lume.sy = w.lume.ty = (p.y - w.camY) / w.H;
    w.update(1 / 60);
    expect(w.events.some((e) => e.kind === 'regain')).toBe(true);
    run(w, LOOSE_TIME + 0.2);
    expect(w.loose.length).toBe(0);
  });

  it('a lantern banks the tail for length squared and gives back a memory', () => {
    const w = new World(2, 4);
    clear(w);
    for (let i = 0; i < 7; i++) w.tail.push({ x: w.lume.x, y: w.lume.y - (i + 1) * LINK });
    w.energy = 0.3;
    const before = w.score;
    w.lanterns.push({ x: w.lume.x, y: w.lume.y + 0.02, lit: false });
    w.update(1 / 60);
    const ev = w.events.find((e) => e.kind === 'bank')!;
    expect(ev.value).toBe(7 * 7 * 10 + 50);
    expect(w.score - before).toBeGreaterThanOrEqual(ev.value);
    expect(ev.text).toBe(MEMORIES[0]);
    expect(w.tail.length).toBe(0);
    expect(w.energy).toBeGreaterThan(0.5);
  });

  it('a pulse burns a tail light to stun creatures and shatter debris', () => {
    const w = new World(2, 5);
    clear(w);
    w.tail.push({ x: w.lume.x, y: w.lume.y - LINK });
    w.creatures.push({ kind: 'jelly', x: w.lume.x + 0.15, y: w.lume.y, r: 0.05, x0: w.lume.x + 0.15, phase: 0, speed: 1, stun: 0, seed: 0, dir: 1 });
    w.debris.push({ x: w.lume.x - 0.12, y: w.lume.y, r: 0.04, a: 0, seed: 0 });
    expect(w.pulse()).toBe(true);
    expect(w.tail.length).toBe(0);
    expect(w.creatures[0].stun).toBeGreaterThan(0);
    expect(w.debris.length).toBe(0);
  });

  it('touching a creature drains the light; darkness ends the run', () => {
    const w = new World(2, 6);
    clear(w);
    w.energy = 0.2;
    w.creatures.push({ kind: 'mine', x: w.lume.x, y: w.lume.y + 0.01, r: 0.045, x0: w.lume.x, phase: 0, speed: 0, stun: 0, seed: 0, dir: 1 });
    w.update(1 / 60);
    expect(w.over).toBe(true);
    expect(w.events.some((e) => e.kind === 'over')).toBe(true);
  });

  it('sectors are announced as you sink', () => {
    const w = new World(2, 7);
    w.camY = SECTOR_LEN - 0.05;
    run(w, 0.5, (x) => { x.energy = 1; x.inv = 9; });
    expect(w.events.some((e) => e.kind === 'sector' && e.text === 'FLORESTA DE ALGAS')).toBe(true);
  });
});

describe('lume trials', () => {
  const begin = (w: World, kind: ChallengeKind) => {
    const any = w as unknown as { order: ChallengeKind[]; startChallenge(y: number): void };
    any.order = [kind];
    any.startChallenge(w.camY + w.H);
  };
  const kinds = (w: World) => w.events.map((e) => e.kind);

  it('a constellation completes when all seven stars are taken', () => {
    const w = new World(2, 11);
    clear(w);
    begin(w, 'constellation');
    expect(w.lights.filter((o) => o.g).length).toBe(7);
    const s0 = w.score;
    for (const o of w.lights) { o.x = w.lume.x; o.y = w.lume.y + 0.01; }
    w.update(1 / 60);
    w.update(1 / 60);
    expect(w.challenge).toBeNull();
    expect(kinds(w)).toContain('win');
    expect(w.score).toBeGreaterThanOrEqual(s0 + 250);
  });

  it('a constellation fails when a star is lost', () => {
    const w = new World(2, 12);
    clear(w);
    begin(w, 'constellation');
    w.lights.splice(0, 1);
    w.update(1 / 60);
    expect(w.challenge).toBeNull();
    expect(kinds(w)).toContain('fail');
  });

  it('the bell needs lights in the tail, then rings, stuns and keeps the tail', () => {
    const w = new World(2, 13);
    clear(w);
    begin(w, 'bell');
    w.lights = [];
    const b = w.bell!;
    b.x = w.lume.x; b.y = w.lume.y;
    w.update(1 / 60);
    expect(kinds(w)).toContain('need');
    expect(b.rung).toBe(false);
    for (let i = 0; i < b.need; i++) w.tail.push({ x: w.lume.x, y: w.lume.y - (i + 1) * LINK });
    w.creatures.push({ kind: 'jelly', x: 0.1, y: w.camY + 1, r: 0.04, x0: 0.1, phase: 0, speed: 1, stun: 0, seed: 0, dir: 1 });
    w.events.length = 0;
    b.y = w.lume.y;
    w.update(1 / 60);
    expect(b.rung).toBe(true);
    expect(kinds(w)).toContain('ring');
    expect(w.creatures[0].stun).toBeGreaterThan(3);
    expect(w.tail.length).toBe(b.need);
  });

  it('the Black Tide drains Lume near the top and is survived by diving', () => {
    const hi = new World(2, 14);
    clear(hi);
    begin(hi, 'tide');
    hi.lume.ty = hi.lume.sy = 0.12;
    hi.energy = 1;
    run(hi, 5, (w) => { w.lume.ty = 0.12; w.creatures = []; w.debris = []; });
    expect(hi.over).toBe(true);

    const lo = new World(2, 14);
    clear(lo);
    begin(lo, 'tide');
    run(lo, TIDE_TIME + 0.5, (w) => { w.lume.ty = 0.75; w.energy = Math.max(w.energy, 0.6); w.creatures = []; w.debris = []; w.lanterns = []; });
    expect(lo.over).toBe(false);
    expect(kinds(lo)).toContain('win');
  });

  it('the firefly can be caught', () => {
    const w = new World(2, 15);
    clear(w);
    begin(w, 'firefly');
    const t0 = w.tail.length;
    run(w, 6, (x) => { if (x.firefly) { x.lume.tx = x.firefly.x; x.lume.ty = (x.firefly.y - x.camY) / x.H; } x.creatures = []; x.debris = []; });
    expect(kinds(w)).toContain('win');
    expect(w.tail.length).toBeGreaterThanOrEqual(t0 + 3);
  });

  it('the leviathan warns on a new sector, then crosses and hurts what it touches', () => {
    const w = new World(2, 16);
    clear(w);
    w.camY = SECTOR_LEN - 0.01;
    w.update(1 / 30);
    expect(w.leviathan).toBeNull(); // the sector's name first
    run(w, 2.6, (x) => { x.lights = []; x.creatures = []; x.debris = []; x.energy = 1; });
    expect(w.leviathan).not.toBeNull();
    const v = w.leviathan!;
    expect(v.warn).toBeGreaterThan(0);
    expect(w.leviathanHit(v.x, v.y, 0.01)).toBe(false); // harmless while it is only a warning
    v.warn = 0;
    v.x = w.lume.x + 0.2 * v.dir;
    expect(w.leviathanHit(w.lume.x, v.y, 0.01)).toBe(true);
  });

  it('a light grabbed with almost nothing left is a close call', () => {
    const w = new World(2, 17);
    clear(w);
    w.energy = 0.05;
    w.lights.push({ x: w.lume.x, y: w.lume.y, phase: 0 });
    w.update(1 / 60);
    expect(kinds(w)).toContain('triz');
  });

  it('trials come up on their own during a run', () => {
    const w = new World(2, 18);
    const seen: string[] = [];
    run(w, 90, (x) => { x.energy = 1; x.inv = 1; for (const e of x.events) if (e.kind === 'challenge') seen.push(e.text!); x.events.length = 0; });
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0]).toBe('constellation');
  });
});
