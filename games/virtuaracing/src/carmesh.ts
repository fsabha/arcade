/**
 * The formula car as a real polygon mesh, Model 1 style: a lofted nose and monocoque, the
 * cockpit opening, airbox and engine cover, sidepods with radiator intakes, the driver's helmet
 * with visor, front and rear wings with endplates, wishbones, and fourteen-sided tyres with rims.
 * Local space: x right, y up, z forward (metres); faces carry a material key for the livery.
 */
import type { P3 } from './track';
import type { Poly } from './render3d';

export type CarMat = 'body' | 'white' | 'accent' | 'dark' | 'black' | 'tyre' | 'rim' | 'helmet' | 'visor' | 'metal';

interface Mesh { v: [number, number, number][]; f: { i: number[]; m: CarMat }[] }

/** Section: z, bottom half width, top half width, bottom y, top y, x offset. */
type Section = [number, number, number, number, number, number?];

function loft(mesh: Mesh, secs: Section[], top: (z: number) => CarMat, side: CarMat, capFront: CarMat, capBack: CarMat): void {
  const rings = secs.map(([z, wb, wt, yb, yt, ox = 0]) => {
    const wm = Math.max(wb, wt) * 1.06, ym = yb + (yt - yb) * 0.45;
    const pts: [number, number, number][] = [[ox - wb, yb, z], [ox + wb, yb, z], [ox + wm, ym, z], [ox + wt, yt, z], [ox - wt, yt, z], [ox - wm, ym, z]];
    const base = mesh.v.length;
    mesh.v.push(...pts);
    return base;
  });
  const mats = (z: number): CarMat[] => ['black', side, side, top(z), side, side];
  for (let s = 0; s < rings.length - 1; s++) {
    const a = rings[s], b = rings[s + 1];
    const zMid = (secs[s][0] + secs[s + 1][0]) / 2;
    const m = mats(zMid);
    for (let e = 0; e < 6; e++) {
      const e2 = (e + 1) % 6;
      mesh.f.push({ i: [a + e, a + e2, b + e2, b + e], m: m[e] });
    }
  }
  mesh.f.push({ i: [0, 1, 2, 3, 4, 5].map((k) => rings[0] + k), m: capFront });
  mesh.f.push({ i: [5, 4, 3, 2, 1, 0].map((k) => rings[rings.length - 1] + k), m: capBack });
}

function boxM(mesh: Mesh, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: CarMat, topM: CarMat = m): void {
  const b = mesh.v.length;
  mesh.v.push([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  const q = (a: number, c: number, d: number, e: number, mm: CarMat) => mesh.f.push({ i: [b + a, b + c, b + d, b + e], m: mm });
  q(3, 2, 6, 7, topM); q(0, 1, 2, 3, m); q(4, 5, 6, 7, m); q(0, 3, 7, 4, m); q(1, 2, 6, 5, m);
}

/** A thin strut between two points (wishbones, pylons). */
function beam(mesh: Mesh, a: [number, number, number], c: [number, number, number], t: number, m: CarMat): void {
  const b = mesh.v.length;
  mesh.v.push([a[0], a[1] - t, a[2] - t], [a[0], a[1] + t, a[2] + t], [c[0], c[1] + t, c[2] + t], [c[0], c[1] - t, c[2] - t]);
  mesh.f.push({ i: [b, b + 1, b + 2, b + 3], m });
}

/** A rough sphere (helmet): `rings` latitude bands of `seg` facets; facets facing forward get the visor. */
function ball(mesh: Mesh, cx: number, cy: number, cz: number, r: number, seg: number, rings: number): void {
  const idx: number[][] = [];
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI; // 0 top .. PI bottom
    const row: number[] = [];
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      row.push(mesh.v.length);
      mesh.v.push([cx + Math.sin(phi) * Math.sin(th) * r, cy + Math.cos(phi) * r * 0.95, cz + Math.sin(phi) * Math.cos(th) * r]);
    }
    idx.push(row);
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const i2 = (i + 1) % seg;
    const th = ((i + 0.5) / seg) * Math.PI * 2;
    const visor = j === Math.floor(rings / 2) - (rings > 3 ? 0 : 0) && Math.cos(th) > 0.55;
    mesh.f.push({ i: [idx[j][i], idx[j][i2], idx[j + 1][i2], idx[j + 1][i]], m: visor ? 'visor' : j === 1 && Math.cos(th) > 0.3 ? 'accent' : 'helmet' });
  }
}

function wheel(mesh: Mesh, x: number, z: number, r: number, w: number, sides: number): void {
  const out = mesh.v.length;
  for (const sx of [x - w / 2, x + w / 2]) for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    mesh.v.push([sx, r + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  for (let i = 0; i < sides; i++) {
    const i2 = (i + 1) % sides;
    mesh.f.push({ i: [out + i, out + i2, out + sides + i2, out + sides + i], m: 'tyre' });
  }
  // sidewalls: black ring and a lighter rim disc on the outer face
  const outer = x > 0 ? out + sides : out;
  mesh.f.push({ i: Array.from({ length: sides }, (_, i) => outer + (x > 0 ? i : sides - 1 - i)), m: 'black' });
  const hub = mesh.v.length;
  const hx = x + (x > 0 ? w / 2 + 0.005 : -w / 2 - 0.005);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mesh.v.push([hx, r + Math.cos(a) * r * 0.58, z + Math.sin(a) * r * 0.58]); }
  mesh.f.push({ i: Array.from({ length: 10 }, (_, i) => hub + (x > 0 ? i : 9 - i)), m: 'rim' });
  const inner = x > 0 ? out : out + sides;
  mesh.f.push({ i: Array.from({ length: sides }, (_, i) => inner + i), m: 'black' });
}

function build(detail: boolean): Mesh {
  const m: Mesh = { v: [], f: [] };
  // nose and monocoque: white nose, livery body
  loft(m, [
    [3.0, 0.1, 0.08, 0.2, 0.3], [2.5, 0.18, 0.14, 0.16, 0.4], [1.7, 0.28, 0.22, 0.13, 0.52], [0.95, 0.38, 0.3, 0.12, 0.63],
    [-0.4, 0.4, 0.33, 0.12, 0.63], [-1.4, 0.34, 0.22, 0.12, 0.55], [-2.25, 0.22, 0.13, 0.14, 0.4],
  ], (z) => (z > 1.4 ? 'white' : z > 0.9 ? 'accent' : 'body'), 'body', 'white', 'dark');
  // cockpit opening
  boxM(m, -0.25, 0.25, 0.63, 0.64, -0.35, 0.85, 'black');
  // airbox and engine cover
  loft(m, [[-0.2, 0.2, 0.14, 0.6, 1.0], [-0.9, 0.2, 0.12, 0.58, 0.92], [-2.05, 0.14, 0.06, 0.42, 0.55]], () => 'body', 'body', 'black', 'dark');
  // sidepods with intakes
  for (const s of [-1, 1]) loft(m, [[0.6, 0.27, 0.24, 0.14, 0.44, s * 0.72], [-0.8, 0.3, 0.26, 0.14, 0.46, s * 0.7], [-1.45, 0.2, 0.14, 0.14, 0.32, s * 0.55]],
    (z) => (z > 0 ? 'white' : 'body'), 'body', 'black', 'body');
  // driver
  if (detail) ball(m, 0, 0.82, -0.05, 0.19, 8, 4);
  else boxM(m, -0.15, 0.15, 0.66, 0.98, -0.2, 0.1, 'helmet');
  // front wing: main plane, flap, endplates
  boxM(m, -1.36, 1.36, 0.07, 0.12, 2.72, 3.12, 'body', 'body');
  if (detail) boxM(m, -1.3, 1.3, 0.12, 0.17, 2.66, 2.8, 'white');
  for (const s of [-1, 1]) boxM(m, s * 1.36 - 0.03, s * 1.36 + 0.03, 0.04, 0.34, 2.62, 3.16, 'white');
  // rear wing: two elements on big endplates, with a pylon
  boxM(m, -1.08, 1.08, 0.94, 1.04, -2.52, -2.08, 'body', 'accent');
  boxM(m, -1.08, 1.08, 0.78, 0.84, -2.36, -2.02, 'white');
  for (const s of [-1, 1]) boxM(m, s * 1.1 - 0.03, s * 1.1 + 0.03, 0.46, 1.12, -2.6, -1.95, 'white');
  boxM(m, -0.06, 0.06, 0.4, 0.94, -2.3, -2.12, 'dark');
  // diffuser and gearbox
  boxM(m, -0.38, 0.38, 0.06, 0.2, -2.5, -2.2, 'dark');
  // wishbones
  if (detail) for (const s of [-1, 1]) {
    beam(m, [s * 0.3, 0.42, 1.75], [s * 0.86, 0.38, 1.66], 0.02, 'metal');
    beam(m, [s * 0.3, 0.2, 1.6], [s * 0.86, 0.24, 1.66], 0.02, 'metal');
    beam(m, [s * 0.35, 0.4, -1.45], [s * 0.8, 0.42, -1.5], 0.02, 'metal');
    beam(m, [s * 0.35, 0.2, -1.45], [s * 0.8, 0.22, -1.5], 0.02, 'metal');
  }
  // tyres
  const sides = detail ? 14 : 8;
  wheel(m, -1.02, 1.66, 0.33, 0.32, sides); wheel(m, 1.02, 1.66, 0.33, 0.32, sides);
  wheel(m, -1.04, -1.5, 0.38, 0.48, sides); wheel(m, 1.04, -1.5, 0.38, 0.48, sides);
  return m;
}

const NEAR = build(true), FAR = build(false);

/** World polygons for a car at (x, y, z) heading `yaw`, scaled by k, painted with its livery. */
export function carPolys(x: number, y: number, z: number, yaw: number, k: number, livery: Record<CarMat, string>, near: boolean, roll = 0): Poly[] {
  const mesh = near ? NEAR : FAR;
  const c = Math.cos(yaw), s = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
  const pts: P3[] = mesh.v.map(([lx, ly, lz]) => {
    const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
    return { x: x + (rx * c + lz * s) * k, y: y + ry * k, z: z + (-rx * s + lz * c) * k };
  });
  return mesh.f.map((f) => ({ pts: f.i.map((i) => pts[i]), color: livery[f.m], lit: true }));
}
