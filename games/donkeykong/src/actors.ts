import { BARREL_W, BARREL_SPEED, BARREL_LADDER_SPEED, FIREBALL_SPEED, PIE_SPEED, SPRING_SPEED, ELEVATOR_SPEED, W } from './config';
import { Stage, Platform, Ladder, yAt, platformUnder, platformBelow, rivetGapAt } from './stages';
import { Rng } from '@arcade/shared';

export interface Barrel {
  x: number; y: number; // centre bottom
  dir: 1 | -1;
  blue: boolean;
  /** -1 when rolling, otherwise the ladder being descended */
  ladder: Ladder | null;
  falling: boolean;
  jumped: boolean; // Mario already scored a jump over it
  alive: boolean;
  phase: number;
}

export interface Fireball {
  x: number; y: number;
  dir: 1 | -1;
  ladder: Ladder | null;
  climbDir: 1 | -1;
  alive: boolean;
  phase: number;
  /** seconds before it may change its mind again */
  thinkT: number;
}

export interface Pie { x: number; y: number; platform: Platform; alive: boolean; jumped: boolean }
export interface Spring { x: number; y: number; vy: number; bounces: number; alive: boolean; jumped: boolean }
export interface ElevatorCar { shaft: number; y: number }

/** Where a barrel lands when it rolls off the end of a platform. */
function drop(stage: Stage, x: number, feet: number): Platform | null {
  return platformBelow(stage, x, feet + 2);
}

export class Actors {
  barrels: Barrel[] = [];
  fireballs: Fireball[] = [];
  pies: Pie[] = [];
  springs: Spring[] = [];
  cars: ElevatorCar[] = [];
  conveyorDir: 1 | -1 = 1;
  private conveyorT = 0;
  rng: Rng;

  constructor(public stage: Stage, seed: number) {
    this.rng = new Rng(seed);
    stage.shafts.forEach((s, i) => {
      for (let k = 0; k < 3; k++) this.cars.push({ shaft: i, y: s.yTop + ((s.yBottom - s.yTop) * k) / 3 });
    });
  }

  // ---------- barrels ----------

  throwBarrel(blue: boolean): void {
    const k = this.stage.kong;
    this.barrels.push({ x: k.x + 44, y: k.y, dir: 1, blue, ladder: null, falling: false, jumped: false, alive: true, phase: 0 });
  }

  updateBarrels(dt: number, speedK: number, marioX: number, marioY: number): void {
    const st = this.stage;
    for (const b of this.barrels) {
      if (!b.alive) continue;
      b.phase += dt * 10;
      if (b.ladder) {
        b.y += BARREL_LADDER_SPEED * speedK * dt;
        if (b.y >= b.ladder.yBottom) { b.y = b.ladder.yBottom; b.ladder = null; b.dir = this.rollDirAt(b.x, b.y); }
        continue;
      }
      if (b.falling) {
        b.y += 120 * dt;
        const p = platformUnder(st, b.x, b.y, 6);
        if (p) { b.y = yAt(p, b.x); b.falling = false; b.dir = this.rollDirAt(b.x, b.y); b.jumped = false; }
        else if (b.y > 260) b.alive = false;
        continue;
      }
      b.x += b.dir * BARREL_SPEED * speedK * dt;
      const p = platformUnder(st, b.x, b.y, 8);
      if (!p) {
        // rolled off the end: drop to the girder below
        const below = drop(st, b.x, b.y);
        if (below) b.falling = true;
        else b.alive = false;
        continue;
      }
      b.y = yAt(p, b.x);
      // the oil drum eats barrels on the bottom girder
      if (st.oilDrum && Math.abs(b.y - st.oilDrum.y) < 2 && b.x < st.oilDrum.x + 16 && b.dir < 0) { b.alive = false; continue; }
      // blue barrels dive down the first ladder; the others take one now and then, more when Mario is below
      for (const l of st.ladders) {
        if (Math.abs(l.yTop - b.y) > 2 || l.broken) continue;
        if (Math.abs(b.x - (l.x + 4)) > 3) continue;
        const below = marioY > b.y + 10 && Math.abs(marioX - b.x) < 40;
        if (b.blue || this.rng.chance(below ? 0.6 : 0.25)) { b.ladder = l; b.x = l.x + 4; b.jumped = false; }
        break;
      }
    }
    this.barrels = this.barrels.filter((b) => b.alive);
  }

  /** Barrels roll downhill; on a flat girder they keep their direction. */
  private rollDirAt(x: number, y: number): 1 | -1 {
    const p = platformUnder(this.stage, x, y, 6);
    if (!p || p.y0 === p.y1) return x > W / 2 ? -1 : 1;
    const downRight = (p.y1 > p.y0) === (p.x1 > p.x0);
    return downRight ? 1 : -1;
  }

  // ---------- fireballs ----------

  spawnFireball(x: number, y: number): void {
    this.fireballs.push({ x, y, dir: this.rng.chance(0.5) ? 1 : -1, ladder: null, climbDir: -1, alive: true, phase: 0, thinkT: 1 });
  }

  updateFireballs(dt: number, speedK: number, marioX: number, marioY: number): void {
    const st = this.stage;
    for (const f of this.fireballs) {
      if (!f.alive) continue;
      f.phase += dt * 8;
      const v = FIREBALL_SPEED * speedK;
      const lad = f.ladder;
      if (lad) {
        f.y += f.climbDir * v * dt;
        if (f.climbDir < 0 && f.y <= lad.yTop) { f.y = lad.yTop; f.ladder = null; }
        if (f.climbDir > 0 && f.y >= lad.yBottom) { f.y = lad.yBottom; f.ladder = null; }
        continue;
      }
      f.thinkT -= dt;
      if (f.thinkT <= 0) {
        f.thinkT = 0.8 + this.rng.next() * 1.5;
        // mostly wander, sometimes head for Mario
        if (this.rng.chance(0.4)) f.dir = marioX < f.x ? -1 : 1;
        else if (this.rng.chance(0.3)) f.dir = -f.dir as 1 | -1;
      }
      const nx = f.x + f.dir * v * dt;
      const p = platformUnder(st, nx, f.y, 8);
      if (!p || rivetGapAt(st, nx, f.y)) { f.dir = -f.dir as 1 | -1; continue; }
      f.x = nx;
      f.y = yAt(p, f.x);
      // ladders: climb towards Mario's floor sometimes
      for (const l of st.ladders) {
        if (l.broken) continue;
        if (Math.abs(f.x - (l.x + 4)) > 2) continue;
        const atTop = Math.abs(l.yTop - f.y) < 2;
        const atBottom = Math.abs(l.yBottom - f.y) < 2;
        if (!atTop && !atBottom) continue;
        const wantUp = marioY < f.y - 8;
        const wantDown = marioY > f.y + 8;
        if (atBottom && (wantUp ? this.rng.chance(0.5) : this.rng.chance(0.1))) { f.ladder = l; f.climbDir = -1; f.x = l.x + 4; }
        else if (atTop && (wantDown ? this.rng.chance(0.5) : this.rng.chance(0.1))) { f.ladder = l; f.climbDir = 1; f.x = l.x + 4; }
        break;
      }
    }
    this.fireballs = this.fireballs.filter((f) => f.alive);
  }

  // ---------- conveyors and pies ----------

  conveyorSpeed(p: Platform, x: number): number {
    if (!p.conveyor) return 0;
    let dir = p.conveyor.dir * this.conveyorDir;
    if (p.conveyor.splitX !== undefined) dir = x < p.conveyor.splitX ? -1 : 1; // the top belt always runs away from Kong
    return dir * PIE_SPEED * p.conveyor.speed;
  }

  updateConveyors(dt: number, speedK: number): void {
    this.conveyorT += dt;
    if (this.conveyorT > 6) { this.conveyorT = 0; this.conveyorDir = -this.conveyorDir as 1 | -1; }
    for (const pie of this.pies) {
      if (!pie.alive) continue;
      pie.x += this.conveyorSpeed(pie.platform, pie.x) * speedK * dt;
      const lo = Math.min(pie.platform.x0, pie.platform.x1);
      const hi = Math.max(pie.platform.x0, pie.platform.x1);
      if (pie.x < lo - 8 || pie.x > hi + 8) pie.alive = false;
    }
    this.pies = this.pies.filter((p) => p.alive);
  }

  dropPie(): void {
    // Kong drops pies onto the top belt; the lower belts get them from the sides
    const belts = this.stage.platforms.filter((p) => p.conveyor);
    const p = this.rng.pick(belts);
    let x: number;
    if (p.conveyor!.splitX !== undefined) x = p.conveyor!.splitX + (this.rng.chance(0.5) ? -6 : 6);
    else x = this.conveyorSpeed(p, 0) > 0 ? Math.min(p.x0, p.x1) : Math.max(p.x0, p.x1);
    this.pies.push({ x, y: yAt(p, x), platform: p, alive: true, jumped: false });
  }

  // ---------- elevators and springs ----------

  updateElevators(dt: number): void {
    for (const c of this.cars) {
      const s = this.stage.shafts[c.shaft];
      c.y += s.dir * ELEVATOR_SPEED * dt;
      if (s.dir > 0 && c.y > s.yBottom) c.y -= s.yBottom - s.yTop;
      if (s.dir < 0 && c.y < s.yTop) c.y += s.yBottom - s.yTop;
    }
  }

  throwSpring(): void {
    const k = this.stage.kong;
    this.springs.push({ x: k.x + 36, y: k.y, vy: -120, bounces: 0, alive: true, jumped: false });
  }

  updateSprings(dt: number, speedK: number): void {
    const top = this.stage.platforms.find((p) => p.y0 === 72)!;
    for (const s of this.springs) {
      if (!s.alive) continue;
      s.x += SPRING_SPEED * speedK * dt;
      s.vy += 400 * dt;
      s.y += s.vy * dt;
      if (s.x < top.x1 - 24 && s.y >= top.y0) { s.y = top.y0; s.vy = -130; s.bounces++; s.jumped = false; }
      if (s.y > 260) s.alive = false;
    }
    this.springs = this.springs.filter((s) => s.alive);
  }

  /** Car top under a point, if any. */
  carUnder(x: number, feet: number): ElevatorCar | null {
    for (const c of this.cars) {
      const s = this.stage.shafts[c.shaft];
      if (x >= s.x && x <= s.x + 16 && c.y >= feet - 1 && c.y <= feet + 5) return c;
    }
    return null;
  }
}

export { BARREL_W };
