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

const HS_KEY = 'riverraid.highscores';
const ST_KEY = 'riverraid.settings';
export const MAX_HIGH_SCORES = 10;

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function qualifies(list: HighScore[], score: number): boolean {
  if (score <= 0) return false;
  if (list.length < MAX_HIGH_SCORES) return true;
  return score > list[list.length - 1].score;
}

/** Pure: returns a new sorted top-N list containing the entry. */
export function insertHighScore(list: HighScore[], entry: HighScore): HighScore[] {
  const out = [...list, entry].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return out.slice(0, MAX_HIGH_SCORES);
}

export function loadHighScores(): HighScore[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(HS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.score === 'number' && typeof e.initials === 'string')
      .map((e) => ({ initials: String(e.initials).slice(0, 3), score: e.score, section: e.section ?? 1, date: e.date ?? '' }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
  } catch {
    return [];
  }
}

export function saveHighScores(list: HighScore[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(HS_KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode: ignore */
  }
}

export function loadSettings(): Settings {
  const def: Settings = { crt: false, sound: true };
  const s = storage();
  if (!s) return def;
  try {
    const raw = s.getItem(ST_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw);
    return { crt: !!p.crt, sound: p.sound !== false };
  } catch {
    return def;
  }
}

export function saveSettings(st: Settings): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(ST_KEY, JSON.stringify(st));
  } catch {
    /* ignore */
  }
}
