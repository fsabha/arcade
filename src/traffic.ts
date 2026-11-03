import { Rng } from './rng';
import { MAX_SPEED, ROAD_HALF, CAR_W, HIT_DX, HIT_DZ } from './config';
import { difficulty } from './scoring';

export type CarColor = 'red' | 'blue' | 'green' | 'yellow' | 'white' | 'purple';
export const CAR_COLORS: readonly CarColor[] = ['red', 'blue', 'green', 'yellow', 'white', 'purple'];

export interface Car {
  id: number;
  z: number; // world depth
  x: number; // lateral offset from road centre (world)
  speed: number; // world units / s
  color: CarColor;
  /** true once the car is behind the player (used to count passes) */
  behind: boolean;
}

const LANES = [-0.62, -0.21, 0.21, 0.62];

export class Traffic {
  cars: Car[] = [];
  nextZ = 0;
  private nextId = 1;
  private rng: Rng;

  constructor(seed: number, startZ: number) {
    this.rng = new Rng(seed);
    this.nextZ = startZ;
  }

  /** Spawn cars until the road is populated up to `untilZ`. */
  spawn(untilZ: number, day: number): void {
    const d = difficulty(day);
    while (this.nextZ < untilZ) {
      const lanes = this.rng.shuffle([...LANES]);
      const n = this.rng.chance(d.pairChance) ? 2 : 1;
      const speed = MAX_SPEED * this.rng.range(d.minSpeed, d.maxSpeed);
      for (let i = 0; i < n; i++) {
        this.cars.push({
          id: this.nextId++,
          z: this.nextZ,
          x: lanes[i] * ROAD_HALF + this.rng.range(-40, 40),
          speed: speed * (i === 0 ? 1 : this.rng.range(0.92, 1.0)),
          color: this.rng.pick(CAR_COLORS),
          behind: false,
        });
      }
      this.nextZ += d.gap * this.rng.range(0.55, 1.45);
    }
  }

  /**
   * Advance cars. Returns how many cars the player overtook (positive) or was
   * overtaken by (negative) this step, as { passed, passedBy }.
   */
  update(dt: number, playerZ: number, camZ: number): { passed: number; passedBy: number } {
    let passed = 0;
    let passedBy = 0;
    // keep slower cars from being rear-ended by faster traffic in the same lane
    const sorted = [...this.cars].sort((a, b) => a.z - b.z);
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      for (let j = i + 1; j < sorted.length; j++) {
        const ahead = sorted[j];
        if (ahead.z - c.z > 900) break;
        if (Math.abs(ahead.x - c.x) < CAR_W && c.speed > ahead.speed) c.speed = ahead.speed;
      }
    }
    for (const c of this.cars) {
      c.z += c.speed * dt;
      const nowBehind = c.z < playerZ;
      if (nowBehind && !c.behind) passed++;
      else if (!nowBehind && c.behind) passedBy++;
      c.behind = nowBehind;
    }
    this.cars = this.cars.filter((c) => c.z > camZ - 1500);
    return { passed, passedBy };
  }

  /** First car overlapping the player's box, if any. */
  collision(playerZ: number, playerX: number): Car | null {
    for (const c of this.cars) {
      if (Math.abs(c.z - playerZ) < HIT_DZ && Math.abs(c.x - playerX) < HIT_DX) return c;
    }
    return null;
  }

  reset(startZ: number): void {
    this.cars = [];
    this.nextZ = startZ;
  }
}
