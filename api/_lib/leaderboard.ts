/**
 * Global leaderboard rules, independent of the transport: validation, keys and the
 * Redis commands. The HTTP handler in ../scores.ts and the tests use this.
 */
export const GAMES = [
  'riverraid', 'endurance', 'seaquest', 'pacman', 'freeway', 'pitfall', 'frostbite', 'hero', 'asteroids', 'keystone',
  'missile', 'frogger', 'chopper', 'moonpatrol', 'donkeykong', 'goldenaxe', 'streetsofrage', 'virtuaracing', 'cometa', 'lume', 'broto',
] as const;
export type GameId = (typeof GAMES)[number];

export const KEEP = 100; // entries kept per game
export const TOP = 10; // entries returned for one game
export const HOME_TOP = 5; // entries returned per game for the hub
export const MAX_SCORE = 99_999_999;
export const RATE_LIMIT = 12; // submissions per IP per minute

export interface Entry {
  initials: string;
  score: number;
  label: string;
  date: string;
}

export interface Submission {
  game: GameId;
  initials: string;
  score: number;
  label: string;
}

/** Redis commands as arrays, run through a pipeline. */
export type Command = (string | number)[];

export interface Redis {
  pipeline(commands: Command[]): Promise<unknown[]>;
}

export function isGame(id: unknown): id is GameId {
  return typeof id === 'string' && (GAMES as readonly string[]).includes(id);
}

const LABEL_OK = /[^A-Z0-9 .:\-#]/g;

/** Returns a clean submission or a reason to reject it. */
export function validate(raw: unknown): { ok: true; value: Submission } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'corpo invalido' };
  const r = raw as Record<string, unknown>;
  if (!isGame(r.game)) return { ok: false, reason: 'jogo desconhecido' };
  const initials = String(r.initials ?? '').toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 3).trim();
  if (initials.length === 0) return { ok: false, reason: 'iniciais invalidas' };
  const score = Number(r.score);
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { ok: false, reason: 'pontuacao invalida' };
  const label = String(r.label ?? '').toUpperCase().replace(LABEL_OK, '').slice(0, 24).trim();
  return { ok: true, value: { game: r.game, initials: initials.padEnd(3, ' ').trimEnd(), score, label } };
}

export function key(game: GameId): string {
  return `scores:${game}`;
}

export function member(e: Entry): string {
  return `${e.initials}|${e.label}|${e.date}`;
}

export function parseMember(m: string, score: number): Entry {
  const [initials = '', label = '', date = ''] = m.split('|');
  return { initials, score, label, date };
}

/** ZRANGE ... REV WITHSCORES comes back as a flat [member, score, member, score, ...]. */
export function parseRange(flat: unknown): Entry[] {
  if (!Array.isArray(flat)) return [];
  const out: Entry[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push(parseMember(String(flat[i]), Number(flat[i + 1])));
  return out;
}

export async function submit(redis: Redis, s: Submission, ip: string, now = new Date()): Promise<{ ok: true; rank: number } | { ok: false; reason: string; status: number }> {
  const rl = `rl:${ip}`;
  const [count] = await redis.pipeline([['INCR', rl], ['EXPIRE', rl, 60]]);
  if (Number(count) > RATE_LIMIT) return { ok: false, reason: 'muitos envios, tente em um minuto', status: 429 };
  const entry: Entry = { initials: s.initials, score: s.score, label: s.label, date: now.toISOString() };
  const k = key(s.game);
  const [, rank] = await redis.pipeline([
    ['ZADD', k, s.score, member(entry)],
    ['ZREVRANK', k, member(entry)],
    ['ZREMRANGEBYRANK', k, 0, -(KEEP + 1)],
  ]);
  return { ok: true, rank: Number(rank) + 1 };
}

export async function top(redis: Redis, game: GameId, n = TOP): Promise<Entry[]> {
  const [flat] = await redis.pipeline([['ZRANGE', key(game), 0, n - 1, 'REV', 'WITHSCORES']]);
  return parseRange(flat);
}

export async function topAll(redis: Redis, n = HOME_TOP): Promise<Record<GameId, Entry[]>> {
  const results = await redis.pipeline(GAMES.map((g) => ['ZRANGE', key(g), 0, n - 1, 'REV', 'WITHSCORES']));
  const out = {} as Record<GameId, Entry[]>;
  GAMES.forEach((g, i) => { out[g] = parseRange(results[i]); });
  return out;
}

/** Upstash REST client: one POST per pipeline, no dependency. */
export function upstash(url: string, token: string): Redis {
  return {
    async pipeline(commands) {
      const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
      });
      if (!res.ok) throw new Error(`redis ${res.status}`);
      const data = (await res.json()) as { result?: unknown; error?: string }[];
      return data.map((d) => { if (d.error) throw new Error(d.error); return d.result; });
    },
  };
}
