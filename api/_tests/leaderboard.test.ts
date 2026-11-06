import { describe, it, expect } from 'vitest';
import { validate, submit, top, topAll, parseRange, Redis, Command, KEEP, RATE_LIMIT } from '../_lib/leaderboard';
import { makeHandler, Req, Res } from '../scores';

/** Just enough Redis to run the leaderboard: sorted sets, INCR/EXPIRE. */
function fakeRedis(): Redis & { sets: Map<string, Map<string, number>>; counters: Map<string, number> } {
  const sets = new Map<string, Map<string, number>>();
  const counters = new Map<string, number>();
  const sorted = (k: string) => [...(sets.get(k) ?? new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const run = (c: Command): unknown => {
    const [cmd, k, ...args] = c as [string, string, ...(string | number)[]];
    switch (cmd) {
      case 'INCR': { const n = (counters.get(k) ?? 0) + 1; counters.set(k, n); return n; }
      case 'EXPIRE': return 1;
      case 'ZADD': { const s = sets.get(k) ?? new Map(); s.set(String(args[1]), Number(args[0])); sets.set(k, s); return 1; }
      case 'ZREVRANK': return sorted(k).findIndex(([m]) => m === String(args[0]));
      case 'ZREMRANGEBYRANK': { // only the "0 -(KEEP+1)" form is used: drop everything past the top KEEP
        const s = sets.get(k); if (!s) return 0; const keep = sorted(k).slice(0, KEEP); sets.set(k, new Map(keep)); return 0;
      }
      case 'ZRANGE': { const [start, stop] = [Number(args[0]), Number(args[1])]; return sorted(k).slice(start, stop + 1).flatMap(([m, sc]) => [m, sc]); }
      default: throw new Error(`unsupported ${cmd}`);
    }
  };
  return { sets, counters, async pipeline(commands) { return commands.map(run); } };
}

describe('validate', () => {
  it('cleans initials, label and score; rejects junk', () => {
    expect(validate({ game: 'frogger', initials: 'ab!', score: 1234.0, label: 'nivel 3 <b>' })).toEqual({ ok: true, value: { game: 'frogger', initials: 'AB', score: 1234, label: 'NIVEL 3 B' } });
    expect(validate({ game: 'nope', initials: 'AAA', score: 1 }).ok).toBe(false);
    expect(validate({ game: 'frogger', initials: '', score: 1 }).ok).toBe(false);
    expect(validate({ game: 'frogger', initials: 'AAA', score: -5 }).ok).toBe(false);
    expect(validate({ game: 'frogger', initials: 'AAA', score: 1e12 }).ok).toBe(false);
    expect(validate('x').ok).toBe(false);
  });
});

describe('leaderboard', () => {
  it('stores entries, returns them best first and keeps the top 100', async () => {
    const r = fakeRedis();
    for (let i = 0; i < 120; i++) await submit(r, { game: 'pacman', initials: 'P' + String(i % 10), score: i * 10, label: '' }, `ip${i}`, new Date(2026, 0, 1, 0, 0, i));
    const t = await top(r, 'pacman');
    expect(t).toHaveLength(10);
    expect(t[0].score).toBe(1190);
    expect(t[9].score).toBe(1100);
    expect(r.sets.get('scores:pacman')!.size).toBe(KEEP);
    const all = await topAll(r);
    expect(all.pacman).toHaveLength(5);
    expect(all.frogger).toEqual([]);
  });
  it('reports the rank and rate-limits one IP', async () => {
    const r = fakeRedis();
    expect(await submit(r, { game: 'hero', initials: 'AAA', score: 500, label: 'JOGO 1' }, '1.1.1.1')).toEqual({ ok: true, rank: 1 });
    expect(await submit(r, { game: 'hero', initials: 'BBB', score: 900, label: '' }, '1.1.1.1')).toEqual({ ok: true, rank: 1 });
    expect(await submit(r, { game: 'hero', initials: 'CCC', score: 100, label: '' }, '1.1.1.1')).toEqual({ ok: true, rank: 3 });
    for (let i = 0; i < RATE_LIMIT; i++) await submit(r, { game: 'hero', initials: 'ZZZ', score: 1, label: '' }, '2.2.2.2');
    const blocked = await submit(r, { game: 'hero', initials: 'ZZZ', score: 1, label: '' }, '2.2.2.2');
    expect(blocked.ok).toBe(false);
  });
  it('parses a WITHSCORES range', () => {
    expect(parseRange(['AAA|NIVEL 2|2026-01-01', '300', 'BBB||', 100])).toEqual([
      { initials: 'AAA', score: 300, label: 'NIVEL 2', date: '2026-01-01' }, { initials: 'BBB', score: 100, label: '', date: '' },
    ]);
  });
});

describe('http handler', () => {
  function call(db: Redis | null, req: Partial<Req>): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve) => {
      const res: Res = { statusCode: 200, setHeader() {}, end(b?: string) { resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null }); } };
      void makeHandler(() => db)({ headers: {}, ...req }, res);
    });
  }
  it('503 without storage, 400 on bad input, then stores and lists', async () => {
    expect((await call(null, { method: 'GET', query: { game: 'all' } })).status).toBe(503);
    const r = fakeRedis();
    expect((await call(r, { method: 'GET', query: { game: 'nope' } })).status).toBe(400);
    expect((await call(r, { method: 'POST', body: { game: 'frogger', initials: 'FAB', score: 1500, label: 'NIVEL 2' } })).body).toEqual({ ok: true, rank: 1 });
    expect((await call(r, { method: 'POST', body: JSON.stringify({ game: 'frogger', initials: 'ZZ', score: 900, label: '' }), headers: { 'x-forwarded-for': '9.9.9.9, 1.1.1.1' } })).body).toEqual({ ok: true, rank: 2 });
    const one = await call(r, { method: 'GET', url: '/api/scores?game=frogger' });
    expect((one.body as { entries: unknown[] }).entries).toHaveLength(2);
    const all = await call(r, { method: 'GET', query: { game: 'all' } });
    expect((all.body as { games: Record<string, unknown[]> }).games.frogger).toHaveLength(2);
    expect((await call(r, { method: 'DELETE' })).status).toBe(405);
  });
});
