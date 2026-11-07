import { describe, it, expect } from 'vitest';
import { World, LINK, LOOSE_TIME, SECTOR_LEN, MEMORIES } from '../src/world';

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
