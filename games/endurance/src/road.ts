import { Rng } from '@arcade/shared';
import { SEG_LEN } from './config';

export interface Segment {
  index: number;
  curve: number; // lateral drift added per segment (world units)
}

function easeIn(t: number): number {
  return t * t;
}
function easeInOut(t: number): number {
  return -Math.cos(t * Math.PI) / 2 + 0.5;
}

/** Maximum curve amplitude grows slowly with distance (segment index). */
export function curveAmplitude(index: number): number {
  return 2.2 + Math.min(3.3, index / 9000);
}

/** Procedural infinite road made of straight stretches and eased curves. */
export class Road {
  readonly segments: Segment[] = [];
  private rng: Rng;

  constructor(readonly seed: number) {
    this.rng = new Rng(seed);
    // start with a straight so the player can get going
    this.addStraight(40);
  }

  get length(): number {
    return this.segments.length * SEG_LEN;
  }

  /** Make sure segments exist up to world z. Returns true if anything was added. */
  ensure(z: number): boolean {
    let added = false;
    while (this.length < z + SEG_LEN) {
      this.addChunk();
      added = true;
    }
    return added;
  }

  private addChunk(): void {
    const r = this.rng;
    if (r.chance(0.35)) {
      this.addStraight(r.int(12, 50));
      return;
    }
    const amp = curveAmplitude(this.segments.length);
    const c = r.range(1.2, amp) * (r.chance(0.5) ? 1 : -1);
    this.addCurve(r.int(8, 22), r.int(14, 50), r.int(8, 22), c);
  }

  private push(curve: number): void {
    this.segments.push({ index: this.segments.length, curve });
  }

  private addStraight(n: number): void {
    for (let i = 0; i < n; i++) this.push(0);
  }

  private addCurve(enter: number, hold: number, leave: number, curve: number): void {
    for (let i = 0; i < enter; i++) this.push(curve * easeIn(i / enter));
    for (let i = 0; i < hold; i++) this.push(curve);
    for (let i = 0; i < leave; i++) this.push(curve * easeInOut(1 - i / leave));
  }

  indexAt(z: number): number {
    return Math.max(0, Math.floor(z / SEG_LEN));
  }

  segmentAt(z: number): Segment {
    this.ensure(z);
    return this.segments[this.indexAt(z)];
  }

  curveAt(z: number): number {
    return this.segmentAt(z).curve;
  }
}
