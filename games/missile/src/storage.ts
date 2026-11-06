import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  wave: number;
  /** game variation, e.g. 'J17 B' (empty for entries saved before it existed) */
  mode: string;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
}

export const scores = createScoreStore<HighScore>(
  'missile.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, wave: typeof e.wave === 'number' ? e.wave : 0, mode: typeof e.mode === 'string' ? e.mode : '', date: String(e.date ?? '') }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'missile.settings',
  { crt: false, sound: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false }),
);

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  return scores.beatsTable(list, { initials: '', score, wave: 0, mode: '', date: '' });
}

export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
