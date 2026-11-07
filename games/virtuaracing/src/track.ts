import { SAMPLE, TRACK_W, Course } from './config';

export interface P3 { x: number; y: number; z: number }

/** A sampled point of the track: centre, forward and right unit vectors, elevation. */
export interface Sample {
  x: number; y: number; z: number;
  fx: number; fz: number; // forward (unit, on the ground plane)
  rx: number; rz: number; // right (unit)
  /** curvature sign/magnitude, for AI and for banking the camera */
  curve: number;
  /** distance from the start line */
  s: number;
}

export interface Scenery {
  kind: 'tree' | 'stand' | 'tower' | 'pit' | 'column' | 'sign' | 'bridge';
  /** track distance and lateral offset (metres, positive = right) */
  s: number;
  d: number;
  scale?: number;
}

export interface Track {
  course: Course;
  samples: Sample[];
  length: number;
  scenery: Scenery[];
  /** s of the two checkpoints (the start line is a third) */
  checkpoints: [number, number];
  width: number;
}

/** Control points (metres) traced after the arcade layouts; y is elevation. */
const LAYOUTS: Record<Course, P3[]> = {
  // a fast loop: long back straight, two esses, a hairpin and a sweeping final corner
  bigforest: [
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 420 }, { x: 40, y: 0, z: 560 }, { x: 160, y: 0, z: 620 }, { x: 300, y: 0, z: 600 },
    { x: 360, y: 0, z: 480 }, { x: 300, y: 0, z: 380 }, { x: 380, y: 0, z: 280 }, { x: 520, y: 0, z: 300 }, { x: 620, y: 0, z: 420 },
    { x: 760, y: 0, z: 440 }, { x: 860, y: 0, z: 340 }, { x: 840, y: 0, z: 180 }, { x: 700, y: 0, z: 80 }, { x: 500, y: 0, z: 40 },
    { x: 300, y: 0, z: 110 }, { x: 160, y: 0, z: 40 }, { x: 60, y: 0, z: -40 },
  ],
  // over the water: two bridge spans with climbs and a tight harbour section
  baybridge: [
    { x: 0, y: 0, z: 0 }, { x: 0, y: 6, z: 300 }, { x: 0, y: 14, z: 520 }, { x: 30, y: 10, z: 700 }, { x: 140, y: 0, z: 780 },
    { x: 260, y: 0, z: 720 }, { x: 300, y: 0, z: 600 }, { x: 240, y: 0, z: 500 }, { x: 320, y: 0, z: 420 }, { x: 460, y: 8, z: 440 },
    { x: 600, y: 16, z: 420 }, { x: 760, y: 8, z: 360 }, { x: 820, y: 0, z: 220 }, { x: 720, y: 0, z: 100 }, { x: 560, y: 0, z: 60 },
    { x: 420, y: 0, z: 140 }, { x: 280, y: 0, z: 80 }, { x: 120, y: 0, z: -20 },
  ],
  // the hills: climbs, blind crests, hairpins between the columns
  acropolis: [
    { x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 260 }, { x: -60, y: 24, z: 420 }, { x: 20, y: 30, z: 560 }, { x: 160, y: 20, z: 600 },
    { x: 220, y: 8, z: 480 }, { x: 140, y: 0, z: 380 }, { x: 240, y: 0, z: 300 }, { x: 400, y: 12, z: 360 }, { x: 480, y: 28, z: 500 },
    { x: 620, y: 30, z: 560 }, { x: 760, y: 16, z: 480 }, { x: 800, y: 0, z: 320 }, { x: 700, y: 0, z: 200 }, { x: 760, y: 0, z: 80 },
    { x: 600, y: 0, z: 0 }, { x: 420, y: 6, z: 60 }, { x: 260, y: 10, z: 120 }, { x: 120, y: 4, z: 40 },
  ],
};

/** Catmull-Rom through closed control points. */
function catmull(pts: P3[], i: number, t: number): P3 {
  const n = pts.length;
  const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
  const t2 = t * t, t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), z: f(p0.z, p1.z, p2.z, p3.z) };
}

export function buildTrack(course: Course): Track {
  const pts = LAYOUTS[course];
  // densely sample the spline, then resample at a fixed spacing
  const dense: P3[] = [];
  for (let i = 0; i < pts.length; i++) for (let k = 0; k < 40; k++) dense.push(catmull(pts, i, k / 40));
  const samples: Sample[] = [];
  let total = 0;
  let next = 0; // distance of the next sample to emit
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i], b = dense[(i + 1) % dense.length];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    const fx = (b.x - a.x) / (seg || 1), fz = (b.z - a.z) / (seg || 1);
    while (next < total + seg && seg > 0) {
      const k = (next - total) / seg;
      samples.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, fx, fz, rx: fz, rz: -fx, curve: 0, s: next });
      next += SAMPLE;
    }
    total += seg;
  }
  // curvature from the heading change between neighbours
  for (let i = 0; i < samples.length; i++) {
    const a = samples[(i - 1 + samples.length) % samples.length], c = samples[(i + 1) % samples.length];
    samples[i].curve = Math.atan2(a.fx * c.fz - a.fz * c.fx, a.fx * c.fx + a.fz * c.fz);
  }
  const length = total;
  const scenery = decorate(course, samples, length);
  return { course, samples, length, scenery, checkpoints: [length / 3, (2 * length) / 3], width: TRACK_W };
}

function decorate(course: Course, samples: Sample[], length: number): Scenery[] {
  const out: Scenery[] = [];
  const every = course === 'bigforest' ? 24 : 40;
  for (let s = 20; s < length - 20; s += every) {
    const side = Math.floor(s / every) % 2 ? 1 : -1;
    if (course === 'bigforest') { out.push({ kind: 'tree', s, d: side * (TRACK_W / 2 + 10 + (s * 7) % 9), scale: 1 + ((s * 13) % 5) / 10 }); if (s % 72 === 20) out.push({ kind: 'tree', s: s + 10, d: -side * (TRACK_W / 2 + 16) }); }
    if (course === 'baybridge') { const smp = samples[Math.floor(s / SAMPLE) % samples.length]; if (smp.y > 4) out.push({ kind: 'tower', s, d: side * (TRACK_W / 2 + 3) }); else if (s % 80 === 20) out.push({ kind: 'sign', s, d: side * (TRACK_W / 2 + 6) }); }
    if (course === 'acropolis') { const smp = samples[Math.floor(s / SAMPLE) % samples.length]; if (smp.y > 12) out.push({ kind: 'column', s, d: side * (TRACK_W / 2 + 6) }); else out.push({ kind: 'tree', s, d: side * (TRACK_W / 2 + 12), scale: 0.8 }); }
  }
  // start/finish: grandstands and the pit building on the first straight
  for (let s = 40; s < 200; s += 36) out.push({ kind: 'stand', s, d: -(TRACK_W / 2 + 12) });
  out.push({ kind: 'pit', s: 120, d: TRACK_W / 2 + 14 });
  out.push({ kind: 'bridge', s: 10, d: 0 });
  return out;
}

/** Interpolated sample at track distance s (wraps). */
export function at(track: Track, s: number): Sample {
  const n = track.samples.length;
  const u = ((s % track.length) + track.length) % track.length;
  const i = Math.floor(u / SAMPLE) % n;
  const a = track.samples[i], b = track.samples[(i + 1) % n];
  const k = (u - a.s) / SAMPLE;
  const kk = Math.max(0, Math.min(1, k));
  return {
    x: a.x + (b.x - a.x) * kk, y: a.y + (b.y - a.y) * kk, z: a.z + (b.z - a.z) * kk,
    fx: a.fx + (b.fx - a.fx) * kk, fz: a.fz + (b.fz - a.fz) * kk, rx: a.rx + (b.rx - a.rx) * kk, rz: a.rz + (b.rz - a.rz) * kk,
    curve: a.curve, s: u,
  };
}

/** World position of (s, d, h): along the track, lateral offset, height above the road. */
export function world(track: Track, s: number, d: number, h = 0): P3 {
  const p = at(track, s);
  return { x: p.x + p.rx * d, y: p.y + h, z: p.z + p.rz * d };
}
