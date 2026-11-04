import { describe, it, expect } from 'vitest';
import { qualifies, insertHighScore, compareScores, MAX_HIGH_SCORES, HighScore } from '../src/storage';

const hs = (day: number, km: number, initials = 'AAA'): HighScore => ({ initials, day, km, date: `d${day}-${km}` });

describe('high scores', () => {
  it('orders by day first, then km', () => {
    expect(compareScores({ day: 2, km: 1 }, { day: 1, km: 99 })).toBeLessThan(0);
    expect(compareScores({ day: 2, km: 5 }, { day: 2, km: 9 })).toBeGreaterThan(0);
    expect(compareScores({ day: 2, km: 5 }, { day: 2, km: 5 })).toBe(0);
  });

  it('qualifies when the table is not full or beats the last entry', () => {
    expect(qualifies([], 1, 3)).toBe(true);
    expect(qualifies([], 1, 0)).toBe(false);
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(3, 100 - i * 5));
    expect(qualifies(full, 3, 56)).toBe(true);
    expect(qualifies(full, 3, 55)).toBe(false);
    expect(qualifies(full, 4, 1)).toBe(true);
  });

  it('inserts sorted and trims to the maximum', () => {
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(2, 100 - i * 5));
    const out = insertHighScore(full, hs(2, 97, 'NEW'));
    expect(out).toHaveLength(MAX_HIGH_SCORES);
    expect(out[1].initials).toBe('NEW');
    expect(out.some((e) => e.km === 55)).toBe(false);
    const top = insertHighScore(out, hs(3, 1, 'TOP'));
    expect(top[0].initials).toBe('TOP');
  });
});
