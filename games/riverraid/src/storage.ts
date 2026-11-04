import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  section: number;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
}

const scores = createScoreStore<HighScore>(
  'riverraid.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, section: typeof e.section === 'number' ? e.section : 1, date: String(e.date ?? '') }
    : null),
);

const settings = createSettingsStore<Settings>(
  'riverraid.settings',
  { crt: false, sound: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false }),
);

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  return scores.beatsTable(list, { initials: '', score, section: 0, date: '' });
}

/** Pure: returns a new sorted top-N list containing the entry. */
export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
