import {
  W, WORLD_W, FEET, ROOF, ESC_SIDE, ESC_W, ESC_MARGIN, ESC_TIME, ELEV_X, ELEV_DWELL, ELEV_TRAVEL, ELEV_TOP,
  HARRY_W, HARRY_START_X, CART_W, CART_H, BALL_W, BALL_H, RADIO_W, RADIO_H, PLANE_W, PLANE_H, PLANE_ALT, LOOT_W, LOOT_H,
  harrySpeed, cartSpeed, ballSpeed, ballBounce, planeSpeed, spawnInterval, maxObstacles, hasPlanes, hasRadios, screenOf,
} from './config';
import { Rng } from '@arcade/shared';

export interface Rect { x: number; y: number; w: number; h: number }

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** World x range [bottom, top] of the escalator that leaves `floor` upwards. */
export function escalatorRange(floor: number): { x0: number; x1: number; side: 1 | -1 } {
  const side = ESC_SIDE[floor];
  if (side > 0) return { x0: WORLD_W - ESC_MARGIN - ESC_W, x1: WORLD_W - ESC_MARGIN, side };
  return { x0: ESC_MARGIN + ESC_W, x1: ESC_MARGIN, side };
}

/** Floor-walker shared by Kelly and Harry: x is the left edge, feet the baseline. */
export interface Walker {
  x: number;
  feet: number;
  floor: number;
  facing: 1 | -1;
  /** Escalator ride progress 0..1, or -1 when not riding. */
  ride: number;
}

export function rideEscalator(wk: Walker, dt: number, width: number): boolean {
  const esc = escalatorRange(wk.floor);
  wk.ride = Math.min(1, wk.ride + dt / ESC_TIME);
  wk.x = esc.x0 + (esc.x1 - esc.x0) * wk.ride - (esc.side > 0 ? width : 0);
  wk.feet = FEET[wk.floor] + (FEET[wk.floor + 1] - FEET[wk.floor]) * wk.ride;
  if (wk.ride >= 1) {
    wk.floor++;
    wk.feet = FEET[wk.floor];
    wk.ride = -1;
    return true;
  }
  return false;
}

/** Is the walker's front foot on the escalator entrance of its floor? */
export function atEscalator(wk: Walker, width: number): boolean {
  if (wk.floor >= ROOF) return false;
  const esc = escalatorRange(wk.floor);
  const front = esc.side > 0 ? wk.x + width : wk.x;
  return esc.side > 0 ? front >= esc.x0 && wk.facing > 0 : front <= esc.x0 && wk.facing < 0;
}

// ---------- the elevator ----------

export class Elevator {
  floor = 0; // floor it is at or just left
  target = 1;
  /** 0..1 progress between floor and target; doors open while dwelling. */
  progress = 0;
  dwell = ELEV_DWELL;
  dir: 1 | -1 = 1;

  get open(): boolean {
    return this.dwell > 0;
  }

  get feet(): number {
    return FEET[this.floor] + (FEET[this.target] - FEET[this.floor]) * this.progress;
  }

  update(dt: number): void {
    if (this.dwell > 0) {
      this.dwell -= dt;
      return;
    }
    this.progress += dt / ELEV_TRAVEL;
    if (this.progress >= 1) {
      this.floor = this.target;
      this.progress = 0;
      this.dwell = ELEV_DWELL;
      if (this.floor >= ELEV_TOP) this.dir = -1;
      if (this.floor <= 0) this.dir = 1;
      this.target = this.floor + this.dir;
    }
  }
}

// ---------- Harry Hooligan ----------

export interface Harry extends Walker {
  escaped: boolean;
  /** Seconds before he may turn around again. */
  cooldown: number;
  phase: number;
}

export function newHarry(): Harry {
  return { x: HARRY_START_X, feet: FEET[0], floor: 0, facing: 1, ride: -1, escaped: false, cooldown: 0, phase: 0 };
}

/**
 * Harry runs to the escalator of his floor and rides up until the roof, then runs off the left edge.
 * From the 2nd krook he is crafty: if Kelly blocks his way on the same floor he turns around for a while.
 */
export function updateHarry(h: Harry, dt: number, krook: number, kellyX: number | null): void {
  if (h.escaped) return;
  h.phase += dt * 9;
  if (h.ride >= 0) {
    rideEscalator(h, dt, HARRY_W);
    if (h.ride < 0) h.facing = h.floor >= ROOF ? -1 : ESC_SIDE[h.floor];
    return;
  }
  const speed = harrySpeed(krook);
  h.cooldown = Math.max(0, h.cooldown - dt);
  if (h.floor >= ROOF) {
    h.facing = -1;
    h.x -= speed * dt;
    if (h.x < -HARRY_W) h.escaped = true;
    return;
  }
  const esc = escalatorRange(h.floor);
  if (krook >= 2 && kellyX !== null && h.cooldown <= 0) {
    const ahead = (kellyX - h.x) * h.facing;
    const blocked = ahead > 0 && ahead < 90 && (esc.side === h.facing);
    if (blocked) { h.facing = -h.facing as 1 | -1; h.cooldown = 2.5 + Math.min(3, krook * 0.3); }
  }
  h.x += h.facing * speed * dt;
  if (h.facing === esc.side && atEscalator(h, HARRY_W)) { h.ride = 0; return; }
  // dead end: turn back towards the escalator
  if (h.x <= ESC_MARGIN && h.facing < 0) { h.x = ESC_MARGIN; h.facing = 1; }
  if (h.x + HARRY_W >= WORLD_W - ESC_MARGIN && h.facing > 0) { h.x = WORLD_W - ESC_MARGIN - HARRY_W; h.facing = -1; }
}

// ---------- obstacles and loot ----------

export type ObstacleKind = 'cart' | 'ball' | 'radio' | 'plane';

export interface Obstacle {
  kind: ObstacleKind;
  floor: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  /** beach ball bounce phase */
  phase: number;
  bounce: number;
}

export interface Loot {
  kind: 'bag' | 'case';
  floor: number;
  x: number;
  taken: boolean;
}

export function obstacleRect(o: Obstacle): Rect {
  const feet = FEET[o.floor];
  switch (o.kind) {
    case 'cart': return { x: o.x, y: feet - CART_H, w: CART_W, h: CART_H };
    case 'radio': return { x: o.x, y: feet - RADIO_H, w: RADIO_W, h: RADIO_H };
    case 'plane': return { x: o.x, y: feet - PLANE_ALT - PLANE_H, w: PLANE_W, h: PLANE_H };
    case 'ball': {
      const lift = o.bounce * Math.abs(Math.sin(o.phase));
      return { x: o.x, y: feet - BALL_H - lift, w: BALL_W, h: BALL_H };
    }
  }
}

export function lootRect(l: Loot): Rect {
  return { x: l.x, y: FEET[l.floor] - LOOT_H, w: LOOT_W, h: LOOT_H };
}

export class Store {
  obstacles: Obstacle[] = [];
  loot: Loot[] = [];
  elevator = new Elevator();
  private spawnT = 0;
  private rng: Rng;

  constructor(public krook: number, seed: number) {
    this.rng = new Rng(seed);
    this.spawnT = 1.0;
    this.placeStatics();
  }

  private placeStatics(): void {
    // loot on the floors Harry runs through, radios from the 3rd krook
    const floors = [0, 1, 2];
    for (let i = 0; i < 3; i++) {
      const floor = floors[i];
      const x = this.rng.int(120, WORLD_W - 140);
      this.loot.push({ kind: i % 2 ? 'case' : 'bag', floor, x, taken: false });
    }
    if (hasRadios(this.krook)) {
      for (const floor of floors) {
        const n = this.krook >= 6 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const x = this.rng.int(100, WORLD_W - 140);
          if (Math.abs(x - ELEV_X) < 30) continue; // keep the elevator door clear
          this.obstacles.push({ kind: 'radio', floor, x, dir: 1, speed: 0, phase: 0, bounce: 0 });
        }
      }
    }
  }

  /** Moving obstacles are launched ahead of Kelly on his floor, off the visible screen. */
  update(dt: number, kelly: { x: number; floor: number; facing: 1 | -1; active: boolean }): void {
    this.elevator.update(dt);
    for (const o of this.obstacles) {
      if (o.kind === 'radio') continue;
      o.x += o.dir * o.speed * dt;
      if (o.kind === 'ball') o.phase += dt * 5;
    }
    this.obstacles = this.obstacles.filter((o) => o.kind === 'radio' || (o.x > -40 && o.x < WORLD_W + 40));

    if (!kelly.active || kelly.floor >= ROOF) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = spawnInterval(this.krook) * (0.7 + this.rng.next() * 0.6);
    const moving = this.obstacles.filter((o) => o.kind !== 'radio' && o.floor === kelly.floor).length;
    if (moving >= maxObstacles(this.krook)) return;
    const screen = screenOf(kelly.x);
    // enter from the edge of the screen Kelly is looking at, heading towards him
    let dir: 1 | -1 = kelly.facing > 0 ? -1 : 1;
    let x = dir < 0 ? (screen + 1) * W + 8 : screen * W - 24;
    if (x < 0 || x > WORLD_W) { dir = -dir as 1 | -1; x = dir < 0 ? (screen + 1) * W + 8 : screen * W - 24; }
    const r = this.rng.next();
    let kind: ObstacleKind = 'cart';
    if (hasPlanes(this.krook) && r < 0.22) kind = 'plane';
    else if (r < 0.55) kind = 'ball';
    const speed = kind === 'cart' ? cartSpeed(this.krook) : kind === 'ball' ? ballSpeed(this.krook) : planeSpeed(this.krook);
    this.obstacles.push({ kind, floor: kelly.floor, x, dir, speed, phase: this.rng.next() * Math.PI, bounce: ballBounce(this.krook) });
  }

  /** Knocks out a moving obstacle that hit Kelly so it does not hit twice. */
  remove(o: Obstacle): void {
    if (o.kind === 'radio') return;
    this.obstacles = this.obstacles.filter((x) => x !== o);
  }
}
