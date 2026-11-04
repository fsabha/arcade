import { describe, it, expect } from 'vitest';
import { createScoreStore, createSettingsStore, MAX_HIGH_SCORES } from '../src/storage';

interface E { initials: string; score: number; date: string }
const store = createScoreStore<E>('t.scores', (a, b) => b.score - a.score, (e) => (typeof e.score === 'number' ? { initials: String(e.initials), score: e.score, date: String(e.date ?? '') } : null));
const hs = (score: number, initials = 'AAA'): E => ({ initials, score, date: `d${score}` });

describe('shared score store', () => {
  it('beatsTable when not full or better than the last', () => {
    expect(store.beatsTable([], hs(1))).toBe(true);
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(1000 - i * 10));
    expect(store.beatsTable(full, hs(911))).toBe(true);
    expect(store.beatsTable(full, hs(910))).toBe(false);
  });
  it('insert keeps the table sorted and trimmed', () => {
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(1000 - i * 10));
    const out = store.insert(full, hs(995, 'NEW'));
    expect(out).toHaveLength(MAX_HIGH_SCORES);
    expect(out[1].initials).toBe('NEW');
  });
  it('load/save survive without localStorage', () => {
    expect(store.load()).toEqual([]);
    expect(() => store.save([hs(1)])).not.toThrow();
    const st = createSettingsStore('t.settings', { crt: false }, (p, d) => ({ crt: typeof p.crt === 'boolean' ? p.crt : d.crt }));
    expect(st.load()).toEqual({ crt: false });
  });
});
