import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  course: number;
  /** course chosen at the start: 'INICIANTE' or 'CAMPEAO' ('' for entries from before it was recorded) */
  mode: string;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
}

export const scores = createScoreStore<HighScore>(
  'moonpatrol.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? {
      initials: initialsString(e.initials), score: e.score, course: typeof e.course === 'number' ? e.course : 0,
      mode: typeof e.mode === 'string' ? e.mode : '', date: String(e.date ?? ''),
    }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'moonpatrol.settings',
  { crt: false, sound: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false }),
);

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  return scores.beatsTable(list, { initials: '', score, course: 0, mode: '', date: '' });
}

export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
