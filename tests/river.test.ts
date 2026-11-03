import { describe, it, expect } from 'vitest';
import { River, difficulty, channelsOf, SPAWN_SIZE } from '../src/river';
import {
  W, SECTION_LEN, BANK_MARGIN, MIN_CHANNEL, BRIDGE_WIDTH, BRIDGE_Y_FROM_END, KEY_STEP,
} from '../src/config';

const SECTIONS = 6;
const EPS = 1e-6;

describe('River generation', () => {
  it('is deterministic for a given seed', () => {
    const a = new River(42);
    const b = new River(42);
    a.ensure(SECTIONS * SECTION_LEN);
    b.ensure(SECTIONS * SECTION_LEN);
    expect(JSON.stringify(a.sections)).toBe(JSON.stringify(b.sections));
    for (let y = 0; y < SECTIONS * SECTION_LEN; y += 7) {
      expect(a.rowAt(y)).toEqual(b.rowAt(y));
    }
  });

  it('differs across seeds', () => {
    const a = new River(1);
    const b = new River(2);
    a.ensure(SECTION_LEN);
    b.ensure(SECTION_LEN);
    expect(JSON.stringify(a.sections[0].spawns)).not.toBe(JSON.stringify(b.sections[0].spawns));
  });

  it('keeps sections contiguous and bridges at the end of each section', () => {
    const r = new River(7);
    r.ensure(SECTIONS * SECTION_LEN);
    for (let i = 0; i < SECTIONS; i++) {
      const s = r.sections[i];
      expect(s.index).toBe(i);
      expect(s.startY).toBe(i * SECTION_LEN);
      expect(s.endY).toBe((i + 1) * SECTION_LEN);
      const bridges = s.spawns.filter((sp) => sp.kind === 'bridge');
      expect(bridges).toHaveLength(1);
      expect(bridges[0].y).toBe(s.endY - BRIDGE_Y_FROM_END);
      expect(bridges[0].x).toBe(W / 2 - BRIDGE_WIDTH / 2);
    }
  });

  it('keeps banks inside the screen with the minimum width and channel constraints', () => {
    const r = new River(2024);
    r.ensure(SECTIONS * SECTION_LEN);
    for (let y = 0; y < SECTIONS * SECTION_LEN; y++) {
      const row = r.rowAt(y);
      const d = difficulty(Math.floor(y / SECTION_LEN));
      expect(row.left).toBeGreaterThanOrEqual(BANK_MARGIN - EPS);
      expect(row.right).toBeLessThanOrEqual(W - BANK_MARGIN + EPS);
      const minW = Math.min(d.minWidth, BRIDGE_WIDTH);
      expect(row.right - row.left).toBeGreaterThanOrEqual(minW - EPS);
      if (row.island) {
        expect(row.island[0] - row.left).toBeGreaterThanOrEqual(MIN_CHANNEL - 1);
        expect(row.right - row.island[1]).toBeGreaterThanOrEqual(MIN_CHANNEL - 1);
      }
    }
  });

  it('narrows the river to bridge width around every bridge', () => {
    const r = new River(5);
    r.ensure(SECTIONS * SECTION_LEN);
    // snapshot: rowAt past the last section generates more sections while iterating
    for (const s of r.sections.slice(0, SECTIONS)) {
      for (let y = s.endY - 2 * KEY_STEP; y <= s.endY + KEY_STEP; y++) {
        const row = r.rowAt(y);
        expect(row.right - row.left).toBeCloseTo(BRIDGE_WIDTH, 6);
        expect((row.left + row.right) / 2).toBeCloseTo(W / 2, 6);
        expect(row.island).toBeNull();
      }
    }
  });

  it('places water spawns inside a channel wide enough for them, sorted by y', () => {
    const r = new River(314);
    r.ensure(SECTIONS * SECTION_LEN);
    for (const s of r.sections) {
      let lastY = -Infinity;
      for (const sp of s.spawns) {
        expect(sp.y).toBeGreaterThanOrEqual(lastY);
        lastY = sp.y;
        expect(sp.section).toBe(s.index);
        expect([sp.w, sp.h]).toEqual(SPAWN_SIZE[sp.kind]);
        if (sp.kind === 'jet' || sp.kind === 'bridge') continue;
        const row = r.rowAt(sp.y + sp.h / 2);
        const inside = channelsOf(row).some((c) => sp.x >= c.left && sp.x + sp.w <= c.right);
        expect(inside).toBe(true);
      }
    }
  });

  it('gets harder: narrower river, more and faster enemies', () => {
    const d0 = difficulty(0);
    const d5 = difficulty(5);
    expect(d5.minWidth).toBeLessThan(d0.minWidth);
    expect(d5.enemies).toBeGreaterThan(d0.enemies);
    expect(d5.enemySpeed).toBeGreaterThan(d0.enemySpeed);
    expect(d5.movingChance).toBeGreaterThan(d0.movingChance);
    expect(difficulty(100).minWidth).toBeGreaterThanOrEqual(60);
  });

  it('leaves the first screen of section 0 free of enemies', () => {
    const r = new River(11);
    r.ensure(SECTION_LEN);
    const early = r.sections[0].spawns.filter((sp) => sp.y < 320);
    expect(early).toHaveLength(0);
  });

  it('generates lazily on demand via rowAt/sectionAt', () => {
    const r = new River(3);
    expect(r.sections).toHaveLength(0);
    r.rowAt(10);
    expect(r.sections.length).toBeGreaterThanOrEqual(1);
    expect(r.sectionAt(SECTION_LEN * 3 + 5).index).toBe(3);
  });
});
