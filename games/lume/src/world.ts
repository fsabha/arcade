/**
 * LUME, the game itself, with no drawing and no DOM. Lume, the last spark of the lighthouse of
 * Vau, sinks through the drowned city towards its heart. The playfield is 1 unit wide and H
 * units tall; y grows DOWNWARD (it is depth), the camera's top edge sits at camY and falls.
 *
 * Lume's light is its life: it fades all the time and every lost light it rescues feeds it and
 * joins a tail that follows like a chain. Creatures that touch the tail cut it (the cut-off part
 * drifts for a moment and can be picked up again); creatures that touch Lume drain its light.
 * Lanterns bank the tail for length^2 points, refuel the light and give back a memory of the city.
 * A tap pulses: one light of the tail (or some of Lume's own) burns to stun creatures and shatter
 * debris nearby. When the light is gone, the run is over.
 */
import { Rng } from '@arcade/shared';

export const LUME_R = 0.024;
export const LIGHT_R = 0.022;
export const LINK = 0.034; // spacing of the tail
export const LOOSE_TIME = 2.6; // a cut piece of tail drifts this long before it goes out
export const INVULNERABLE = 1.2;
export const PULSE_R = 0.3;
export const STUN_TIME = 2.2;
export const SECTOR_LEN = 25; // units of depth per sector (10 m per unit)

export const SECTORS = ['SUPERFÍCIE PARTIDA', 'FLORESTA DE ALGAS', 'CIDADE AFUNDADA', 'FOSSA DOS ECOS', 'O ABISMO'] as const;

export interface Light { x: number; y: number; phase: number; /** 1 = part of a constellation */ g?: number }
export interface Loose { x: number; y: number; vx: number; vy: number; t: number }
export interface Node { x: number; y: number }
export type CreatureKind = 'jelly' | 'mine' | 'eel';
export interface Creature { kind: CreatureKind; x: number; y: number; r: number; x0: number; phase: number; speed: number; stun: number; seed: number; dir: number }
export interface Debris { x: number; y: number; r: number; a: number; seed: number }
export interface Lantern { x: number; y: number; lit: boolean }

export type EventKind = 'light' | 'cut' | 'regain' | 'hurt' | 'pulse' | 'stun' | 'shatter' | 'bank' | 'sector' | 'low' | 'over'
  | 'challenge' | 'win' | 'fail' | 'ring' | 'need' | 'warn' | 'leviathan' | 'triz';

/** The small trials between lanterns, one at a time. */
export type ChallengeKind = 'constellation' | 'firefly' | 'tide' | 'bell';
export interface Challenge { kind: ChallengeKind; t: number; total: number; got: number }
export interface Firefly { x: number; y: number; vx: number; vy: number }
export interface Bell { x: number; y: number; need: number; rung: boolean; swing: number }
/** Something enormous crossing the screen once per sector: a warning first, then the body. */
export interface Leviathan { y: number; x: number; dir: number; warn: number; len: number; r: number }

export const CHALLENGE_NAMES: Record<ChallengeKind, string> = {
  constellation: 'CONSTELAÇÃO',
  firefly: 'VAGA-LUME FUGIDIO',
  tide: 'MARÉ NEGRA',
  bell: 'O SINO DE VAU',
};
export const CHALLENGE_HINTS: Record<ChallengeKind, string> = {
  constellation: 'junte as 7 estrelas',
  firefly: 'alcance-o antes que fuja',
  tide: 'desça! não deixe a escuridão te tocar',
  bell: 'chegue com luzes na cauda',
};
export const FIREFLY_TIME = 9;
export const TIDE_TIME = 9;
export interface WorldEvent { kind: EventKind; x: number; y: number; value: number; text?: string }

/** Memories of Vau, one per lantern (in order, then they repeat). */
export const MEMORIES = [
  'O farol de Vau era aceso pelas lembranças de quem ficava.',
  'Ela sempre deixava a janela acesa para os barcos.',
  'Nas noites de festa, a praça inteira cantava junto.',
  'O faroleiro contava as estrelas em voz alta.',
  'A padaria abria antes do sol, cheirando a canela.',
  'Quando a Maré Negra veio, ninguém correu sozinho.',
  'Um menino guardou um vaga-lume num pote de vidro.',
  'O sino da torre tocava três vezes para dizer: voltem.',
  'O faroleiro apagou a própria luz para salvar a cidade.',
  'Ele guardou a última faísca no coração do farol.',
  'Essa faísca é você.',
  'Lá embaixo, o coração ainda espera.',
];

export class World {
  readonly W = 1;
  H: number;
  t = 0;
  camY = 0;
  speed = 0;
  score = 0;
  /** Lume's own light, 0..1; zero ends the run */
  energy = 1;
  inv = 0;
  over = false;
  sector = 0;
  banked = 0;
  bestTail = 0;
  memory = 0;
  lume = { x: 0.5, y: 0, tx: 0.5, sy: 0.32, ty: 0.32 };
  tail: Node[] = [];
  lights: Light[] = [];
  loose: Loose[] = [];
  creatures: Creature[] = [];
  debris: Debris[] = [];
  lanterns: Lantern[] = [];
  events: WorldEvent[] = [];
  private rng: Rng;
  private nextSpawn: number;
  private nextLantern = 5;
  private lowWarned = false;
  private frac = 0;
  challenge: Challenge | null = null;
  firefly: Firefly | null = null;
  bell: Bell | null = null;
  leviathan: Leviathan | null = null;
  /** how far the Black Tide reaches down the screen, 0..1 */
  tide = 0;
  private nextChallenge = 11;
  private order: ChallengeKind[] = [];
  private needCooldown = 0;
  private leviathanIn = 0;

  constructor(H: number, seed = Date.now()) {
    this.H = H;
    this.rng = new Rng(seed);
    this.lume.y = this.lume.sy * H;
    this.nextSpawn = H * 0.7;
  }

  /** Depth in metres for the HUD. */
  get depth(): number {
    return Math.floor(this.camY * 10);
  }

  /** Radius of Lume's light, in playfield units: grows with the tail it carries. */
  get radius(): number {
    return 0.09 + 0.2 * this.energy + Math.min(0.14, this.tail.length * 0.008);
  }

  resize(H: number): void {
    this.H = H;
  }

  steer(dx: number, dy: number): void {
    if (this.over) return;
    const l = this.lume;
    l.tx = Math.max(0.04, Math.min(0.96, l.tx + dx * 1.2));
    l.ty = Math.max(0.12, Math.min(0.75, l.ty + (dy * 1.2) / this.H));
  }

  /** A tap: the last light of the tail (or some of Lume's own) burns in a pulse. */
  pulse(): boolean {
    if (this.over) return false;
    const l = this.lume;
    if (this.tail.length > 0) this.tail.pop();
    else if (this.energy > 0.2) this.energy -= 0.1;
    else return false;
    this.emit('pulse', l.x, l.y, 0);
    for (const c of this.creatures) {
      if (Math.hypot(c.x - l.x, c.y - l.y) < PULSE_R + c.r) { c.stun = STUN_TIME; this.score += 5; this.emit('stun', c.x, c.y, 5); }
    }
    for (const d of this.debris) {
      if (Math.hypot(d.x - l.x, d.y - l.y) < PULSE_R * 0.8 + d.r) { d.r = 0; this.score += 10; this.emit('shatter', d.x, d.y, 10); }
    }
    this.debris = this.debris.filter((d) => d.r > 0);
    return true;
  }

  private emit(kind: EventKind, x: number, y: number, value: number, text?: string): void {
    this.events.push({ kind, x, y, value, text });
  }

  update(dt: number): void {
    if (!(dt > 0)) return; // no time, negative time or NaN: nothing happens
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h);
  }

  private hurt(amount: number): void {
    if (this.inv > 0 || this.over) return;
    this.energy -= amount;
    this.inv = INVULNERABLE;
    this.emit('hurt', this.lume.x, this.lume.y, amount);
    if (this.energy <= 0) this.end();
  }

  private end(): void {
    this.energy = 0;
    this.over = true;
    // the tail comes loose and goes out slowly
    for (const n of this.tail) this.loose.push({ x: n.x, y: n.y, vx: (this.rng.next() - 0.5) * 0.1, vy: -0.05, t: LOOSE_TIME * 1.5 });
    this.tail = [];
    this.emit('over', this.lume.x, this.lume.y, this.score);
  }

  /** Cuts the tail at node k: k and everything after it come loose. */
  private cut(k: number): void {
    const off = this.tail.splice(k);
    for (const n of off) this.loose.push({ x: n.x, y: n.y, vx: (this.rng.next() - 0.5) * 0.12, vy: -0.04 - this.rng.next() * 0.04, t: LOOSE_TIME });
    this.emit('cut', off[0].x, off[0].y, off.length);
  }

  private step(dt: number): void {
    if (this.over) {
      for (const p of this.loose) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      this.loose = this.loose.filter((p) => p.t > 0);
      return;
    }
    this.t += dt;
    const l = this.lume;
    this.speed = Math.min(0.95, 0.28 + this.camY * 0.0065) * (this.challenge?.kind === 'tide' ? 1.3 : 1);
    this.camY += this.speed * dt;
    this.frac += this.speed * dt * 10;
    if (this.frac >= 1) { this.score += Math.floor(this.frac); this.frac -= Math.floor(this.frac); }
    const sector = Math.floor(this.camY / SECTOR_LEN);
    if (sector !== this.sector) {
      this.sector = sector;
      this.emit('sector', l.x, l.y, sector, SECTORS[Math.min(sector, SECTORS.length - 1)]);
      if (sector >= 1 && !this.leviathan) this.leviathanIn = 2.5; // after the sector's name has been read
    }

    // the light fades, faster in the deep
    this.energy -= dt * (0.032 + Math.min(0.06, this.sector * 0.013 + this.t * 0.0002));
    if (this.energy < 0.22 && !this.lowWarned) { this.lowWarned = true; this.emit('low', l.x, l.y, 0); }
    if (this.energy > 0.35) this.lowWarned = false;
    if (this.energy <= 0) { this.end(); return; }

    const k = 1 - Math.exp(-dt * 14);
    l.x += (l.tx - l.x) * k;
    l.sy += (l.ty - l.sy) * k;
    l.y = this.camY + l.sy * this.H;

    // the tail: each node keeps one link behind the one before it, drifting up as Lume sinks
    let prev: Node = l;
    for (const n of this.tail) {
      n.y -= dt * 0.02;
      const dx = n.x - prev.x, dy = n.y - prev.y, d = Math.hypot(dx, dy) || 1e-4;
      if (d > LINK) { n.x = prev.x + (dx / d) * LINK; n.y = prev.y + (dy / d) * LINK; }
      prev = n;
    }

    for (const o of this.lights) {
      if (Math.hypot(o.x - l.x, o.y - l.y) < LIGHT_R + LUME_R + 0.012) {
        o.phase = -99;
        if (this.energy < 0.1) this.emit('triz', l.x, l.y, 0);
        if (o.g && this.challenge?.kind === 'constellation') this.challenge.got++;
        const end = this.tail[this.tail.length - 1] ?? l;
        this.tail.push({ x: end.x, y: end.y - LINK * 0.5 });
        this.bestTail = Math.max(this.bestTail, this.tail.length);
        this.energy = Math.min(1, this.energy + 0.045);
        this.score += 5;
        this.emit('light', o.x, o.y, this.tail.length);
      }
    }
    this.lights = this.lights.filter((o) => o.phase > -99);

    for (const p of this.loose) {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.hypot(p.x - l.x, p.y - l.y) < LIGHT_R + LUME_R + 0.02) {
        p.t = 0;
        const end = this.tail[this.tail.length - 1] ?? l;
        this.tail.push({ x: end.x, y: end.y - LINK * 0.5 });
        this.energy = Math.min(1, this.energy + 0.03);
        this.emit('regain', p.x, p.y, this.tail.length);
      }
    }
    this.loose = this.loose.filter((p) => p.t > 0);

    for (const c of this.creatures) {
      if (c.stun > 0) c.stun -= dt;
      const moving = c.stun <= 0;
      if (c.kind === 'jelly') {
        if (moving) { c.phase += dt * c.speed; c.x = c.x0 + Math.sin(c.phase) * (0.12 + 0.06 * Math.min(1, this.sector / 3)); c.y -= dt * 0.03 * Math.max(0, Math.sin(c.phase * 2)); }
      } else if (c.kind === 'eel') {
        if (moving) { c.x += c.dir * c.speed * dt; c.phase += dt * 6; if (c.x < -0.15 || c.x > 1.15) c.dir = -c.dir; }
      } else c.phase += dt * 3;
      if (!moving) continue;
      const reach = c.r * (c.kind === 'mine' ? 0.9 + 0.15 * Math.sin(c.phase) : 0.85);
      if (Math.hypot(c.x - l.x, c.y - l.y) < reach + LUME_R) this.hurt((c.kind === 'mine' ? 0.32 : 0.24) + this.sector * 0.02);
      for (let i = 0; i < this.tail.length; i++) {
        const n = this.tail[i];
        if (Math.hypot(c.x - n.x, c.y - n.y) < reach + LIGHT_R * 0.6) { this.cut(i); break; }
      }
    }
    for (const d of this.debris) {
      if (Math.hypot(d.x - l.x, d.y - l.y) < d.r * 0.85 + LUME_R) this.hurt(0.18);
      for (let i = 0; i < this.tail.length; i++) {
        const n = this.tail[i];
        if (Math.hypot(d.x - n.x, d.y - n.y) < d.r * 0.85 + LIGHT_R * 0.5) { this.cut(i); break; }
      }
    }

    for (const ln of this.lanterns) {
      if (!ln.lit && Math.hypot(ln.x - l.x, ln.y - l.y) < 0.075) {
        ln.lit = true;
        const n = this.tail.length;
        const pts = n * n * 10 + 50;
        this.score += pts;
        this.banked += n;
        this.tail = [];
        this.energy = Math.min(1, this.energy + 0.25);
        const text = MEMORIES[this.memory % MEMORIES.length];
        this.memory++;
        this.emit('bank', ln.x, ln.y, pts, text);
      }
    }

    if (this.inv > 0) this.inv -= dt;
    this.stepChallenge(dt);
    this.stepLeviathan(dt);
    if (this.over) return;

    while (this.nextSpawn < this.camY + this.H + 0.4) this.spawn(this.nextSpawn);
    const top = this.camY - 0.35;
    this.lights = this.lights.filter((o) => o.y > top);
    this.creatures = this.creatures.filter((c) => c.y > top - c.r);
    this.debris = this.debris.filter((d) => d.y > top - d.r);
    this.lanterns = this.lanterns.filter((ln) => ln.y > top);
  }

  // ---------- trials ----------

  private startChallenge(y: number): void {
    const rng = this.rng;
    if (this.order.length === 0) {
      const pool: ChallengeKind[] = ['constellation', 'firefly', 'bell'];
      if (this.camY > SECTOR_LEN * 0.6) pool.push('tide');
      for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      // the very first trial is always the gentle one
      if (this.memory === 0 || this.camY < 14) { pool.splice(pool.indexOf('constellation'), 1); pool.unshift('constellation'); }
      this.order = pool;
    }
    const kind = this.order.shift()!;
    const l = this.lume;
    if (kind === 'constellation') {
      const cx = rng.range(0.32, 0.68), cy = y + 0.45, R = 0.2;
      for (let i = 0; i < 7; i++) {
        // a seven-pointed figure: alternate long and short arms, in the order a finger would trace
        const a = -Math.PI / 2 + (i / 7) * Math.PI * 2, rr = R * (i % 2 ? 0.62 : 1);
        this.lights.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 1.1, phase: i, g: 1 });
      }
      this.challenge = { kind, t: 0, total: 7, got: 0 };
      this.nextSpawn = y + 1.0;
    } else if (kind === 'firefly') {
      this.firefly = { x: l.x < 0.5 ? 0.75 : 0.25, y: this.camY + this.H * 0.62, vx: 0, vy: 0 };
      this.challenge = { kind, t: 0, total: 1, got: 0 };
      this.nextSpawn = y + 0.8;
    } else if (kind === 'tide') {
      this.challenge = { kind, t: 0, total: 1, got: 0 };
      // lights below to dive for
      for (let i = 0; i < 5; i++) this.lights.push({ x: rng.range(0.15, 0.85), y: y + 0.3 + i * 0.25, phase: rng.next() * 6 });
      this.nextSpawn = y + 1.2;
    } else {
      const need = Math.min(8, 4 + this.sector);
      this.bell = { x: rng.range(0.28, 0.72), y: y + 1.6, need, rung: false, swing: 0 };
      // a trail of lights leading to it
      for (let i = 0; i < need + 2; i++) this.lights.push({ x: Math.max(0.08, Math.min(0.92, 0.5 + Math.sin(i * 0.9) * 0.25)), y: y + 0.1 + i * 0.12, phase: i });
      this.challenge = { kind, t: 0, total: need, got: 0 };
      this.nextSpawn = y + 2.0;
    }
    this.emit('challenge', l.x, l.y, 0, kind);
  }

  private finish(win: boolean, value: number, text: string): void {
    const l = this.lume;
    this.challenge = null;
    this.firefly = null;
    if (win) { this.score += value; this.energy = Math.min(1, this.energy + 0.2); }
    this.emit(win ? 'win' : 'fail', l.x, l.y, value, text);
  }

  private stepChallenge(dt: number): void {
    const c = this.challenge;
    const l = this.lume;
    this.needCooldown = Math.max(0, this.needCooldown - dt);
    if (this.challenge?.kind !== 'tide') this.tide = Math.max(0, this.tide - dt * 0.5);
    if (this.bell) {
      const b = this.bell;
      b.swing = Math.max(0, b.swing - dt * 0.4);
      if (!b.rung && Math.hypot(b.x - l.x, b.y - l.y) < 0.07) {
        if (this.tail.length >= b.need) {
          b.rung = true;
          b.swing = 1;
          // the bell of Vau: everything nearby falls quiet and the stones break
          const top = this.camY, bottom = this.camY + this.H;
          for (const cr of this.creatures) if (cr.y > top && cr.y < bottom) { cr.stun = 4; this.emit('stun', cr.x, cr.y, 0); }
          for (const d of this.debris) if (d.y > top && d.y < bottom) { d.r = 0; this.emit('shatter', d.x, d.y, 10); }
          this.debris = this.debris.filter((d) => d.r > 0);
          this.emit('ring', b.x, b.y, b.need);
          if (c?.kind === 'bell') { c.got = c.total; this.finish(true, b.need * 50, 'O SINO TOCOU'); }
        } else if (this.needCooldown <= 0) {
          this.needCooldown = 1.2;
          this.emit('need', b.x, b.y, b.need - this.tail.length);
        }
      }
      if (b.y < this.camY - 0.3) {
        this.bell = null;
        if (c?.kind === 'bell' && !b.rung) this.finish(false, 0, 'o sino ficou mudo');
      }
    }
    if (!c) return;
    c.t += dt;
    if (c.kind === 'bell') { c.got = Math.min(c.total, this.tail.length); return; }
    if (c.kind === 'constellation') {
      const left = this.lights.filter((o) => o.g).length;
      if (c.got >= c.total) this.finish(true, 250, 'CONSTELAÇÃO COMPLETA');
      else if (c.got + left < c.total) {
        for (const o of this.lights) o.g = 0;
        this.finish(false, 0, 'as estrelas se apagaram');
      }
      return;
    }
    if (c.kind === 'firefly' && this.firefly) {
      const f = this.firefly;
      const tired = Math.min(1, c.t / FIREFLY_TIME);
      const dx = f.x - l.x, dy = f.y - l.y, d = Math.hypot(dx, dy) || 1e-3;
      // it flees when Lume comes close, wanders otherwise, and tires over time
      const flee = d < 0.3 ? (0.3 - d) / 0.3 : 0;
      const sp = 1.9 * (1 - tired * 0.55);
      f.vx += ((dx / d) * flee * sp + Math.sin(this.t * 2.3) * 0.25) * dt;
      f.vy += ((dy / d) * flee * sp + Math.cos(this.t * 1.7) * 0.2) * dt;
      f.vx *= 1 - dt * 2.2; f.vy *= 1 - dt * 2.2;
      f.x += f.vx * dt; f.y += f.vy * dt + this.speed * dt;
      if (f.x < 0.06) { f.x = 0.06; f.vx = Math.abs(f.vx) * 0.3; }
      if (f.x > 0.94) { f.x = 0.94; f.vx = -Math.abs(f.vx) * 0.3; }
      const sy = (f.y - this.camY) / this.H;
      if (sy < 0.15) f.y = this.camY + this.H * 0.15;
      if (sy > 0.85 && c.t < FIREFLY_TIME) f.y = this.camY + this.H * 0.85;
      if (d < LUME_R + 0.035) {
        for (let i = 0; i < 3; i++) { const end = this.tail[this.tail.length - 1] ?? l; this.tail.push({ x: end.x, y: end.y - LINK * 0.5 }); }
        this.bestTail = Math.max(this.bestTail, this.tail.length);
        this.energy = Math.min(1, this.energy + 0.15);
        this.finish(true, 300, 'VAGA-LUME RESGATADO');
      } else if (c.t > FIREFLY_TIME) {
        // it swims off into the dark
        f.vy += dt * 3;
        if (sy > 1.1) this.finish(false, 0, 'ele fugiu para o escuro');
      }
      return;
    }
    if (c.kind === 'tide') {
      const T = TIDE_TIME;
      // creeps in, chases, then lets go
      this.tide = c.t < 1.5 ? c.t * 0.08 : c.t < T - 1.5 ? Math.min(0.62, 0.12 + (c.t - 1.5) * 0.14 + Math.sin(c.t * 2) * 0.03) : Math.max(0, this.tide - dt * 0.5);
      const edge = this.camY + this.tide * this.H;
      if (l.y < edge) {
        this.energy -= dt * 0.45;
        if (this.energy <= 0) { this.end(); return; }
      }
      // the dark swallows the tail it reaches
      for (let i = 0; i < this.tail.length; i++) if (this.tail[i].y < edge - 0.02) { this.cut(i); break; }
      for (const p of this.loose) if (p.y < edge) p.t = Math.min(p.t, 0.3);
      if (c.t >= T) this.finish(true, 150 + this.tail.length * 20, 'VOCÊ ESCAPOU DA MARÉ');
    }
  }

  private wakeLeviathan(): void {
    const dir = this.rng.chance(0.5) ? 1 : -1;
    const warn = 2.2;
    // its body reaches the middle of the screen about a second after the warning ends
    this.leviathan = { y: this.camY + this.H * this.rng.range(0.4, 0.55) + this.speed * (warn + 0.9), x: dir > 0 ? -0.2 : 1.2, dir, warn, len: 1.1, r: 0.075 };
    this.emit('warn', dir > 0 ? 0.05 : 0.95, this.leviathan.y, dir);
  }

  /** The body is a line from the head back along -dir. */
  leviathanHit(x: number, y: number, r: number): boolean {
    const v = this.leviathan;
    if (!v || v.warn > 0) return false;
    const tailX = v.x - v.dir * v.len;
    const lo = Math.min(v.x, tailX), hi = Math.max(v.x, tailX);
    if (x < lo - r || x > hi + r) return false;
    const u = Math.abs(x - v.x) / v.len; // 0 at the head, 1 at the tail
    const thick = v.r * Math.max(0.15, 1 - (2 * u - 1) ** 2);
    const wave = Math.sin(x * 7 - this.t * 4) * 0.02 * u;
    return Math.abs(y - (v.y + wave)) < thick + r;
  }

  private stepLeviathan(dt: number): void {
    if (this.leviathanIn > 0) {
      this.leviathanIn -= dt;
      if (this.leviathanIn <= 0 && !this.leviathan) this.wakeLeviathan();
    }
    const v = this.leviathan;
    if (!v) return;
    if (v.warn > 0) {
      v.warn -= dt;
      if (v.warn <= 0) this.emit('leviathan', v.x, v.y, v.dir);
      return;
    }
    v.x += v.dir * 1.25 * dt;
    const l = this.lume;
    if (this.leviathanHit(l.x, l.y, LUME_R)) this.hurt(0.3 + this.sector * 0.02);
    for (let i = 0; i < this.tail.length; i++) if (this.leviathanHit(this.tail[i].x, this.tail[i].y, LIGHT_R * 0.5)) { this.cut(i); break; }
    const gone = v.dir > 0 ? v.x - v.len > 1.15 : v.x + v.len < -0.15;
    if (gone) {
      this.leviathan = null;
      if (!this.over) { this.score += 100; this.emit('win', l.x, l.y, 100, 'O LEVIATÃ PASSOU'); }
    }
  }

  /** Lays out one band of the descent starting at depth y. */
  private spawn(y: number): void {
    const rng = this.rng;
    const d = Math.min(1, this.camY / (SECTOR_LEN * 4)); // difficulty 0..1 over four sectors
    const calm = this.camY < 2.5;
    if (y > this.nextLantern) {
      this.lanterns.push({ x: rng.range(0.2, 0.8), y: y + 0.2, lit: false });
      this.nextLantern = y + rng.range(7, 10);
      // a breath of calm water with lights before each lantern
      for (let i = 0; i < 4; i++) this.lights.push({ x: rng.range(0.15, 0.85), y: y - 0.3 - i * 0.15, phase: rng.next() * 6 });
      this.nextSpawn = y + 0.7;
      return;
    }
    if (y > this.nextChallenge && !this.challenge && !this.bell && this.nextLantern - y > 2.5 && this.camY > 6) {
      this.nextChallenge = y + rng.range(9, 13);
      this.startChallenge(y);
      return;
    }
    const roll = rng.next();
    if (calm || roll < 0.42 - d * 0.14) {
      const n = rng.int(3, Math.max(3, 6 - Math.round(d * 3))), x0 = rng.range(0.15, 0.85), amp = rng.range(0.05, 0.2), ph = rng.range(0, 6.28);
      for (let i = 0; i < n; i++) this.lights.push({ x: Math.max(0.06, Math.min(0.94, x0 + Math.sin(ph + i * 0.8) * amp)), y: y + i * 0.09, phase: rng.next() * 6 });
      if (!calm && rng.chance(0.45 + d * 0.5)) this.creature(y + rng.range(0.1, 0.45), d);
      if (!calm && d > 0.5 && rng.chance(d - 0.4)) this.creature(y + rng.range(0.2, 0.5), d);
      this.nextSpawn = y + n * 0.09 + rng.range(0.25, 0.45);
      return;
    }
    if (roll < 0.75) {
      const n = 1 + rng.int(Math.round(d), Math.round(1 + d * 3));
      for (let i = 0; i < n; i++) this.creature(y + rng.range(0, 0.5), d);
      if (rng.chance(0.6 - d * 0.25)) this.lights.push({ x: rng.range(0.1, 0.9), y: y + rng.range(0.1, 0.4), phase: 0 });
      this.nextSpawn = y + rng.range(0.45, 0.65) - d * 0.12;
      return;
    }
    // a field of debris with a light hidden among it
    const n = 2 + rng.int(0, 2 + Math.round(d * 2));
    for (let i = 0; i < n; i++) this.debris.push({ x: rng.range(0.06, 0.94), y: y + rng.range(0, 0.55), r: rng.range(0.03, 0.06), a: rng.range(0, 6.28), seed: rng.next() });
    this.lights.push({ x: rng.range(0.15, 0.85), y: y + rng.range(0.15, 0.4), phase: 0 });
    this.nextSpawn = y + rng.range(0.6, 0.8);
  }

  private creature(y: number, d: number): void {
    const rng = this.rng;
    const roll = rng.next();
    const kind: CreatureKind = this.sector >= 1 && roll < 0.25 + d * 0.15 ? 'eel' : roll < 0.65 ? 'jelly' : 'mine';
    const x = rng.range(0.1, 0.9);
    const base = { x, y, x0: x, phase: rng.range(0, 6.28), stun: 0, seed: rng.next(), dir: rng.chance(0.5) ? 1 : -1 };
    if (kind === 'jelly') this.creatures.push({ ...base, kind, r: rng.range(0.04, 0.055) + d * 0.012, speed: rng.range(0.6, 1.2) + d * 0.8 });
    else if (kind === 'mine') this.creatures.push({ ...base, kind, r: rng.range(0.035, 0.05), speed: 0 });
    else this.creatures.push({ ...base, kind, x: base.dir > 0 ? -0.1 : 1.1, r: 0.035, speed: rng.range(0.18, 0.3) + d * 0.15 });
  }
}
