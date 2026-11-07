import { createScoreStore, createSettingsStore, initialsString, MAX_HIGH_SCORES } from '@arcade/shared';

export { MAX_HIGH_SCORES };

export interface HighScore {
  initials: string;
  score: number;
  stage: number;
  mode: string;
  date: string;
}

export interface Settings {
  crt: boolean;
  sound: boolean;
  music: boolean;
}

export const scores = createScoreStore<HighScore>(
  'goldenaxe.highscores',
  (a, b) => b.score - a.score,
  (e) => (typeof e.score === 'number' && typeof e.initials === 'string'
    ? { initials: initialsString(e.initials), score: e.score, stage: typeof e.stage === 'number' ? e.stage : 0, mode: typeof e.mode === 'string' ? e.mode : '', date: String(e.date ?? '') }
    : null),
);

export const settings = createSettingsStore<Settings>(
  'goldenaxe.settings',
  { crt: false, sound: true, music: true },
  (p) => ({ crt: !!p.crt, sound: p.sound !== false, music: p.music !== false }),
);
