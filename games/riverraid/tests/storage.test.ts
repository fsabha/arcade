import { describe, it, expect } from 'vitest';
import { qualifies, insertHighScore, MAX_HIGH_SCORES, HighScore } from '../src/storage';

const hs = (score: number, initials = 'AAA'): HighScore => ({ initials, score, section: 1, date: `d${score}` });

describe('high scores', () => {
  it('qualifies when the table is not full or beats the last entry', () => {
    expect(qualifies([], 10)).toBe(true);
    expect(qualifies([], 0)).toBe(false);
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(1000 - i * 10));
    expect(qualifies(full, 911)).toBe(true);
    expect(qualifies(full, 910)).toBe(false);
  });

  it('inserts sorted and trims to the maximum', () => {
    const full = Array.from({ length: MAX_HIGH_SCORES }, (_, i) => hs(1000 - i * 10));
    const out = insertHighScore(full, hs(995, 'NEW'));
    expect(out).toHaveLength(MAX_HIGH_SCORES);
    expect(out[1].initials).toBe('NEW');
    expect(out.map((e) => e.score)).toEqual([...out.map((e) => e.score)].sort((a, b) => b - a));
    expect(out.some((e) => e.score === 910)).toBe(false);
  });
});
