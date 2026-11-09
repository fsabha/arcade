/**
 * BROTO's guardians and trials (design: Lúcio). Every stage ends with a guardian that attacks
 * through telegraphed hazards (world.ts) and only takes damage in certain moments, so holding the
 * stream is never enough: the player has to dodge, stop firing, and strike when it opens. Below
 * 30% health it enters a fury. During the horde, trials (golden gate, protect the sprout, flank,
 * ember rain, race, drought, avalanche, eclipse) break the rhythm.
 */
import type { World } from './world';
import { PETAL_HP } from './world';

export interface BossDef {
  name: string;
  epithet: string;
  hp: number;
  /** body radius (field units) */
  r: number;
  /** seconds between attacks */
  period: number;
}

export const BOSSES: BossDef[] = [
  { name: 'CASULO CINZA', epithet: 'o que dorme na pedra', hp: 150, r: 0.11, period: 2.6 },
  { name: 'RAIZ-SERPENTE', epithet: 'a que estrangula o vale', hp: 220, r: 0.07, period: 2.8 },
  { name: 'CARDO FERRÃO', epithet: 'o que guarda os espinhos', hp: 400, r: 0.1, period: 2.7 },
  { name: 'REDEMOINHO', epithet: 'o vento que esqueceu a chuva', hp: 550, r: 0.12, period: 3.2 },
  { name: 'RAINHA DA GEADA', epithet: 'a que congela as raízes', hp: 520, r: 0.1, period: 2.8 },
  { name: 'LODO', epithet: 'a boca do pântano seco', hp: 950, r: 0.13, period: 2.6 },
  { name: 'MONÓLITO', epithet: 'a pedra que anda', hp: 850, r: 0.12, period: 2.6 },
  { name: 'MARIPOSA DA NOITE', epithet: 'a que caça a sua luz', hp: 650, r: 0.12, period: 3.0 },
  { name: 'TIÇÃO', epithet: 'a ave da queimada', hp: 750, r: 0.11, period: 2.9 },
  { name: 'O CORAÇÃO SECO', epithet: 'onde a Cinza nasceu', hp: 1900, r: 0.12, period: 2.4 },
];

export interface Part { x: number; y: number; hp: number; max: number }

export interface Boss {
  def: BossDef;
  id: number;
  hp: number;
  max: number;
  x: number;
  y: number;
  t: number;
  intro: number;
  next: number;
  k: number;
  fury: boolean;
  /** windows and states (seconds left) */
  open: number;
  shell: number;
  mirror: number;
  mouth: number;
  inhale: number;
  contract: number;
  pullT: number;
  /** a tell before a state starts (for the renderer) */
  tell: number;
  stage: number;
  parts: Part[];
  queue: { at: number; fn: () => void }[];
  /** the moth only dives when you hold too long; one dive at a time */
  diving: number;
  flash: number;
}

export function startBoss(w: World, def: BossDef): Boss {
  const id = BOSSES.indexOf(def);
  const b: Boss = {
    def, id, hp: def.hp, max: def.hp, x: 0.5, y: w.top - 0.08, t: 0, intro: 2.6, next: 0.8, k: 0, fury: false,
    open: 0, shell: 0, mirror: 0, mouth: 0, inhale: 0, contract: 0, pullT: 0, tell: 0, stage: 0, parts: [], queue: [], diving: 0, flash: 0,
  };
  if (id === 4) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    b.parts.push({ x: 0.5 + Math.cos(a) * 0.18, y: b.y + Math.sin(a) * 0.09, hp: 50, max: 50 });
  }
  return b;
}

/** Seeds that reach the top: does the guardian take it? */
export function hitBoss(w: World, b: Boss, x: number, hp: number, sprout: boolean): void {
  if (b.intro > 0) { w.emit('shield', x, w.top, 0); return; }
  const reach = b.id === 1 ? 0.12 : b.def.r * 1.3;
  // the crystals of the frost queen are hit wherever they are
  if (b.id === 4) {
    const p = b.parts.find((q) => q.hp > 0 && Math.abs(x - q.x) < 0.06);
    if (p) {
      p.hp -= hp;
      w.score += hp * 10;
      w.emit('hit', x, w.top, hp);
      if (p.hp <= 0) { b.hp -= p.max; w.emit('part', p.x, p.y, b.parts.filter((q) => q.hp > 0).length); }
      return;
    }
    if (b.parts.some((q) => q.hp > 0)) { w.emit('shield', x, w.top, 0); return; }
  }
  if (Math.abs(x - b.x) > reach) return; // it went past
  let dmg = hp;
  switch (b.id) {
    case 0: if (b.shell > 0) dmg = 0; break;
    case 2:
      if (b.mirror > 0) {
        // the mirror sends it back as an ember, at the Sower
        w.shootAsh(x, w.top + 0.03, (w.sower.x - x) * 0.5, 0.6);
        w.emit('reflect', x, w.top, 0);
        return;
      }
      break;
    case 3: if (b.open <= 0) dmg = 0; break;
    case 5: if (b.mouth > 0) dmg *= 2; break;
    case 6: if (b.open <= 0) dmg = 0; break;
    case 7: dmg = b.open > 0 ? dmg : dmg * 0.35; break;
    case 8: dmg = b.inhale > 0 ? dmg * 2 : dmg * 0.75; break;
    case 9:
      if (b.contract > 0) { b.hp = Math.min(b.max, b.hp + hp); w.emit('shield', x, w.top, 1); return; }
      if (b.hp <= b.max * 0.1 && !sprout) dmg = 0; // only a Sprout breaks the last of it
      if (sprout && b.hp <= b.max * 0.1) dmg = b.hp;
      break;
  }
  if (dmg <= 0) { w.emit('shield', x, w.top, 0); return; }
  b.hp -= dmg;
  b.flash = 1;
  w.score += Math.round(dmg * 10);
  w.emit('hit', x, w.top, dmg);
  if (b.id === 9 && b.hp <= b.max * 0.1 && b.hp > 0) w.emit('final', b.x, b.y, 0);
}

export function updateBoss(w: World, b: Boss, dt: number): void {
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt * 4);
  for (const k of ['open', 'shell', 'mirror', 'mouth', 'inhale', 'contract', 'tell', 'diving'] as const) b[k] = Math.max(0, b[k] - dt);
  if (b.pullT > 0) { b.pullT -= dt; w.pull = b.fury ? 0.6 : 0.4; if (b.pullT <= 0) w.pull = 0; }
  // queued follow-ups
  for (const q of b.queue) if (b.t >= q.at) q.fn();
  b.queue = b.queue.filter((q) => b.t < q.at);
  if (b.intro > 0) { b.intro -= dt; return; }
  if (!b.fury && b.hp < b.max * 0.3) { b.fury = true; w.emit('fury', b.x, b.y, b.id); }
  // movement
  if (b.id === 1) b.x = 0.5 + Math.sin(b.t * 0.45) * 0.25;
  else if (b.id === 7 || b.id === 8) b.x = 0.5 + Math.sin(b.t * 0.6) * 0.2;
  // timed windows that are not attacks
  if (b.id === 3 && Math.floor(b.t / 6) !== Math.floor((b.t - dt) / 6)) { b.open = 3; w.emit('attack', b.x, b.y, 10); }
  if (b.id === 5 && Math.floor(b.t / 8) !== Math.floor((b.t - dt) / 8)) mouth(w, b);
  if (b.id === 9) {
    const st = b.hp > b.max * 0.66 ? 0 : b.hp > b.max * 0.33 ? 1 : 2;
    if (st !== b.stage) { b.stage = st; b.next = 2; w.emit('stage', b.x, b.y, st); }
  }
  // the moth dives on whoever holds the stream too long
  if (b.id === 7 && b.diving <= 0 && w.holdT > (b.fury ? 1.0 : 1.5)) {
    const warn = w.level.warn;
    w.drop(w.sower.x, 0.22, w.level.hit, 4, warn, 2.4);
    b.diving = warn + 1.6;
    b.queue.push({ at: b.t + warn + 0.6, fn: () => { b.open = 3; w.emit('attack', b.x, b.y, 11); } });
  }
  b.next -= dt * (b.fury ? 1.25 : 1);
  if (b.next > 0) return;
  b.next = b.def.period;
  attack(w, b);
}

function mouth(w: World, b: Boss): void {
  const T = b.fury ? 1.2 : 2;
  b.tell = 0.6;
  b.queue.push({ at: b.t + 0.6, fn: () => {
    b.mouth = T;
    const g = w.makeGate({ op: 'well', n: 5, x: b.x, w: 0.42, y: 0.32 });
    g.ttl = T;
    g.golden = true;
    w.gates.push(g);
    w.emit('attack', b.x, b.y, 12);
  } });
}

function attack(w: World, b: Boss): void {
  const rng = w.rng, lv = w.level, S = w.sower;
  const warn = lv.warn, hit = lv.hit;
  const at = (s: number, fn: () => void) => b.queue.push({ at: b.t + s, fn });
  const pick = <T,>(list: T[]): T => list[b.k++ % list.length];
  const fio = (look = 7) => {
    w.drop(S.x, 0.14, hit, look);
    if (b.fury) at(0.45, () => w.drop(S.x, 0.14, hit, look));
  };
  const columns = (n: number, of: number, look: number, w0 = 0.2) => {
    const cols = Array.from({ length: of }, (_, i) => 0.1 + (i + 0.5) * (0.8 / of));
    for (let i = cols.length - 1; i > 0; i--) { const j = rng.int(0, i); [cols[i], cols[j]] = [cols[j], cols[i]]; }
    cols.slice(0, n).forEach((x, i) => at(i * 0.12, () => w.drop(x, w0, hit, look)));
  };
  switch (b.id) {
    case 0: {
      const a = pick(['fio', 'fio', 'casca']);
      if (a === 'fio') fio();
      else { b.tell = 0.5; at(0.5, () => { b.shell = 2; w.emit('attack', b.x, b.y, 13); }); }
      break;
    }
    case 1: {
      const a = pick(['bote', 'chicote']);
      if (a === 'bote') {
        w.drop(S.x, 0.18, hit, 2, warn + 0.2, 2.6);
        if (b.fury) at(warn + 0.6, () => w.drop(S.x, 0.18, hit, 2, warn, 2.6));
      } else w.band([rng.range(0.2, 0.8)], 0.25, hit, 2);
      break;
    }
    case 2: {
      const a = pick(['leque', 'espelho', 'leque']);
      if (a === 'leque') {
        b.tell = warn;
        w.emit('warn', b.x, b.y, 8);
        at(warn, () => {
          const n = b.fury ? 7 : 5, spin = b.fury ? Math.sin(b.t) * 0.4 : 0;
          const base = Math.atan2(w.sowerY - b.y, S.x - b.x);
          for (let i = 0; i < n; i++) {
            const a2 = base + spin + (i - (n - 1) / 2) * 0.16;
            w.shootAsh(b.x + Math.cos(a2) * 0.1, b.y + Math.sin(a2) * 0.1, Math.cos(a2) * 0.75, Math.sin(a2) * 0.75);
          }
          w.emit('attack', b.x, b.y, 8);
        });
      } else { b.tell = 0.7; w.emit('warn', b.x, b.y, 9); at(0.7, () => { b.mirror = 2.2; w.emit('attack', b.x, b.y, 9); }); }
      break;
    }
    case 3: {
      const a = pick(['succao', 'varredura']);
      if (a === 'succao') { b.tell = 0.6; at(0.6, () => { b.pullT = 3; w.emit('attack', b.x, b.y, 14); }); }
      else {
        const gaps = b.fury ? [rng.range(0.2, 0.8)] : [rng.range(0.15, 0.4), rng.range(0.6, 0.85)];
        w.band(gaps, b.fury ? 0.26 : 0.32, hit * 0.5, 0, warn, 2, (rng.chance(0.5) ? 1 : -1) * 0.16);
      }
      break;
    }
    case 4: {
      const a = pick(['estalactite', 'estalactite', 'inverno']);
      if (a === 'estalactite') columns(3, 4, 3);
      else { b.tell = 0.8; w.emit('warn', b.x, b.y, 15); at(0.8, () => { w.winter = 4; w.emit('attack', b.x, b.y, 15); }); }
      if (b.fury) b.next = 2;
      break;
    }
    case 5: {
      const a = pick(['bolhas', 'golfada']);
      if (a === 'bolhas') {
        for (let i = 0; i < 3; i++) {
          const x = rng.range(0.2, 0.8), y = w.laneY(rng.range(0.2, 0.45));
          w.emit('warn', x, y, 16);
          at(warn, () => { for (let k = 0; k < 8; k++) w.spawnAsh(y + rng.range(-0.03, 0.03), x + rng.range(-0.05, 0.05), false); w.emit('attack', x, y, 16); });
        }
      } else {
        b.tell = warn;
        at(warn, () => {
          for (let k = 0; k < 60; k++) { const a2 = Math.PI * (0.15 + 0.7 * (k / 60)); w.spawnAsh(w.top + 0.02 + Math.sin(a2) * 0.12, 0.5 + Math.cos(a2) * 0.42, rng.chance(0.15)); }
          w.emit('attack', b.x, b.y, 17);
        });
      }
      break;
    }
    case 6: {
      const a = pick(['rolamento', 'pisao']);
      if (a === 'rolamento') {
        w.drop(rng.chance(0.6) ? S.x : rng.range(0.15, 0.85), 0.18, hit, 1, warn, 1.1);
        if (b.fury) at(0.5, () => w.drop(rng.range(0.15, 0.85), 0.18, hit, 1, warn, 1.1));
      } else {
        w.band([rng.range(0.2, 0.8)], 0.32, hit, 5);
        at(warn + 0.4, () => w.emit('attack', b.x, b.y, 18));
        at(warn + 1.5, () => { b.open = 3; w.emit('attack', b.x, b.y, 19); });
      }
      break;
    }
    case 7: {
      // the moth's own attack: dust that puts out the seeds in a strip; the dive is in updateBoss
      w.dust(w.laneY(rng.range(0.3, 0.5)), w.laneLen * 0.18, 2.5, w.level.warn, rng.chance(0.5) ? 0.27 : 0.73, 0.5);
      break;
    }
    case 8: {
      const a = pick(['chuva', 'muralha', 'calor']);
      if (a === 'chuva') columns(b.fury ? 5 : 4, 6, 0, 0.11);
      else if (a === 'muralha') w.wall([rng.range(0.15, 0.4), rng.range(0.6, 0.85)], 0.28, hit, 0, 0.45);
      else { b.tell = 0.8; w.emit('warn', b.x, b.y, 20); at(0.8, () => { b.inhale = 2; w.heat = 2; w.emit('attack', b.x, b.y, 20); }); }
      break;
    }
    case 9: {
      if (b.stage === 0) {
        const a = pick(['fio', 'espelho']);
        if (a === 'fio') fio(0);
        else { b.tell = 0.7; w.emit('warn', b.x, b.y, 9); at(0.7, () => { b.mirror = 2; w.emit('attack', b.x, b.y, 9); }); }
      } else if (b.stage === 1) {
        const a = pick(['rolamento', 'inverno']);
        if (a === 'rolamento') w.drop(S.x, 0.2, 15, 1, warn, 1.1);
        else { b.tell = 0.8; w.emit('warn', b.x, b.y, 15); at(0.8, () => { w.winter = 4; w.emit('attack', b.x, b.y, 15); }); }
      } else {
        const a = pick(['batida', 'contracao']);
        if (a === 'batida') {
          w.wall([rng.range(0.2, 0.8)], 0.3, hit, 5, 0.55);
          if (b.fury) at(1.1, () => w.wall([rng.range(0.2, 0.8)], 0.3, hit, 5, 0.55));
        } else { b.tell = 0.8; w.emit('warn', b.x, b.y, 21); at(0.8, () => { b.contract = 1.5; w.emit('attack', b.x, b.y, 21); }); }
      }
      break;
    }
  }
}

// ---------- trials during the horde ----------

export type TrialKind = 'golden' | 'protect' | 'flank' | 'embers' | 'race' | 'drought' | 'avalanche' | 'eclipse';
export const TRIAL_NAMES: Record<TrialKind, [string, string]> = {
  golden: ['PORTÃO DOURADO', '×4 por 3 segundos!'],
  protect: ['PROTEJA O BROTO', 'a Cinza quer o broto: 10 segundos'],
  flank: ['PELOS FLANCOS', 'a Cinza vem dos lados'],
  embers: ['CHUVA DE BRASAS', 'saia das colunas vermelhas'],
  race: ['CORRIDA', 'quebre os 3 casulos em 15 segundos'],
  drought: ['SECA', 'a seiva volta pela metade'],
  avalanche: ['AVALANCHE', 'pedras deslizam na trilha'],
  eclipse: ['ECLIPSE', 'escuridão total'],
};

export interface Target { x: number; y: number; r: number; hp: number; max: number }

export class Trial {
  t = 0;
  targets: Target[] = [];
  won = false;
  constructor(readonly kind: TrialKind, readonly dur: number) {}

  hitSeed(w: World, x: number, y: number, hp: number): boolean {
    if (this.kind !== 'race') return false;
    for (const c of this.targets) {
      if (c.hp > 0 && Math.hypot(x - c.x, y - c.y) < c.r) {
        c.hp -= hp;
        w.score += hp * 3;
        if (c.hp <= 0) w.emit('part', c.x, c.y, this.targets.filter((q) => q.hp > 0).length);
        return true;
      }
    }
    return false;
  }

  hitAsh(w: World, x: number, y: number, hp: number, projectile = false): boolean {
    if (this.kind !== 'protect') return false;
    const s = this.targets[0];
    // the ash thrown at the sprout that misses it falls apart
    if (projectile && s && y > s.y + 0.08) return true;
    if (s && s.hp > 0 && Math.hypot(x - s.x, y - s.y) < s.r) {
      s.hp -= hp;
      w.emit('struck', s.x, s.y, hp);
      return true;
    }
    return false;
  }
}

function beginTrial(w: World, kind: TrialKind): Trial {
  const rng = w.rng, lv = w.level;
  const dur: Record<TrialKind, number> = { golden: 3, protect: 10, flank: 4, embers: 5, race: 15, drought: 8, avalanche: 8, eclipse: 6 };
  const tr = new Trial(kind, dur[kind]);
  switch (kind) {
    case 'golden': {
      const g = w.makeGate({ op: 'mul', n: 4, x: rng.range(0.2, 0.8), w: 0.24, y: 0.5 });
      g.ttl = 3; g.golden = true;
      w.gates.push(g);
      break;
    }
    case 'protect': tr.targets.push({ x: rng.range(0.3, 0.7), y: w.laneY(0.6), r: 0.04, hp: 20, max: 20 }); break;
    case 'race':
      for (let i = 0; i < 3; i++) tr.targets.push({ x: 0.2 + i * 0.3 + rng.range(-0.06, 0.06), y: w.laneY(rng.range(0.3, 0.5)), r: 0.045, hp: 30, max: 30 });
      break;
    case 'drought': w.drought = 8; break;
    case 'eclipse': w.eclipse = 6; break;
    case 'avalanche':
      w.stones.push({ x: 0.2, y: 0.76, w: 0.2, h: 0.03, vx: 0.35, ttl: 8 }, { x: 0.8, y: 0.84, w: 0.2, h: 0.03, vx: -0.3, ttl: 8 });
      break;
    case 'embers':
      for (let i = 0; i < 10; i++) {
        const x = rng.range(0.1, 0.9);
        w.drop(x, 0.08, 5, 0, lv.warn, 2, w.top);
        w.hazards[w.hazards.length - 1].warn += i * 0.4;
      }
      break;
    case 'flank': break;
  }
  w.emit('trial', 0.5, w.laneY(0.5), 0, undefined, kind);
  return tr;
}

/** Trials come at even steps of the horde; one at a time; the guardian waits for the last. */
export function updateTrials(w: World, dt: number): void {
  const list = w.level.trials;
  if (!w.trial && w.trialsDone < list.length && w.hordeShare <= 1 - (w.trialsDone + 1) / (list.length + 1)) {
    w.trial = beginTrial(w, list[w.trialsDone]);
  }
  const tr = w.trial;
  if (!tr) return;
  const prev = tr.t;
  tr.t += dt;
  const S = w.sower;
  if (tr.kind === 'protect') {
    const s = tr.targets[0];
    // 40 pieces of ash aimed at the sprout over the ten seconds
    const n = Math.floor(tr.t * 4) - Math.floor(prev * 4);
    for (let i = 0; i < n && Math.floor(tr.t * 4) <= 40; i++) {
      const x = w.rng.range(0.1, 0.9), y = w.top + 0.02;
      const d = Math.hypot(s.x - x, s.y - y);
      w.shootAsh(x, y, ((s.x - x) / d) * 0.3, ((s.y - y) / d) * 0.3, false);
    }
  } else if (tr.kind === 'flank') {
    const n = Math.floor(tr.t * 4) - Math.floor(prev * 4);
    for (let i = 0; i < n && tr.t < 3; i++) for (const side of [0.04, 0.96]) {
      const y = w.laneY(0.55), d = Math.hypot(S.x - side, w.sowerY - y);
      w.shootAsh(side, y, ((S.x - side) / d) * 0.22, ((w.sowerY - y) / d) * 0.22, false);
    }
  }
  let end = tr.t >= tr.dur;
  if (tr.kind === 'race' && tr.targets.every((c) => c.hp <= 0)) { end = true; tr.won = true; }
  if (tr.kind === 'protect' && tr.targets[0].hp <= 0) end = true;
  if (!end) return;
  if (tr.kind === 'protect' && tr.targets[0].hp > 0) {
    tr.won = true;
    w.petalHp = Math.min(5 * PETAL_HP, w.petalHp + PETAL_HP);
  }
  if (tr.kind === 'race') for (const c of tr.targets) if (c.hp > 0) for (let k = 0; k < 15; k++) w.spawnAsh(c.y + w.rng.range(-0.04, 0.04), c.x + w.rng.range(-0.06, 0.06));
  if (tr.won) w.score += 300;
  w.emit('trialEnd', 0.5, w.laneY(0.5), tr.won ? 1 : 0, undefined, tr.kind);
  w.trial = null;
  w.trialsDone++;
}
