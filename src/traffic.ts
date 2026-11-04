import { W, LANES, LANE_H, laneTop, laneDir, CAR_W, CAR_H, TRUCK_W, TRUCK_H, WRAP_MARGIN } from './config';
import { gameSpec, GameSpec, LaneSpec } from './games';
import { Rng } from './rng';

export interface Vehicle {
  lane: number; // 1..10
  x: number; // left edge
  y: number; // top edge
  w: number;
  h: number;
  dir: 1 | -1;
  truck: boolean;
  phase: number; // index among the copies in its lane
}

interface LaneState {
  spec: LaneSpec;
  speed: number; // base px/s
  mult: number; // random modulation (games 5-8)
  nextChange: number;
}

const PERIOD = W + 2 * WRAP_MARGIN;

/** Ten lanes of looping vehicles. Pure logic, deterministic per seed. */
export class Traffic {
  readonly spec: GameSpec;
  vehicles: Vehicle[] = [];
  private lanes: LaneState[] = [];
  private rng: Rng;
  frozen = false;

  constructor(gameNumber: number, seed: number) {
    this.spec = gameSpec(gameNumber);
    this.rng = new Rng(seed);
    for (let lane = 1; lane <= LANES; lane++) {
      const k = lane <= 5 ? lane : 11 - lane; // distance from the curb
      const spec = (lane <= 5 ? this.spec.lower : this.spec.upper)[k - 1];
      this.lanes.push({ spec, speed: spec.speed, mult: 1, nextChange: this.rng.range(1, 4) });
      const w = spec.truck ? TRUCK_W : CAR_W;
      const h = spec.truck ? TRUCK_H : CAR_H;
      const y = laneTop(lane) + Math.floor((LANE_H - h) / 2);
      const offset = this.rng.range(0, PERIOD);
      for (let i = 0; i < spec.count; i++) {
        this.vehicles.push({
          lane, x: this.wrapX(offset + (i * PERIOD) / spec.count), y, w, h, dir: laneDir(lane), truck: spec.truck, phase: i,
        });
      }
    }
  }

  /** Current speed of a lane in px/s. */
  laneSpeed(lane: number): number {
    const l = this.lanes[lane - 1];
    return l.speed * l.mult;
  }

  private wrapX(x: number): number {
    let v = (x + WRAP_MARGIN) % PERIOD;
    if (v < 0) v += PERIOD;
    return v - WRAP_MARGIN;
  }

  update(dt: number): void {
    if (this.frozen) return;
    if (this.spec.random) {
      for (const l of this.lanes) {
        l.nextChange -= dt;
        if (l.nextChange <= 0) {
          l.mult = this.rng.range(0.5, 1.7);
          l.nextChange = this.rng.range(1.5, 5);
        }
      }
    }
    for (const v of this.vehicles) {
      v.x = this.wrapX(v.x + v.dir * this.laneSpeed(v.lane) * dt);
    }
  }
}
