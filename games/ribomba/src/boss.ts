/**
 * The Red King's captains (design: Lúcio). Each comes down when the river runs dry, sways above
 * the canyon and attacks where the cannon IS (standing still means taking every blow). Every
 * attack is announced by a red telegraph first. Soldiers that reach the captain hurt it: the armour
 * plate in the middle takes a fifth, the weak point (when it shows) takes triple. Below 30% of its
 * health a captain goes into a fury and attacks faster and harder.
 */
import type { World } from './world';

export interface BossDef {
  name: string;
  epithet: string;
  hp: number;
  /** half-width of the body (field units), the armour plate in the middle, the weak point */
  r: number;
  armor: number;
  weakR: number;
  /** extra multiplier on the weak point (the wind-up key takes ×4) */
  weakBonus?: number;
  sway: number;
  /** seconds between attacks */
  period: number;
}

export const BOSSES: BossDef[] = [
  { name: 'TAMBOR-MOR', epithet: 'o tambor que marca o passo do Rei', hp: 1500, r: 0.19, armor: 0.06, weakR: 0.075, sway: 0.12, period: 2.9 },
  { name: 'CORNETEIRO', epithet: 'quando ele toca, o exército responde', hp: 3200, r: 0.17, armor: 0.06, weakR: 0.07, sway: 0.16, period: 3 },
  { name: 'PIÃO', epithet: 'gira, risca, ricocheteia', hp: 5000, r: 0.14, armor: 0, weakR: 0.07, sway: 0.28, period: 2.8 },
  { name: 'TORRE DE BLOCOS', epithet: 'cinco blocos, um olho', hp: 7500, r: 0.16, armor: 0, weakR: 0.07, sway: 0.1, period: 2.8 },
  { name: 'BALÃO DE GUERRA', epithet: 'bombas do céu', hp: 10500, r: 0.2, armor: 0.07, weakR: 0.07, sway: 0.24, period: 3.2 },
  { name: 'TANQUE DE CORDA', epithet: 'esteira, obus e uma chave que gira', hp: 14000, r: 0.2, armor: 0.07, weakR: 0.07, weakBonus: 1, sway: 0.14, period: 2.8 },
  { name: 'CAVALEIRO DE PAU', epithet: 'a carga do cavalo de madeira', hp: 18000, r: 0.17, armor: 0.05, weakR: 0.07, sway: 0.2, period: 2.8 },
  { name: 'REI RUBRO', epithet: 'o dono do exército vermelho', hp: 26000, r: 0.2, armor: 0.07, weakR: 0.08, sway: 0.15, period: 3 },
];

interface Timed { at: number; fn: () => void }

export interface Boss {
  id: number;
  def: BossDef;
  x: number;
  y: number;
  hp: number;
  max: number;
  t: number;
  cd: number;
  step: number;
  /** the weak point shows while open > 0 (some captains always show it) */
  open: number;
  always: boolean;
  weakDx: number;
  /** an attack is being wound up */
  tell: number;
  fury: boolean;
  half: boolean;
  intro: number;
  flash: number;
  queue: Timed[];
  /** the wind-up key's turning, the tower's blocks */
  spin: number;
  blocks: number;
}

export function startBoss(w: World, def: BossDef): Boss {
  const id = BOSSES.indexOf(def);
  return {
    id, def, x: 0.5, y: w.top - 0.14, hp: def.hp, max: def.hp, t: 0, cd: 1.5, step: 0, open: 0,
    always: id === 1 || id === 4, weakDx: id === 1 ? 0.13 : id === 4 ? 0.12 : id === 2 || id === 3 || id === 7 ? 0 : 0.12,
    tell: 0, fury: false, half: false, intro: 2.6, flash: 0, queue: [], spin: 0, blocks: 5,
  };
}

const later = (b: Boss, s: number, fn: () => void) => b.queue.push({ at: b.t + s, fn });

/** Soldiers that reached the top: weak point, plate or body (or they fly past). */
export function hitBoss(w: World, b: Boss, x: number, dmg: number): void {
  if (b.intro > 0 || w.done) return;
  const dx = x - b.x;
  if (Math.abs(dx) > b.def.r) { w.emit('miss', x, w.top, 0); return; }
  let m = 1;
  let kind: 'hit' | 'weak' | 'armor' = 'hit';
  if ((b.open > 0 || b.always) && Math.abs(dx - b.weakDx) < b.def.weakR) { m = w.gifts.weak + (b.def.weakBonus ?? 0); kind = 'weak'; }
  else if (Math.abs(dx) < b.def.armor) { m = 0.2; kind = 'armor'; }
  b.hp -= dmg * m;
  b.flash = Math.min(1, b.flash + 0.08 * m);
  w.score += Math.round(dmg * m);
  w.emit(kind, x, w.top - 0.02, m);
  if (!b.fury && b.hp < b.max * 0.3 && b.hp > 0) { b.fury = true; w.emit('fury', b.x, b.y, b.id); }
  if (b.id === 7 && !b.half && b.hp < b.max * 0.5) { b.half = true; w.emit('half', b.x, b.y, 0); }
  if (b.id === 3) {
    const left = Math.ceil((b.hp / b.max) * 5);
    if (left < b.blocks && b.hp > 0) { b.blocks = left; w.emit('attack', b.x, b.y, 13); }
  }
}

export function updateBoss(w: World, b: Boss, dt: number): void {
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt * 3);
  b.tell = Math.max(0, b.tell - dt);
  b.open = Math.max(0, b.open - dt);
  if (b.intro > 0) { b.intro -= dt; return; }
  const speed = b.fury ? 1.6 : b.half ? 1.3 : 1;
  b.x = 0.5 + Math.sin(b.t * 0.55 * speed) * b.def.sway;
  for (const q of b.queue.filter((q) => q.at <= b.t)) q.fn();
  b.queue = b.queue.filter((q) => q.at > b.t);
  // the wind-up key turns for ten seconds, then shows for three
  if (b.id === 5) { b.spin += dt; if (b.spin >= 10) { b.spin = 0; b.open = 3; w.emit('attack', b.x, b.y, 10); } }
  // the balloon's patch moves
  if (b.id === 4 && Math.floor(b.t / 4) !== Math.floor((b.t - dt) / 4)) b.weakDx = w.rng.range(-0.15, 0.15);
  b.cd -= dt;
  if (b.cd > 0) return;
  // never stack a sweep on a sweep: wait until the last band or wall has passed
  if (w.hazards.some((h) => (h.kind === 'wall' && h.y < w.cannonY + 0.05) || (h.kind === 'band'))) { b.cd = 0.3; return; }
  b.cd = b.def.period * (b.fury ? 0.62 : b.half ? 0.78 : 1);
  attack(w, b);
  b.step++;
}

function attack(w: World, b: Boss): void {
  const cx = w.cannon.x, warn = w.warn * (b.fury ? 0.85 : 1);
  const r = w.rng;
  const a = b.step % 2;
  b.tell = warn;
  const far = cx < 0.5 ? 0.78 : 0.22;
  const openAfter = (s: number, dur: number, dx?: number) => later(b, s, () => { b.open = dur; if (dx !== undefined) b.weakDx = dx; w.emit('attack', b.x, b.y, 10); });
  switch (b.id) {
    case 0: // drum major: the beat, the drum roll
      if (a === 0) {
        w.drop(cx, 0.2, 0, warn);
        if (b.fury) later(b, 0.6, () => w.drop(w.cannon.x, 0.2, 0, warn));
        openAfter(warn + 0.4, 2, b.step % 4 === 0 ? 0.12 : -0.12);
      } else {
        const xs = r.chance(0.5) ? [0.2, 0.5, 0.8] : [0.8, 0.5, 0.2];
        xs.forEach((x, i) => later(b, i * 0.9, () => w.drop(x, 0.22, 0, warn)));
      }
      break;
    case 1: // bugler: the call (a cone of sound at you), the summons
      if (a === 0 || b.fury) {
        w.beam(cx, 0.16, 2, warn, 0.5);
        later(b, warn + 0.5, () => { b.weakDx = -b.weakDx; });
      }
      if (a === 1 || b.fury) w.summon(b.fury ? 50 : 40, far, w.top, 0.2);
      break;
    case 2: // spinning top: the charge along your line, the ricochet
      if (a === 0) w.band([far], 0.3, 8, warn, 0.4);
      else w.wall([r.range(0.25, 0.75)], 0.3, 8, 0.8, warn, 0.25 * (r.chance(0.5) ? 1 : -1));
      // in its fury a second top joins: a spinning drop where you stand
      if (b.fury) later(b, 0.4, () => w.drop(w.cannon.x, 0.16, 8, warn));
      openAfter(warn + 0.4, 2);
      break;
    case 3: // tower: a block falls on you, the arrow slits
      if (a === 0) {
        w.drop(cx, 0.25, 3, warn);
        if (b.fury) w.drop(r.range(0.15, 0.85), 0.25, 3, warn);
        openAfter(warn + 0.5, 2.2);
      } else {
        for (const x of [cx, r.range(0.1, 0.9), r.range(0.1, 0.9)]) w.beam(x, 0.06, 6, warn, 0.35);
      }
      break;
    case 4: // war balloon: bombs, the low pass over your half
      if (a === 0) {
        const xs = [cx, cx - 0.22, cx + 0.22, r.range(0.1, 0.9)];
        if (b.fury) xs.push(cx - 0.42, cx + 0.42, r.range(0.1, 0.9));
        xs.forEach((x, i) => later(b, i * 0.15, () => w.drop(Math.max(0.08, Math.min(0.92, x)), 0.12, 4, warn)));
      } else w.band([cx < 0.5 ? 0.75 : 0.25], 0.46, 4, warn * 1.1, 0.45);
      break;
    case 5: // wind-up tank: the shell, the tracks over your half
      if (a === 0) { w.drop(cx, 0.16, 5, warn, 1.8); if (b.fury) later(b, 0.5, () => w.drop(w.cannon.x, 0.16, 5, warn, 1.8)); }
      else w.band([cx < 0.5 ? 0.75 : 0.25], 0.46, 8, warn * 1.2, 0.5);
      break;
    case 6: // hobby-horse knight: the zig-zag charge, the lance
      if (a === 0) {
        w.wall([r.range(0.3, 0.7)], 0.28, 6, 0.75, warn, 0.3);
        if (b.fury) later(b, 0.5, () => w.beam(w.cannon.x, 0.1, 6, warn * 0.8, 0.4));
        openAfter(warn + 1.2, 2.5, r.chance(0.5) ? 0.12 : -0.12);
      } else w.beam(cx, 0.1, 6, warn * 0.8, 0.4);
      break;
    case 7: { // the Red King: the sceptre, the army; the crown comes off while he attacks
      b.open = warn + 1.5;
      if (a === 0 || b.fury) for (const x of [cx, cx - 0.18, cx + 0.18]) w.beam(x, 0.1, 7, warn, 0.45);
      if (a === 1 || b.fury) {
        const side = r.chance(0.5) ? 0.25 : 0.75;
        for (let i = 0; i < 6; i++) later(b, i, () => w.summon(b.half ? 18 : 12, side + r.range(-0.1, 0.1), w.top, 0.22));
      }
      break;
    }
  }
}
