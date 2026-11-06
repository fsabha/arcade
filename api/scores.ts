/**
 * Global leaderboard (Vercel Function, Node runtime).
 *   GET  /api/scores?game=<id>   -> { entries: [...] }            top 10 of one game
 *   GET  /api/scores?game=all    -> { games: { <id>: [...] } }    top 5 of every game, for the hub
 *   POST /api/scores { game, initials, score, label } -> { ok, rank }
 * Storage: Upstash Redis through its REST API (Vercel Marketplace integration sets the env vars).
 */
import { isGame, validate, submit, top, topAll, upstash, Redis } from './_lib/leaderboard.js';

declare const process: { env: Record<string, string | undefined> };

/** The subset of Vercel's Node request/response we use (no @vercel/node dependency). */
export interface Req {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}
export interface Res {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

/** Finds the Upstash REST credentials whatever prefix the Vercel integration chose (KV_, UPSTASH_REDIS_, STORAGE_...). */
export function findCredentials(env: Record<string, string | undefined>): { url: string; token: string } | null {
  const direct = [
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ];
  for (const [u, t] of direct) if (env[u] && env[t]) return { url: env[u]!, token: env[t]! };
  for (const name of Object.keys(env)) {
    const m = /^(.*)REST_(API_)?URL$/.exec(name);
    if (!m || !env[name] || !/^https?:\/\//.test(env[name]!)) continue;
    const token = env[`${m[1]}REST_${m[2] ?? ''}TOKEN`];
    if (token) return { url: env[name]!, token };
  }
  return null;
}

function redis(): Redis | null {
  const c = findCredentials(process.env);
  return c ? upstash(c.url, c.token) : null;
}

/** Names (never values) of the storage-looking env vars, to debug the integration. */
function health(): unknown {
  const names = Object.keys(process.env).filter((k) => /REDIS|KV_|UPSTASH|STORAGE/i.test(k)).sort();
  return { configured: !!findCredentials(process.env), vars: names };
}

function send(res: Res, status: number, body: unknown, cache = 'no-store'): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseBody(req: Req): unknown {
  if (req.body === undefined || req.body === null) return null;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  return req.body;
}

/** Builds the handler around a Redis factory, so tests can inject a fake. */
export function makeHandler(getDb: () => Redis | null) {
  return async function handler(req: Req, res: Res): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'OPTIONS') { send(res, 204, null); return; }
  const wanted = first(req.query?.game) ?? new URL(req.url ?? '/', 'http://x').searchParams.get('game');
  if (method === 'GET' && wanted === 'health') { send(res, 200, health()); return; }
  const db = getDb();
  if (!db) { send(res, 503, { error: 'ranking global nao configurado' }); return; }
  try {
    if (method === 'GET') {
      const game = first(req.query?.game) ?? new URL(req.url ?? '/', 'http://x').searchParams.get('game');
      if (game === 'all') { send(res, 200, { games: await topAll(db) }, 's-maxage=30, stale-while-revalidate=120'); return; }
      if (!isGame(game)) { send(res, 400, { error: 'jogo desconhecido' }); return; }
      send(res, 200, { entries: await top(db, game) }, 's-maxage=15, stale-while-revalidate=60');
      return;
    }
    if (method === 'POST') {
      const v = validate(parseBody(req));
      if (!v.ok) { send(res, 400, { error: v.reason }); return; }
      const ip = (first(req.headers['x-forwarded-for']) ?? '').split(',')[0].trim() || first(req.headers['x-real-ip']) || 'anon';
      const r = await submit(db, v.value, ip);
      if (!r.ok) { send(res, r.status, { error: r.reason }); return; }
      send(res, 200, { ok: true, rank: r.rank });
      return;
    }
    send(res, 405, { error: 'metodo nao permitido' });
  } catch (e) {
    send(res, 502, { error: String((e as Error).message ?? e) });
  }
  };
}

export default makeHandler(redis);
