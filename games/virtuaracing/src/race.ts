import { MAX_SPEED, ACCEL, BRAKE, DRAG, GRASS_SPEED, GRASS_DRAG, STEER_RATE, WALL, TRACK_W, CARS, LAPS } from './config';
import { Track, at } from './track';
import { Rng } from '@arcade/shared';

export interface Car {
  id: number;
  /** distance along the track (unwrapped: laps accumulate) */
  s: number;
  d: number; // lateral offset, metres
  speed: number; // m/s
  color: string;
  player: boolean;
  /** AI: preferred lateral line and skill */
  line: number;
  skill: number;
  lap: number;
  finished: boolean;
  finishTime: number;
  /** last checkpoint index passed this lap */
  cp: number;
  steer: number; // -1..1 for the wheel/visuals
  bump: number; // seconds of collision wobble
  onWall: boolean;
}

export interface Inputs { gas: boolean; brake: boolean; left: boolean; right: boolean }

/** Lateral drift (m/s) a curve of `curve` rad per sample pulls at `speed` m/s. */
function drift(curve: number, speed: number): number {
  return (curve / 8) * speed * speed * 0.03;
}

const COLOURS = ['#e02020', '#2040e0', '#f0d020', '#20c040', '#f08020', '#c020c0', '#20c0c0', '#e0e0e0', '#8040c0', '#c08040', '#40c080', '#e06080', '#4080e0', '#a0a0a0', '#f0f0a0'];

/** The field of cars on one track: physics, AI and lap counting. */
export class Race {
  cars: Car[] = [];
  player: Car;
  time = 0;
  running = false;
  private rng: Rng;

  constructor(public track: Track, seed: number, opponents = CARS - 1, public laps = LAPS) {
    this.rng = new Rng(seed);
    // grid: two columns, player last like the arcade
    for (let i = 0; i < opponents; i++) {
      const row = Math.floor(i / 2);
      this.cars.push(this.makeCar(i + 1, track.length - 14 - row * 9, i % 2 ? 3.2 : -3.2, COLOURS[i % COLOURS.length], false));
    }
    const prow = Math.floor(opponents / 2);
    this.player = this.makeCar(0, track.length - 14 - prow * 9, opponents % 2 ? 3.2 : -3.2, '#ffffff', true);
    this.cars.push(this.player);
    // positions start just before the line: s counts from -gridOffset so lap 1 begins at the line
    for (const c of this.cars) c.s -= track.length;
  }

  private makeCar(id: number, s: number, d: number, color: string, player: boolean): Car {
    return { id, s, d, speed: 0, color, player, line: this.rng.range(-3, 3), skill: 0.82 + this.rng.next() * 0.16, lap: 0, finished: false, finishTime: 0, cp: -1, steer: 0, bump: 0, onWall: false };
  }

  /** Race positions: by laps then distance. */
  get standings(): Car[] {
    return [...this.cars].sort((a, b) => (b.finished ? b.finishTime * -1 + 1e9 : b.s) - (a.finished ? a.finishTime * -1 + 1e9 : a.s));
  }

  positionOf(car: Car): number {
    return this.standings.indexOf(car) + 1;
  }

  update(dt: number, inputs: Inputs, onEvent?: (c: Car, e: 'lap' | 'checkpoint' | 'finish') => void): void {
    if (!this.running) return;
    this.time += dt;
    for (const c of this.cars) {
      const prevS = c.s;
      if (c.player) this.drive(c, dt, inputs);
      else this.ai(c, dt);
      this.advance(c, dt, prevS, onEvent);
    }
    this.collide();
  }

  private drive(c: Car, dt: number, inp: Inputs): void {
    const onGrass = Math.abs(c.d) > TRACK_W / 2;
    let a = 0;
    if (inp.gas && !c.finished) a += ACCEL * (1 - (c.speed / MAX_SPEED) * 0.7);
    if (inp.brake) a -= BRAKE;
    a -= DRAG * c.speed * c.speed;
    if (onGrass && c.speed > GRASS_SPEED) a -= GRASS_DRAG;
    if (!inp.gas && !inp.brake) a -= 3;
    c.speed = Math.max(0, Math.min(MAX_SPEED, c.speed + a * dt));
    const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    c.steer += (steer - c.steer) * Math.min(1, dt * 8);
    // the faster you go, the more the track curves pull you outward (centripetal drift)
    const curve = at(this.track, c.s).curve;
    const k = c.speed / MAX_SPEED;
    c.d += c.steer * STEER_RATE * (0.4 + k) * dt;
    c.d -= drift(curve, c.speed) * dt;
    if (Math.abs(c.d) > WALL) {
      c.d = Math.sign(c.d) * WALL;
      if (!c.onWall) { c.speed *= 0.6; c.bump = 0.4; }
      c.onWall = true;
      c.speed = Math.max(0, c.speed - 20 * dt); // scraping along the barrier
    } else c.onWall = false;
    c.bump = Math.max(0, c.bump - dt);
  }

  private ai(c: Car, dt: number): void {
    if (c.finished) { c.speed = Math.max(0, c.speed - 20 * dt); return; }
    const ahead = at(this.track, c.s + 40);
    const here = at(this.track, c.s);
    // slow for corners, hold the line, drift towards the inside
    const target = MAX_SPEED * c.skill * (1 - Math.min(0.45, Math.abs(ahead.curve) * 9));
    c.speed += (target > c.speed ? ACCEL * 0.9 : -BRAKE * 0.7) * dt;
    c.speed = Math.max(10, Math.min(MAX_SPEED, c.speed));
    const want = c.line - Math.sign(ahead.curve) * 2.5;
    c.d += (want - c.d) * Math.min(1, dt * 1.5);
    c.d -= drift(here.curve, c.speed) * 0.5 * dt;
    c.d = Math.max(-TRACK_W / 2 + 1, Math.min(TRACK_W / 2 - 1, c.d));
    c.steer = Math.max(-1, Math.min(1, (want - c.d) * 0.3));
  }

  private advance(c: Car, dt: number, prevS: number, onEvent?: (c: Car, e: 'lap' | 'checkpoint' | 'finish') => void): void {
    c.s += c.speed * dt;
    const L = this.track.length;
    const lapBefore = Math.floor(prevS / L), lapAfter = Math.floor(c.s / L);
    if (lapAfter > lapBefore && lapAfter > 0) {
      c.lap = lapAfter;
      c.cp = -1;
      if (c.lap >= this.laps && !c.finished) { c.finished = true; c.finishTime = this.time; onEvent?.(c, 'finish'); }
      else onEvent?.(c, 'lap');
    }
    const u = ((c.s % L) + L) % L;
    this.track.checkpoints.forEach((cs, i) => {
      if (c.cp < i && u >= cs && prevS >= 0 && Math.floor(prevS / L) === lapAfter) { c.cp = i; onEvent?.(c, 'checkpoint'); }
    });
  }

  /** Cars bump: the one behind loses speed, both get pushed sideways. */
  private collide(): void {
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const a = this.cars[i], b = this.cars[j];
        const ds = a.s - b.s;
        const dd = a.d - b.d;
        if (Math.abs(ds) < 4.2 && Math.abs(dd) < 2.4) {
          const push = (2.4 - Math.abs(dd)) * 0.5 * (dd >= 0 ? 1 : -1);
          a.d += push; b.d -= push;
          const behind = ds < 0 ? a : b, front = ds < 0 ? b : a;
          behind.speed = Math.min(behind.speed, front.speed * 0.85);
          front.speed = Math.min(MAX_SPEED, front.speed + 2);
          behind.bump = 0.3;
        }
      }
    }
  }
}
