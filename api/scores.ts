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

function redis(): Redis | null {
  const env = process.env;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return upstash(url, token);
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
