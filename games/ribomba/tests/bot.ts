/** Bots that play RIBOMBA, for balance tests: passive (sits in the middle), random, skilled. */
import { World, BASE_GIFTS, BASE_KIT, type Gifts, type Kit, type Hazard } from '../src/world';
import { LEVELS } from '../src/levels';

export type BotKind = 'passive' | 'random' | 'skilled';

function danger(w: World, h: Hazard, x: number): number {
  const cy = w.cannonY;
  if (h.kind === 'drop') {
    const eta = h.warn + Math.max(0, (cy - h.y) / h.vy);
    if (eta > 1.5 || h.y > cy + 0.06) return 0;
    return Math.abs(x - h.x) < h.w / 2 + 0.06 ? 3 - eta : 0;
  }
  if (h.kind === 'beam') return Math.abs(x - h.x) < h.w / 2 + 0.05 ? 3 : 0;
  if (h.kind === 'band') {
    const gaps = h.gaps.map((g) => Math.max(0.14, Math.min(0.86, g + h.gapV * Math.min(0.5, Math.max(0, h.warn)))));
    return gaps.some((g) => Math.abs(x - g) < h.gapW / 2 - 0.04) ? 0 : 3;
  }
  const eta = h.warn + Math.max(0, (cy - h.y) / h.vy);
  if (eta > 1.4 || h.y > cy) return 0;
  const gaps = h.gaps.map((g) => Math.max(0.14, Math.min(0.86, g + h.gapV * eta)));
  return gaps.some((g) => Math.abs(x - g) < h.gapW / 2 - 0.04) ? 0 : 2.5;
}

/** How good a column is for the soldiers fired from it (gates multiply, crates eat). */
function columnValue(w: World, x: number): number {
  let v = 1;
  for (const b of w.blocks) {
    if (b.gone || Math.abs(x - b.cx) >= b.w / 2 - 0.02) continue;
    if (b.kind === 'mul') v *= b.n;
    else if (b.kind === 'add') v *= 1.5;
    else v *= b.up ? (b.left < 60 ? 0.8 : 0.3) : 0.05;
  }
  return v;
}

export function drive(w: World, kind: BotKind, t: number, st: { aimAt: number; x: number }): void {
  if (kind === 'passive') { w.aim(0.5); return; }
  if (kind === 'random') {
    if (t >= st.aimAt) { st.aimAt = t + 0.6; st.x = 0.1 + Math.random() * 0.8; }
    w.aim(st.x);
    return;
  }
  // skilled: cover the reds that are coming, through the best gates
  let want = w.cannon.tx;
  const b = w.boss;
  const R = w.red;
  if (R.n > 0) {
    // the weighted centre of the lowest reds
    let sx = 0, sw = 0;
    for (let i = 0; i < R.n; i++) {
      const k = Math.max(0, (R.y[i] - w.top) / w.laneLen);
      const wt = k * k * k;
      sx += R.x[i] * wt; sw += wt;
    }
    if (sw > 0) want = sx / sw;
  } else if (b && w.phase === 'boss') {
    want = b.open > 0 || b.always ? b.x + b.weakDx : b.x + (b.x < 0.5 ? 1 : -1) * (b.def.armor + 0.05);
  } else want = w.mouth;
  // a little search for better gates near where it wants to be
  let bestX = want, best = -Infinity;
  for (let x = 0.07; x <= 0.93; x += 0.02) {
    let d = 0;
    for (const h of w.hazards) d += danger(w, h, x);
    const reach = Math.abs(x - want);
    const s = -d * 10 - reach * (R.n > 0 ? 6 : 3) + Math.log(columnValue(w, x)) * 0.5 - Math.abs(x - w.cannon.tx) * 0.3;
    if (s > best) { best = s; bestX = x; }
  }
  w.aim(bestX);
}

export interface RunResult { reached: number; won: boolean; lost: number[]; bossTimes: number[]; trialsWon: number; breaches: number[]; blows: number[] }

export function campaign(kind: BotKind, seed: number, from = 0): RunResult {
  let lives = 3;
  const gifts: Gifts = { ...BASE_GIFTS };
  let kit: Kit = { ...BASE_KIT };
  const res: RunResult = { reached: 0, won: false, lost: [], bossTimes: [], trialsWon: 0, breaches: [], blows: [] };
  let rs = seed;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  for (let k = from; k < LEVELS.length; k++) {
    res.reached = k + 1;
    const w = new World(1.9, LEVELS[k], lives, gifts, kit, seed * 31 + k);
    const st = { aimAt: 0, x: 0.5 };
    let t = 0, bossT = -1, br = 0, bl = 0;
    while (!w.done && t < 500) {
      drive(w, kind, t, st);
      w.update(1 / 30); t += 1 / 30;
      if (w.phase === 'boss' && bossT < 0) bossT = t;
      for (const e of w.events) {
        if (e.kind === 'trialEnd' && e.value) res.trialsWon++;
        if (e.kind === 'struck') { if (e.text === 'breach') br++; else bl++; }
      }
      w.events.length = 0;
    }
    res.lost.push(lives - w.lives);
    res.breaches.push(br); res.blows.push(bl);
    if (bossT >= 0) res.bossTimes.push(Math.round(t - bossT));
    if (w.done !== 'win') return res;
    lives = w.lives;
    kit = w.kit;
    const r = rnd();
    if (lives < 3 && r < 0.5) lives++;
    else if (r < 0.7) kit = { ...kit, barrels: Math.min(4, kit.barrels + 1) };
    else if (r < 0.85) gifts.weak *= 1.5;
    else gifts.river *= 0.9;
  }
  res.won = true;
  return res;
}
