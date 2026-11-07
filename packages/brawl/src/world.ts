import { Rng } from '@arcade/shared';
import type { ActorDef, AiDef, ItemDef, ItemKind, MoveDef, RangedDef, StageDef, Team, Wave } from './types';

export const GRAVITY = 520;
export const JUMP_VZ = 190;
export const DASH_TAP = 0.25; // seconds between taps for a dash
export const DEPTH_TOLERANCE = 14; // px of depth within which hits connect
export const GRAB_HOLD = 2.2;
export const DOWN_TIME = 0.7;
export const GETUP_TIME = 0.5;
export const HIT_TIME = 0.32;
export const DIE_TIME = 1.2;

export interface Controls {
  left: boolean; right: boolean; up: boolean; down: boolean;
  attack: boolean; // just pressed
  jump: boolean; // just pressed
  special: boolean; // just pressed
}

export const NO_CONTROLS: Controls = { left: false, right: false, up: false, down: false, attack: false, jump: false, special: false };

export type ActorState =
  | 'idle' | 'walk' | 'run' | 'attack' | 'jump' | 'jumpAttack' | 'dashAttack' | 'hit' | 'fly' | 'down' | 'getup'
  | 'grab' | 'grabbed' | 'knee' | 'throw' | 'thrown' | 'special' | 'die' | 'ride' | 'flee';

export interface Actor {
  id: number;
  def: ActorDef;
  team: Team;
  variant: number;
  x: number; y: number; z: number;
  vx: number; vz: number;
  facing: 1 | -1;
  hp: number; maxHp: number;
  state: ActorState;
  t: number;
  move: string | null;
  moveHits: Set<number>;
  comboQueued: boolean;
  running: boolean;
  tap: { dir: number; t: number };
  invuln: number;
  dead: boolean;
  removeAt: number;
  flicker: boolean;
  partner: Actor | null; // grab partner
  kneeHits: number;
  mount: Actor | null; // what a rider sits on
  rider: Actor | null;
  magic: number;
  lives: number;
  score: number;
  hitsTaken: number;
  stunned: number;
  ai: { cooldown: number; side: 1 | -1; thinkT: number; retreat: number; arrived: boolean };
  weapon: string | null;
  spawnedAt: number;
  wave: number;
  deadBy: Actor | null;
  prevDx: number;
}

export interface Item { id: number; kind: ItemKind; x: number; y: number; value: number; weapon?: string; taken: boolean; bounce: number }

export interface Projectile {
  x: number; y: number; z: number; vx: number; vz: number; damage: number; team: Team; alive: boolean; kind: string;
  /** boomerang: world x where it turns back, and whether it already did */
  turnAt?: number; returning?: boolean;
  from?: Actor | null;
  /** seconds alive, for spinning sprites */
  t: number;
}

export interface Spark { x: number; y: number; z: number; t: number; kind: 'hit' | 'block' | 'pot' }

export interface Hooks {
  onHit?(attacker: Actor, target: Actor, damage: number, knock: string): void;
  onKill?(actor: Actor, by: Actor | null): void;
  onItem?(hero: Actor, item: Item): void;
  onWaveStart?(wave: Wave): void;
  onWaveClear?(wave: Wave): void;
  onStageClear?(): void;
  onHeroDown?(hero: Actor): void;
  onSpecial?(hero: Actor): boolean; // return false to refuse (no magic)
  onThrow?(hero: Actor, target: Actor): void;
  onJump?(actor: Actor): void;
  onSwing?(actor: Actor, move: string): void;
}

export interface DefRegistry { [id: string]: ActorDef }

/** A move by name, honouring the weapon the actor holds (`weaponAttacks` overrides `attacks`). */
export function moveOf(a: Actor, name: string): MoveDef | undefined {
  return (a.weapon ? a.def.weaponAttacks?.[a.weapon]?.[name] : undefined) ?? a.def.attacks[name];
}

let nextId = 1;

/** One stage of a beat'em up: actors, camera, waves, items and the rules that connect them. */
export class Brawl {
  actors: Actor[] = [];
  items: Item[] = [];
  projectiles: Projectile[] = [];
  sparks: Spark[] = [];
  scrollX = 0;
  waveIndex = -1;
  waveT = 0;
  waveActive = false;
  cleared = false;
  time = 0;
  /** "GO" arrow blinks when the way is open */
  goArrow = false;
  private pending: { spawn: Wave['spawns'][number]; at: number }[] = [];
  rng: Rng;

  constructor(public stage: StageDef, public defs: DefRegistry, public W: number, seed: number, public hooks: Hooks = {}, public difficulty = 1) {
    this.rng = new Rng(seed);
    for (const it of stage.items) this.addItem(it);
    for (const m of stage.mounts) {
      const a = this.spawn(m.def, m.x, m.y, 'neutral', m.variant ?? 0);
      a.state = 'idle';
    }
  }

  // ---------- creation ----------

  spawn(defId: string, x: number, y: number, team: Team, variant = 0): Actor {
    const def = this.defs[defId];
    if (!def) throw new Error(`unknown actor ${defId}`);
    const hpScale = team === 'enemy' ? (1 + variant * 0.5) * this.difficulty : 1;
    const a: Actor = {
      id: nextId++, def, team, variant, x, y, z: 0, vx: 0, vz: 0, facing: 1, hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
      state: 'idle', t: 0, move: null, moveHits: new Set(), comboQueued: false, running: false, tap: { dir: 0, t: 99 }, invuln: 0, dead: false,
      removeAt: 0, flicker: false, partner: null, kneeHits: 0, mount: null, rider: null, magic: 0, lives: 0, score: 0, hitsTaken: 0, stunned: 0,
      ai: { cooldown: 1 + this.rng.next(), side: this.rng.chance(0.5) ? 1 : -1, thinkT: 0, retreat: 0, arrived: false }, weapon: null,
      spawnedAt: this.time, wave: this.waveIndex, deadBy: null, prevDx: 0,
    };
    this.actors.push(a);
    return a;
  }

  addHero(defId: string, x: number, y: number): Actor {
    const h = this.spawn(defId, x, y, 'hero');
    return h;
  }

  addItem(it: ItemDef): Item {
    const item: Item = { id: nextId++, kind: it.kind, x: it.x, y: it.y, value: it.value ?? 0, weapon: it.weapon, taken: false, bounce: 0 };
    this.items.push(item);
    return item;
  }

  dropItem(kind: ItemKind, x: number, y: number, value = 0, weapon?: string): Item {
    const item = this.addItem({ kind, x, y, value, weapon });
    item.bounce = 1; // little hop when dropped
    return item;
  }

  /** A knocked-down actor loses the weapon it holds; it lands next to it, ready to be picked up again. */
  private dropWeapon(a: Actor): void {
    if (!a.weapon) return;
    const w = a.weapon;
    a.weapon = null;
    const x = Math.max(this.scrollX + 12, Math.min(this.scrollX + this.W - 12, a.x - a.facing * 12));
    this.dropItem('weapon', x, Math.max(this.stage.floorTop, Math.min(this.stage.floorBottom, a.y)), 0, w);
  }

  get heroes(): Actor[] {
    return this.actors.filter((a) => a.team === 'hero' && !a.dead);
  }

  get enemies(): Actor[] {
    return this.actors.filter((a) => a.team === 'enemy' && !a.dead);
  }

  get currentWave(): Wave | null {
    return this.waveIndex >= 0 && this.waveIndex < this.stage.waves.length ? this.stage.waves[this.waveIndex] : null;
  }

  /** The camera cannot pass the next uncleared wave. */
  get scrollMax(): number {
    const next = this.waveActive ? this.currentWave : this.stage.waves[this.waveIndex + 1];
    const lock = next ? next.at - this.W : this.stage.length - this.W;
    return Math.max(0, Math.min(this.stage.length - this.W, lock));
  }

  // ---------- update ----------

  update(dt: number, controls: Map<number, Controls>): void {
    this.time += dt;
    for (const a of this.actors) {
      if (a.dead) continue;
      const c = a.team === 'hero' ? (controls.get(a.id) ?? NO_CONTROLS) : null;
      this.updateActor(a, dt, c);
    }
    this.resolveHits();
    this.updateProjectiles(dt);
    this.updateItems(dt);
    this.updateCamera(dt);
    this.updateWaves(dt);
    this.sparks = this.sparks.filter((s) => (s.t += dt) < 0.35);
    this.actors = this.actors.filter((a) => !a.dead || this.time < a.removeAt);
  }

  private updateActor(a: Actor, dt: number, c: Controls | null): void {
    a.t += dt;
    a.invuln = Math.max(0, a.invuln - dt);
    a.tap.t += dt;
    // vertical: gravity for airborne states
    const airborne = a.state === 'jump' || a.state === 'jumpAttack' || a.state === 'fly' || a.state === 'thrown';
    if (airborne) {
      a.vz -= GRAVITY * dt;
      a.z += a.vz * dt;
      a.x += a.vx * dt;
      if (a.z <= 0) {
        a.z = 0;
        a.vz = 0;
        this.land(a);
      }
    } else if (a.z > 0) {
      a.z = Math.max(0, a.z - GRAVITY * dt * dt * 10);
    }
    if (a.rider && a.state !== 'ride') { /* mount carries its rider */ }

    switch (a.state) {
      case 'idle':
      case 'walk':
      case 'run':
        if (c) this.heroMove(a, dt, c);
        else if (a.team === 'enemy') this.enemyThink(a, dt);
        break;
      case 'flee': this.fleeMove(a, dt); break;
      case 'attack':
      case 'dashAttack': {
        const mv = this.moveDef(a);
        if (!mv) { this.setState(a, 'idle'); break; }
        if (mv.lunge) a.x += a.facing * mv.lunge * dt;
        if (c?.attack && mv.chain) a.comboQueued = true; // buffered: the next hit starts when this one ends
        if (a.t >= mv.duration) {
          if (a.comboQueued && mv.chain) this.startMove(a, mv.chain, 'attack');
          else this.setState(a, 'idle');
        }
        break;
      }
      case 'jump':
        if (c?.attack && moveOf(a, 'jumpAttack')) this.startMove(a, 'jumpAttack', 'jumpAttack');
        break;
      case 'jumpAttack': break;
      case 'hit':
        a.x += a.vx * dt; a.vx *= 0.8;
        if (a.t >= HIT_TIME) this.setState(a, 'idle');
        break;
      case 'fly': a.vx *= 0.995; break;
      case 'down':
        if (a.t >= DOWN_TIME) {
          if (a.hp <= 0) this.kill(a, null);
          else this.setState(a, 'getup');
        }
        break;
      case 'getup':
        a.invuln = 0.3;
        if (a.t >= GETUP_TIME) this.setState(a, 'idle');
        break;
      case 'grab': {
        const p = a.partner;
        if (!p || p.dead || p.state !== 'grabbed') { a.partner = null; this.setState(a, 'idle'); break; }
        p.x = a.x + a.facing * 14; p.y = a.y; p.facing = -a.facing as 1 | -1;
        if (c) {
          if (c.attack) this.startMove(a, 'knee', 'knee');
          else if (c.jump || (c.left && a.facing > 0) || (c.right && a.facing < 0)) this.throwPartner(a, c.left ? -1 : c.right ? 1 : a.facing);
          else if (a.t >= GRAB_HOLD) { this.release(a); }
        } else if (a.t >= 1.2) {
          // enemies holding the hero: squeeze then let go
          if (p.team === 'hero') { this.damage(a, p, 1, 'down', 60); }
          this.release(a);
        }
        break;
      }
      case 'grabbed': {
        const g = a.partner;
        if (!g || g.dead || (g.state !== 'grab' && g.state !== 'knee' && g.state !== 'throw')) { a.partner = null; this.setState(a, 'idle'); }
        else if (c && (c.left || c.right || c.attack) && this.rng.chance(dt * 1.5)) { this.release(g); this.setState(a, 'idle'); }
        break;
      }
      case 'knee': {
        const mv = a.def.attacks.knee;
        if (a.t >= (mv?.duration ?? 0.3)) {
          a.kneeHits++;
          if (a.kneeHits >= 3) this.throwPartner(a, a.facing);
          else this.setState(a, 'grab');
        }
        break;
      }
      case 'throw': {
        const mv = a.def.attacks.throw;
        if (a.t >= (mv?.duration ?? 0.6)) this.setState(a, 'idle');
        break;
      }
      case 'thrown': break;
      case 'special':
        if (a.t >= 1.2) this.setState(a, 'idle');
        break;
      case 'die':
        if (a.t >= DIE_TIME && !a.dead) { a.dead = true; a.removeAt = this.time; }
        break;
      case 'ride': {
        const m = a.mount;
        if (!m || m.dead) { a.mount = null; this.setState(a, 'idle'); break; }
        if (c) this.rideMove(a, m, dt, c);
        break;
      }
    }
    // stay on the floor band; heroes stay on screen
    a.y = Math.max(this.stage.floorTop, Math.min(this.stage.floorBottom, a.y));
    if (a.team === 'hero') a.x = Math.max(this.scrollX + 10, Math.min(this.scrollX + this.W - 10, a.x));
    else a.x = Math.max(-40, Math.min(this.stage.length + 40, a.x));
    if (a.rider) { const m = a.def.mount; a.rider.x = a.x - a.facing * (m?.seatX ?? 0); a.rider.y = a.y; a.rider.z = a.z + (m?.seat ?? 14); a.rider.facing = a.facing; }
  }

  private heroMove(a: Actor, dt: number, c: Controls): void {
    const dx = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const dy = (c.down ? 1 : 0) - (c.up ? 1 : 0);
    // double tap to run: two presses of the same direction within DASH_TAP
    if (dx !== 0 && a.prevDx === 0) {
      if (a.tap.dir === dx && a.tap.t < DASH_TAP) a.running = true;
      a.tap = { dir: dx, t: 0 };
    }
    a.prevDx = dx;
    if (dx === 0) a.running = false;
    const speed = a.def.speed * (a.running ? 1.9 : 1);
    if (dx !== 0) a.facing = dx as 1 | -1;
    a.x += dx * speed * dt;
    a.y += dy * speed * 0.62 * dt;
    const moving = dx !== 0 || dy !== 0;
    const want: ActorState = a.running && dx !== 0 ? 'run' : moving ? 'walk' : 'idle';
    if (a.state !== want) { a.state = want; if (want !== 'walk' || a.t > 1) a.t = 0; }
    if (c.attack) {
      if (a.running) this.startMove(a, 'dashAttack', 'dashAttack');
      else this.startMove(a, 'combo1', 'attack');
      return;
    }
    if (c.jump) {
      if (!this.tryMount(a)) {
        a.vz = JUMP_VZ;
        a.vx = dx * speed * 0.9;
        this.setState(a, 'jump');
        this.hooks.onJump?.(a);
      }
      return;
    }
    if (c.special) {
      if (this.hooks.onSpecial?.(a)) this.setState(a, 'special');
      return;
    }
    // walking into a grabbable enemy grabs it
    if (moving) this.tryGrab(a);
  }

  private rideMove(a: Actor, m: Actor, dt: number, c: Controls): void {
    const dx = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const dy = (c.down ? 1 : 0) - (c.up ? 1 : 0);
    const speed = m.def.mount?.speed ?? m.def.speed;
    if (dx !== 0) m.facing = dx as 1 | -1;
    m.x += dx * speed * dt;
    m.y += dy * speed * 0.6 * dt;
    m.y = Math.max(this.stage.floorTop, Math.min(this.stage.floorBottom, m.y));
    m.x = Math.max(this.scrollX + 16, Math.min(this.scrollX + this.W - 16, m.x));
    m.state = dx !== 0 || dy !== 0 ? 'walk' : 'idle';
    if (c.attack && m.def.mount) {
      // the beast attacks; the rider stays seated
      const mv = m.def.mount.attack;
      m.def.attacks.mountAttack = mv;
      this.startMove(m, 'mountAttack', 'attack');
    }
    if (c.jump) {
      // dismount: hop off forward
      a.mount = null;
      m.rider = null;
      m.state = 'idle';
      a.z = 14; a.vz = JUMP_VZ * 0.7; a.vx = a.facing * 60;
      this.setState(a, 'jump');
    }
  }

  private fleeMove(a: Actor, dt: number): void {
    // thieves: run away from the nearest hero, bounce off the screen edges
    const h = this.nearestHero(a);
    if (h && Math.abs(h.x - a.x) < 60 && this.rng.chance(dt * 2)) a.facing = (a.x < h.x ? -1 : 1);
    if (this.rng.chance(dt * 0.6)) a.facing = -a.facing as 1 | -1;
    a.x += a.facing * a.def.speed * dt;
    a.y += Math.sin(this.time * 3 + a.id) * 20 * dt;
    if (a.x < this.scrollX + 12) a.facing = 1;
    if (a.x > this.scrollX + this.W - 12) a.facing = -1;
  }

  private tryMount(a: Actor): boolean {
    for (const m of this.actors) {
      if (m.dead || !m.def.mount || m.rider || m === a) continue;
      if (Math.abs(m.x - a.x) < 22 && Math.abs(m.y - a.y) < DEPTH_TOLERANCE) {
        a.mount = m; m.rider = a; m.team = a.team;
        this.setState(a, 'ride');
        a.z = 14;
        return true;
      }
    }
    return false;
  }

  /** Knocks a rider off a mount (the mount wanders back to neutral). */
  private unseat(m: Actor): void {
    const r = m.rider;
    if (!r) return;
    r.mount = null; m.rider = null; m.team = 'neutral';
    r.z = 10; r.vz = 120; r.vx = -r.facing * 80;
    this.setState(r, 'fly');
  }

  private tryGrab(a: Actor): boolean {
    for (const e of this.actors) {
      if (e === a || e.dead || e.team === a.team || !e.def.grabbable || e.def.ai?.armor) continue;
      if (e.state !== 'idle' && e.state !== 'walk' && e.state !== 'hit') continue;
      if (e.z > 4) continue;
      if (Math.abs(e.y - a.y) > 8) continue;
      const ahead = (e.x - a.x) * a.facing;
      if (ahead < 4 || ahead > 18) continue;
      a.partner = e; e.partner = a; a.kneeHits = 0;
      this.setState(a, 'grab'); this.setState(e, 'grabbed');
      e.vx = 0;
      return true;
    }
    return false;
  }

  private release(g: Actor): void {
    const p = g.partner;
    if (p) { p.partner = null; if (p.state === 'grabbed') this.setState(p, 'idle'); }
    g.partner = null;
    this.setState(g, 'idle');
  }

  private throwPartner(g: Actor, dir: number): void {
    const p = g.partner;
    if (!p) { this.setState(g, 'idle'); return; }
    g.facing = (dir || g.facing) as 1 | -1;
    p.partner = null; g.partner = null;
    this.startMove(g, 'throw', 'throw');
    p.facing = g.facing;
    p.x = g.x + g.facing * 6;
    p.vx = g.facing * 230; p.vz = 150; p.z = 8;
    this.setState(p, 'thrown');
    this.hooks.onThrow?.(g, p);
  }

  private land(a: Actor): void {
    switch (a.state) {
      case 'jump': case 'jumpAttack': a.vx = 0; this.setState(a, 'idle'); break;
      case 'fly': a.vx = 0; this.setState(a, 'down'); break;
      case 'thrown': {
        a.vx = 0;
        this.dropWeapon(a);
        // a thrown body bowls over whoever it lands on
        for (const o of this.actors) {
          if (o === a || o.dead || o.team === a.team && o.team === 'hero') continue;
          if (o.team !== a.team && o.team !== 'neutral' && o.state !== 'down' && o.state !== 'fly' && Math.abs(o.x - a.x) < 22 && Math.abs(o.y - a.y) < DEPTH_TOLERANCE) this.damage(a, o, 2, 'down', 90);
        }
        a.hp -= 2;
        this.setState(a, 'down');
        break;
      }
    }
  }

  // ---------- moves ----------

  private moveDef(a: Actor): MoveDef | null {
    return a.move ? moveOf(a, a.move) ?? null : null;
  }

  startMove(a: Actor, move: string, state: ActorState): void {
    const mv = moveOf(a, move);
    if (!mv) return;
    a.move = move;
    a.moveHits = new Set();
    a.comboQueued = false;
    a.running = false;
    this.setState(a, state);
    this.hooks.onSwing?.(a, move);
  }

  setState(a: Actor, s: ActorState): void {
    a.state = s;
    a.t = 0;
    if (s !== 'attack' && s !== 'jumpAttack' && s !== 'dashAttack' && s !== 'knee' && s !== 'throw') a.move = null;
  }

  /** Attack box in world coordinates for the current move, if it is active now. */
  activeBox(a: Actor): { x0: number; x1: number; z0: number; z1: number; frame: MoveDef['frames'][number] } | null {
    const mv = this.moveDef(a);
    if (!mv) return null;
    for (const f of mv.frames) {
      if (a.t < f.start || a.t > f.end) continue;
      const b = f.box;
      const x0 = a.facing > 0 ? a.x + b.x : a.x - b.x - b.w;
      return { x0, x1: x0 + b.w, z0: a.z + b.y, z1: a.z + b.y + b.h, frame: f };
    }
    return null;
  }

  private bodyBox(a: Actor): { x0: number; x1: number; z0: number; z1: number } {
    const w = a.def.width;
    return { x0: a.x - w / 2, x1: a.x + w / 2, z0: a.z, z1: a.z + a.def.height };
  }

  private resolveHits(): void {
    for (const a of this.actors) {
      if (a.dead) continue;
      const box = this.activeBox(a);
      if (!box) continue;
      for (const t of this.actors) {
        if (t === a || t.dead || a.moveHits.has(t.id)) continue;
        if (t.team === a.team && t.team !== 'neutral') continue;
        if (t.team === 'neutral' && a.team !== 'hero') continue;
        if (t.rider === a || a.mount === t) continue;
        if (t.invuln > 0 || t.state === 'down' || t.state === 'getup' || t.state === 'die' || t.state === 'thrown' || t.state === 'fly') continue;
        if (Math.abs(t.y - a.y) > DEPTH_TOLERANCE) continue;
        const b = this.bodyBox(t);
        if (box.x1 < b.x0 || box.x0 > b.x1 || box.z1 < b.z0 || box.z0 > b.z1) continue;
        a.moveHits.add(t.id);
        const dmgScale = a.team === 'enemy' ? 1 + a.variant * 0.25 : 1;
        this.damage(a, t, Math.round(box.frame.damage * dmgScale), box.frame.knock, box.frame.push, box.frame.stun);
      }
    }
  }

  damage(from: Actor | null, t: Actor, dmg: number, knock: string, push: number, stun = 0): void {
    if (t.dead || t.state === 'die') return;
    const dir = from ? (t.x >= from.x ? 1 : -1) : -t.facing;
    // thieves drop their loot and run
    if (t.team === 'neutral' && t.def.ai?.flee) {
      const drop = t.def.drop;
      if (drop) this.dropItem(drop.kind, t.x, t.y, drop.value ?? 0);
      t.hitsTaken++;
      t.facing = dir as 1 | -1;
      this.sparks.push({ x: t.x, y: t.y, z: t.z + 20, t: 0, kind: 'pot' });
      if (t.hitsTaken >= 3) { t.dead = true; t.removeAt = this.time; }
      this.hooks.onHit?.(from ?? t, t, 0, 'flee');
      return;
    }
    // a mounted beast throws its rider
    if (t.rider) this.unseat(t);
    if (t.mount) { const m = t.mount; this.unseat(m); }
    if (t.partner) { const p = t.partner; this.release(t.state === 'grab' ? t : p); }
    t.hp -= dmg;
    t.hitsTaken++;
    t.facing = -dir as 1 | -1;
    this.sparks.push({ x: t.x, y: t.y, z: t.z + t.def.height * 0.6, t: 0, kind: 'hit' });
    this.hooks.onHit?.(from ?? t, t, dmg, knock);
    const armor = t.def.ai?.armor ?? 0;
    const shrug = armor > 0 && t.hitsTaken % (armor + 1) !== 0 && knock === 'hit';
    if (stun > 0 && !armor) t.stunned = Math.max(t.stunned, stun);
    if (t.hp <= 0 || knock === 'down' || knock === 'launch') this.dropWeapon(t);
    if (t.hp <= 0) {
      t.vx = dir * 140; t.vz = 150; t.z = Math.max(t.z, 1);
      this.setState(t, 'fly');
      t.hp = 0;
      t.deadBy = from;
    } else if (knock === 'hit' && !shrug) {
      t.vx = dir * push;
      this.setState(t, 'hit');
      t.hitsTaken = t.hitsTaken; // stagger
      if (t.team === 'enemy' && t.hitsTaken % 4 === 0) { t.vx = dir * push; t.vz = 120; t.z = Math.max(t.z, 1); this.setState(t, 'fly'); }
    } else if (knock === 'down' || knock === 'launch') {
      t.vx = dir * push; t.vz = knock === 'launch' ? 200 : 130; t.z = Math.max(t.z, 1);
      this.setState(t, 'fly');
    }
  }

  kill(a: Actor, by: Actor | null): void {
    if (a.state === 'die' || a.dead) return;
    this.setState(a, 'die');
    a.flicker = true;
    this.hooks.onKill?.(a, by ?? a.deadBy ?? null);
    if (a.team === 'hero') this.hooks.onHeroDown?.(a);
  }

  // ---------- enemies ----------

  private nearestHero(a: Actor): Actor | null {
    let best: Actor | null = null;
    let bd = Infinity;
    for (const h of this.heroes) {
      if (h.state === 'die') continue;
      const d = Math.abs(h.x - a.x) + Math.abs(h.y - a.y) * 2;
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  private enemyThink(a: Actor, dt: number): void {
    const ai: AiDef = a.def.ai ?? { range: 24, cooldown: 1.2, flank: 0.3, caution: 0.2, approach: 1 };
    const h = this.nearestHero(a);
    const s = a.ai;
    s.cooldown -= dt;
    s.thinkT -= dt;
    s.retreat = Math.max(0, s.retreat - dt);
    if (!h) { a.state = 'idle'; return; }
    if (a.stunned > 0) { a.stunned -= dt; a.state = 'idle'; return; } // dazed (pepper in the eyes)
    if (s.thinkT <= 0) {
      s.thinkT = 0.6 + this.rng.next() * 0.8;
      if (this.rng.chance(ai.flank)) s.side = -s.side as 1 | -1;
      // step back when the hero swings in our direction
      if ((h.state === 'attack' || h.state === 'dashAttack') && h.facing === (a.x > h.x ? 1 : -1) && this.rng.chance(ai.caution)) s.retreat = 0.5;
    }
    const target = h.mount ?? h;
    // ranged enemies keep their distance and shoot
    if (ai.ranged && !ai.ranged.mixed) {
      const d = Math.abs(target.x - a.x);
      a.facing = target.x > a.x ? 1 : -1;
      if (Math.abs(target.y - a.y) > 6) a.y += Math.sign(target.y - a.y) * a.def.speed * 0.5 * dt;
      if (d < ai.ranged.range * 0.6) { a.x -= a.facing * a.def.speed * dt; a.state = 'walk'; }
      else if (d > ai.ranged.range) { a.x += a.facing * a.def.speed * dt; a.state = 'walk'; }
      else {
        a.state = 'idle';
        if (s.cooldown <= 0) {
          s.cooldown = ai.cooldown;
          this.fire(a, ai.ranged);
        }
      }
      return;
    }
    // melee: come to the chosen side of the hero at attack range, lined up in depth
    const wantX = target.x + s.side * ai.range;
    const ddx = wantX - a.x;
    const ddy = target.y - a.y;
    const speed = a.def.speed * ai.approach * (s.retreat > 0 ? -0.6 : 1);
    let moved = false;
    if (Math.abs(ddy) > 3) { a.y += Math.sign(ddy) * Math.min(Math.abs(ddy), speed * 0.6 * dt); moved = true; }
    if (Math.abs(ddx) > 3) { a.x += Math.sign(ddx) * Math.min(Math.abs(ddx), Math.abs(speed) * dt); moved = true; }
    a.facing = target.x > a.x ? 1 : -1;
    a.state = moved ? 'walk' : 'idle';
    const inRange = Math.abs(target.x - a.x) <= ai.range + 6 && Math.abs(ddy) <= 6;
    // mixed fighters (fire breathers) shoot when the hero is lined up but out of reach
    if (ai.ranged && s.cooldown <= 0 && !inRange && Math.abs(ddy) <= 8 && Math.abs(target.x - a.x) <= ai.ranged.range && Math.abs(target.x - a.x) > ai.range + 16) {
      s.cooldown = ai.cooldown * (0.8 + this.rng.next() * 0.4) / this.difficulty;
      this.fire(a, ai.ranged);
      return;
    }
    if (inRange && s.cooldown <= 0 && s.retreat <= 0) {
      s.cooldown = ai.cooldown * (0.7 + this.rng.next() * 0.6) / this.difficulty;
      if (ai.grabs && target.team === 'hero' && !target.mount && this.rng.chance(0.25) && (target.state === 'idle' || target.state === 'walk')) {
        a.partner = target; target.partner = a; a.kneeHits = 0;
        this.setState(a, 'grab'); this.setState(target, 'grabbed');
        return;
      }
      const moves = Object.keys(a.def.attacks).filter((k) => k.startsWith('combo') || k === 'jumpAttack' && false);
      const pick = this.rng.pick(moves.length ? moves : ['combo1']);
      this.startMove(a, pick, 'attack');
    }
  }

  /** Throws/shoots the actor's ranged attack: one projectile, or a burst, optionally one that comes back. */
  private fire(a: Actor, r: RangedDef): void {
    const n = Math.max(1, r.burst ?? 1);
    for (let i = 0; i < n; i++) {
      this.projectiles.push({
        x: a.x + a.facing * (10 - i * 14), y: a.y, z: r.height, vx: a.facing * r.speed, vz: 0, damage: r.damage, team: a.team, alive: true,
        kind: r.kind ?? 'shot', turnAt: r.returns ? a.x + a.facing * r.range : undefined, returning: false, from: a, t: 0,
      });
    }
    if (r.move && moveOf(a, r.move)) this.startMove(a, r.move, 'attack');
    this.hooks.onSwing?.(a, 'ranged');
  }

  // ---------- projectiles, items, camera, waves ----------

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.t += dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.turnAt !== undefined && !p.returning && (p.vx > 0 ? p.x >= p.turnAt : p.x <= p.turnAt)) { p.vx = -p.vx; p.returning = true; }
      if (p.returning && (!p.from || p.from.dead || (p.vx > 0 ? p.x >= p.from.x : p.x <= p.from.x))) { p.alive = false; continue; }
      if (p.x < this.scrollX - 40 || p.x > this.scrollX + this.W + 40) { p.alive = false; continue; }
      for (const t of this.actors) {
        if (t.dead || (t.team === p.team) || t.team === 'neutral') continue;
        if (t.invuln > 0 || t.state === 'down' || t.state === 'getup' || t.state === 'fly') continue;
        if (Math.abs(t.y - p.y) > DEPTH_TOLERANCE) continue;
        const b = this.bodyBox(t);
        if (p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1) continue;
        p.alive = false;
        this.damage(null, t, p.damage, 'down', 80);
        break;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private updateItems(dt: number): void {
    for (const it of this.items) {
      if (it.taken) continue;
      it.bounce = Math.max(0, it.bounce - dt * 2);
      for (const h of this.heroes) {
        if (h.state !== 'idle' && h.state !== 'walk' && h.state !== 'run') continue;
        if (Math.abs(h.x - it.x) < 12 && Math.abs(h.y - it.y) < 10) {
          if (it.kind === 'weapon') {
            if (h.weapon || it.bounce > 0) continue; // one weapon at a time; a dropped one is picked up after it settles
            h.weapon = it.weapon ?? null;
          }
          it.taken = true;
          this.hooks.onItem?.(h, it);
          break;
        }
      }
    }
    this.items = this.items.filter((i) => !i.taken);
  }

  private updateCamera(dt: number): void {
    const hs = this.heroes;
    if (!hs.length) return;
    const lead = Math.max(...hs.map((h) => h.x));
    const want = lead - this.W * 0.42;
    const max = this.scrollMax;
    if (want > this.scrollX) this.scrollX = Math.min(max, this.scrollX + Math.min(want - this.scrollX, 220 * dt));
    this.goArrow = !this.waveActive && this.scrollX < max && Math.floor(this.time * 2) % 2 === 0;
  }

  private updateWaves(dt: number): void {
    if (this.cleared) return;
    if (!this.waveActive) {
      const next = this.stage.waves[this.waveIndex + 1];
      if (next && this.scrollX >= next.at - this.W - 1) {
        this.waveIndex++;
        this.waveActive = true;
        this.waveT = 0;
        this.pending = next.spawns.map((spawn) => ({ spawn, at: spawn.delay ?? 0 }));
        this.hooks.onWaveStart?.(next);
      } else if (!next && this.scrollX >= this.stage.length - this.W - 1) {
        this.cleared = true;
        this.hooks.onStageClear?.();
      }
      return;
    }
    this.waveT += dt;
    for (const p of this.pending) {
      if (this.waveT < p.at) continue;
      const sp = p.spawn;
      const x = sp.side < 0 ? this.scrollX - 24 : this.scrollX + this.W + 24;
      const e = this.spawn(sp.def, x, sp.y, 'enemy', sp.variant ?? 0);
      e.facing = sp.side < 0 ? 1 : -1;
      e.wave = this.waveIndex;
    }
    this.pending = this.pending.filter((p) => this.waveT < p.at);
    if (this.pending.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      const w = this.currentWave!;
      this.hooks.onWaveClear?.(w);
      if (this.waveIndex === this.stage.waves.length - 1 && this.stage.length - this.W <= this.scrollX + 1) {
        this.cleared = true;
        this.hooks.onStageClear?.();
      }
    }
  }

  /** Damages every enemy on screen (magic, police car). Returns how many were hit. */
  blast(from: Actor, dmg: number, knock: 'down' | 'launch' = 'launch'): number {
    let n = 0;
    for (const e of this.actors) {
      if (e.dead || e.team !== 'enemy') continue;
      if (e.x < this.scrollX - 20 || e.x > this.scrollX + this.W + 20) continue;
      this.damage(from, e, dmg, knock, 60);
      n++;
    }
    return n;
  }
}
