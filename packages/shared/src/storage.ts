export const MAX_HIGH_SCORES = 10;

export interface ScoreEntry {
  initials: string;
  date: string;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: ignore */
  }
}

/**
 * A top-N table in localStorage. `compare` orders best first (negative = a beats b);
 * `sanitize` turns a raw stored object into an entry or null to drop it.
 */
export function createScoreStore<T extends ScoreEntry>(
  key: string,
  compare: (a: T, b: T) => number,
  sanitize: (raw: Record<string, unknown>) => T | null,
) {
  const order = (a: T, b: T) => compare(a, b) || a.date.localeCompare(b.date);
  return {
    load(): T[] {
      const parsed = readJson(key);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((e) => (e && typeof e === 'object' ? sanitize(e as Record<string, unknown>) : null))
        .filter((e): e is T => e !== null)
        .sort(order)
        .slice(0, MAX_HIGH_SCORES);
    },
    save(list: T[]): void {
      writeJson(key, list);
    },
    /** Pure: returns a new sorted top-N list containing the entry. */
    insert(list: T[], entry: T): T[] {
      return [...list, entry].sort(order).slice(0, MAX_HIGH_SCORES);
    },
    /** Would `probe` enter the table? (the caller decides what counts as a zero result) */
    beatsTable(list: T[], probe: T): boolean {
      if (list.length < MAX_HIGH_SCORES) return true;
      return compare(probe, list[list.length - 1]) < 0;
    },
  };
}

export function initialsString(raw: unknown): string {
  return String(raw ?? '').slice(0, 3);
}

/** Persisted settings with defaults; `sanitize` maps a raw object onto the typed shape. */
export function createSettingsStore<S>(key: string, defaults: S, sanitize: (raw: Record<string, unknown>, def: S) => S) {
  return {
    load(): S {
      const parsed = readJson(key);
      if (!parsed || typeof parsed !== 'object') return { ...defaults };
      return sanitize(parsed as Record<string, unknown>, defaults);
    },
    save(value: S): void {
      writeJson(key, value);
    },
  };
}
