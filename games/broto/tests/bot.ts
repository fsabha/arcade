/** Bots that play BROTO, for balance tests: passive (holds the stream in the middle), random, skilled. */
import { World, BASE_GIFTS, type Gifts, type Hazard } from '../src/world';
import { LEVELS } from '../src/levels';

export type BotKind = 'passive' | 'random' | 'skilled';

function danger(w: World, h: Hazard, x: number): number {
  const sy = w.sowerY;
  if (h.kind === 'drop') {
    const eta = h.warn + Math.max(0, (sy - h.y) / h.vy);
    if (eta > 1.6 || h.y > sy + 0.06) return 0;
    return Math.abs(x - h.x) < h.w / 2 + 0.06 ? 3 - eta : 0;
  }
  if (h.kind === 'band') {
    // where the gaps will be when it strikes
    const gaps = h.gaps.map((g) => Math.max(0.14, Math.min(0.86, g + h.gapV * Math.min(0.5, Math.max(0, h.warn)))));
    return gaps.some((g) => Math.abs(x - g) < h.gapW / 2 - 0.04) ? 0 : 3;
  }
  if (h.kind === 'wall') {
    const eta = h.warn + Math.max(0, (sy - h.y) / h.vy);
    if (eta > 1.6 || h.y > sy) return 0;
    return h.gaps.some((g) => Math.abs(x - g) < h.gapW / 2 - 0.04) ? 0 : 2.5;
  }
  return 0;
}

function bestGateColumn(w: World): number {
  let best = 0.5, bv = -1;
  for (let x = 0.1; x <= 0.9; x += 0.02) {
    let v = 1;
    for (const g of w.gates) {
      if (g.gone || Math.abs(x - g.cx) >= g.w / 2 || (g.uses !== undefined && g.used >= g.uses)) continue;
      const op = w.winter > 0 && g.op === 'mul' ? 'div' : g.op;
      v *= op === 'mul' ? g.n : op === 'well' ? (Math.abs(x - g.cx) < g.w * 0.15 ? g.n : 1) : op === 'add' ? 1.4 : op === 'div' ? 0.5 : g.left > 0 ? 0.7 : 1;
    }
    if (w.stones.some((s) => Math.abs(x - s.x) < s.w / 2 + 0.02)) v = 0;
    if (v > bv + 1e-6) { bv = v; best = x; }
  }
  return best;
}

/** One decision per tick. */
export function drive(w: World, kind: BotKind, t: number, state: { fireUntil: number; aimAt: number; resting: boolean }): void {
  const b = w.boss;
  if (kind === 'passive') { w.aim(0.5); w.sower.firing = true; return; }
  if (kind === 'random') {
    if (t >= state.aimAt) { state.aimAt = t + 0.5; w.aim(0.1 + Math.random() * 0.8); state.resting = Math.random() < 0.3; }
    w.sower.firing = !state.resting;
    return;
  }
  // skilled: where to be
  let want = bestGateColumn(w);
  // ash about to reach the bottom comes first
  let low = -1, lowY = w.laneY(0.55);
  for (let i = 0; i < w.ash.n; i++) if (w.ash.y[i] > lowY) { lowY = w.ash.y[i]; low = i; }
  if (low >= 0) want = w.ash.x[low];
  if (w.trial?.kind === 'race' && low < 0) { const c = w.trial.targets.find((q) => q.hp > 0); if (c) want = c.x; }
  if (w.trial?.kind === 'protect' && low < 0) want = w.trial.targets[0].x;
  if (b && w.phase === 'boss') {
    want = b.x;
    if (b.id === 4) { const p = b.parts.find((q) => q.hp > 0); if (p) want = p.x; }
    if (b.id === 5 && b.mouth > 0) want = b.x;
  }
  // dodge: the safest spot near where it wants to be
  let bestX = want, bestScore = Infinity;
  for (let x = 0.08; x <= 0.92; x += 0.02) {
    let d = 0;
    for (const h of w.hazards) d += danger(w, h, x);
    for (let i = 0; i < w.ash.n; i++) if (w.ash.seen[i] === 1 && w.ash.y[i] > w.bottom - 0.4 && Math.abs(w.ash.x[i] + w.ash.vx[i] * ((w.sowerY - w.ash.y[i]) / Math.max(0.1, w.ash.vy[i])) - x) < 0.05) d += 0.5;
    const score = d * 10 + Math.abs(x - want) + Math.abs(x - w.sower.tx) * 0.6;
    if (score < bestScore) { bestScore = score; bestX = x; }
  }
  w.aim(bestX);
  // when to fire
  let fire = true;
  if (b && w.phase === 'boss') {
    if (b.mirror > 0 || b.contract > 0 || b.shell > 0 || (b.tell > 0 && (b.id === 2 || b.id === 9))) fire = false;
    if (b.id === 7) fire = b.open > 0 || b.diving <= 0; // bait a dive, dodge it, strike while its eyes are lit
    if (b.id === 9 && b.hp <= b.max * 0.1) { fire = false; w.sprout(); }
  } else if (w.sproutReady && w.ash.n > 40) w.sprout();
  if (b && b.id !== 9 && w.sproutReady && w.phase === 'boss') w.sprout();
  // pulses: never run dry
  if (w.sap < 25) state.resting = true;
  if (state.resting && w.sap > 55) state.resting = false;
  w.sower.firing = fire && !state.resting;
}

export interface RunResult { reached: number; won: boolean; petalsLost: number[]; bossTimes: number[]; trialsWon: number; leaks: number[]; struck: number[]; bossLeaks: number[] }

export function campaign(kind: BotKind, seed: number): RunResult {
  let petals = 3;
  const gifts: Gifts = { ...BASE_GIFTS };
  const res: RunResult = { reached: 0, won: false, petalsLost: [], bossTimes: [], trialsWon: 0, leaks: [], struck: [], bossLeaks: [] };
  let rs = seed;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < LEVELS.length; k++) {
    res.reached = k + 1;
    const w = new World(1.9, LEVELS[k], petals, gifts, seed * 31 + k);
    const st = { fireUntil: 0, aimAt: 0, resting: false };
    let t = 0, bossT = -1, leaks = 0, struck = 0, bossLeaks = 0;
    while (!w.done && t < 400) {
      drive(w, kind, t, st);
      const before = w.petalHp;
      w.update(1 / 30); t += 1 / 30;
      if (w.phase === 'boss' && bossT < 0) bossT = t;
      let s1 = 0;
      for (const e of w.events) { if (e.kind === 'trialEnd' && e.value) res.trialsWon++; if (e.kind === 'struck') s1 += e.value; }
      struck += s1;
      const lost = Math.max(0, before - w.petalHp - s1);
      if (w.phase === 'boss') bossLeaks += lost; else leaks += lost;
      w.events.length = 0;
    }
    res.petalsLost.push(petals - Math.max(0, w.petals));
    res.leaks.push(leaks); res.struck.push(struck); res.bossLeaks.push(bossLeaks);
    if (bossT >= 0) res.bossTimes.push(t - bossT);
    if (w.done !== 'win') return res;
    petals = w.petals;
    // a gift: petals when hurt, else sap or rate
    const r = rnd();
    if (petals < 3 && r < 0.5) petals++;
    else if (r < 0.7) gifts.rate *= 1.15;
    else if (r < 0.85) gifts.sap += 30;
    else gifts.pollen *= 2;
  }
  res.won = true;
  return res;
}
