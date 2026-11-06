import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  day: number;
  km: number;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
}

/** Higher day wins; same day, more km wins. */
export function compareScores(a: { day: number; km: number }, b: { day: number; km: number }): number {
  return b.day - a.day || b.km - a.km;
}

export const scores = createScoreStore<HighScore>(
  'endurance.highscores',
  compareScores,
  (e) => (typeof e.day === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), day: e.day, km: Number(e.km) || 0, date: String(e.date ?? '') }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'endurance.settings',
  { crt: false, sound: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false }),
);

export function qualifies(list: HighScore[], day: number, km: number): boolean {
  if (km <= 0 && day <= 1) return false;
  return scores.beatsTable(list, { initials: '', day, km, date: '' });
}

/** Pure: returns a new sorted top-N list containing the entry. */
export const insertHighScore = scores.insert;
export const loadHighScores = scores.load;
export const saveHighScores = scores.save;
export const loadSettings = settings.load;
export const saveSettings = settings.save;
