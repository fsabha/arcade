import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  level: number;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
  music: boolean;
}

export const scores = createScoreStore<HighScore>(
  'donkeykong.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, level: typeof e.level === 'number' ? e.level : 0, date: String(e.date ?? '') }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'donkeykong.settings',
  { crt: false, sound: true, music: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false, music: p.music !== false }),
);

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  return scores.beatsTable(list, { initials: '', score, level: 0, date: '' });
}

export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
