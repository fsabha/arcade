import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  krooks: number;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
}

const scores = createScoreStore<HighScore>(
  'keystone.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, krooks: typeof e.krooks === 'number' ? e.krooks : 0, date: String(e.date ?? '') }
    : null),
);

const settings = createSettingsStore<Settings>(
  'keystone.settings',
  { crt: false, sound: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false }),
);

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  return scores.beatsTable(list, { initials: '', score, krooks: 0, date: '' });
}

export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
