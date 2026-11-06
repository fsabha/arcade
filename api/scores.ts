/**
 * Global leaderboard (Vercel Function, Node runtime, Web Request/Response).
 *   GET  /api/scores?game=<id>   -> { entries: [...] }            top 10 of one game
 *   GET  /api/scores?game=all    -> { games: { <id>: [...] } }    top 5 of every game, for the hub
 *   POST /api/scores { game, initials, score, label } -> { ok, rank }
 * Storage: Upstash Redis through its REST API (Vercel Marketplace integration sets the env vars).
 */
import { isGame, validate, submit, top, topAll, upstash, Redis } from './_lib/leaderboard';

declare const process: { env: Record<string, string | undefined> };

function redis(): Redis | null {
  const env = process.env;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return upstash(url, token);
}

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}

export async function GET(req: Request): Promise<Response> {
  const db = redis();
  if (!db) return json({ error: 'ranking global nao configurado' }, 503);
  const game = new URL(req.url).searchParams.get('game');
  try {
    if (game === 'all') return json({ games: await topAll(db) }, 200, { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' });
    if (!isGame(game)) return json({ error: 'jogo desconhecido' }, 400);
    return json({ entries: await top(db, game) }, 200, { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502);
  }
}

export async function POST(req: Request): Promise<Response> {
  const db = redis();
  if (!db) return json({ error: 'ranking global nao configurado' }, 503);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'json invalido' }, 400); }
  const v = validate(body);
  if (!v.ok) return json({ error: v.reason }, 400);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  try {
    const r = await submit(db, v.value, ip);
    if (!r.ok) return json({ error: r.reason }, r.status);
    return json({ ok: true, rank: r.rank });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502);
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
