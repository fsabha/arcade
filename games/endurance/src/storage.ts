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

const HS_KEY = 'endurance.highscores';
const ST_KEY = 'endurance.settings';
export const MAX_HIGH_SCORES = 10;

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Higher day wins; same day, more km wins. */
export function compareScores(a: { day: number; km: number }, b: { day: number; km: number }): number {
  return b.day - a.day || b.km - a.km;
}

export function qualifies(list: HighScore[], day: number, km: number): boolean {
  if (km <= 0 && day <= 1) return false;
  if (list.length < MAX_HIGH_SCORES) return true;
  return compareScores({ day, km }, list[list.length - 1]) < 0;
}

/** Pure: returns a new sorted top-N list containing the entry. */
export function insertHighScore(list: HighScore[], entry: HighScore): HighScore[] {
  const out = [...list, entry].sort((a, b) => compareScores(a, b) || a.date.localeCompare(b.date));
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
      .filter((e) => e && typeof e.day === 'number' && typeof e.initials === 'string')
      .map((e) => ({ initials: String(e.initials).slice(0, 3), day: e.day, km: Number(e.km) || 0, date: e.date ?? '' }))
      .sort(compareScores)
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
