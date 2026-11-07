import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  laps: number;
  mode: string;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
  music: boolean;
}

export const scores = createScoreStore<HighScore>(
  'virtuaracing.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, laps: typeof e.laps === 'number' ? e.laps : 0, mode: typeof e.mode === 'string' ? e.mode : '', date: String(e.date ?? '') }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'virtuaracing.settings',
  { crt: false, sound: true, music: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false, music: p.music !== false }),
);
