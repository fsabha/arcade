/**
 * The formula car as a polygon model in the spirit of the early-nineties arcade racers (a
 * generic car, no real team, sponsor or chassis): long low nose under a two-element front
 * wing, rounded monocoque with the cockpit opening and mirrors, the driver's helmet, a tall
 * airbox sweeping down to the gearbox, coke-bottle sidepods with radiator mouths, a floor, a
 * three-element rear wing on tall endplates, wishbones and fat slicks with rims.
 *
 * The car is a list of convex parts. Each frame the faces turned away from the camera are
 * culled and the parts are drawn far to near, so the car never shows its insides; each face
 * is lit by the sun with a glossy highlight on the paint.
 * Local space: x right, y up, z forward (metres).
 */
import type { P3 } from './track';
import type { Poly } from './render3d';

export type CarMat = 'body' | 'white' | 'accent' | 'dark' | 'black' | 'tyre' | 'rim' | 'helmet' | 'visor' | 'metal' | 'light' | 'side';

type V3 = [number, number, number];
interface Face { i: number[]; m: CarMat; n: V3 }
interface Part { v: V3[]; f: Face[]; c: V3; /** drawn right after the part before it (stickers, rims) */ decal?: boolean; /** thin strut: never culled */ two?: boolean }

const GLOSS: Partial<Record<CarMat, number>> = { body: 0.55, white: 0.45, accent: 0.5, side: 0.5, helmet: 0.7, visor: 0.9, rim: 0.6, metal: 0.4 };

function finish(v: V3[], raw: { i: number[]; m: CarMat }[], opts: { decal?: boolean; two?: boolean; centre?: V3 } = {}): Part {
  const c: V3 = opts.centre ?? [0, 1, 2].map((k) => v.reduce((a, p) => a + p[k], 0) / v.length) as V3;
  const f = raw.map(({ i, m }) => {
    // Newell normal, turned to point out of the part
    let nx = 0, ny = 0, nz = 0, fx = 0, fy = 0, fz = 0;
    for (let k = 0; k < i.length; k++) {
      const a = v[i[k]], b = v[i[(k + 1) % i.length]];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
      fx += a[0]; fy += a[1]; fz += a[2];
    }
    fx /= i.length; fy /= i.length; fz /= i.length;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    if (nx * (fx - c[0]) + ny * (fy - c[1]) + nz * (fz - c[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    return { i, m, n: [nx, ny, nz] as V3 };
  });
  return { v, f, c, decal: opts.decal, two: opts.two };
}

type Band = 'bottom' | 'side' | 'shoulder' | 'top';
/** Section: z, bottom half width, top half width, bottom y, top y, x offset. */
type Section = [number, number, number, number, number, number?];

/** A tube lofted through rounded eight-sided sections (flat floor, bulging sides, rounded top). */
function loft(secs: Section[], mat: (z: number, band: Band) => CarMat, capFront: CarMat, capBack: CarMat): Part {
  const v: V3[] = [];
  for (const [z, wb, wt, yb, yt, ox = 0] of secs) {
    const h = yt - yb, wm = Math.max(wb, wt) * 1.04;
    const shoulder = wt + (wm - wt) * 0.45;
    v.push([ox - wb, yb, z], [ox + wb, yb, z], [ox + wm, yb + h * 0.38, z], [ox + shoulder, yb + h * 0.8, z], [ox + wt * 0.5, yt, z], [ox - wt * 0.5, yt, z], [ox - shoulder, yb + h * 0.8, z], [ox - wm, yb + h * 0.38, z]);
  }
  const bands: Band[] = ['bottom', 'side', 'side', 'shoulder', 'top', 'shoulder', 'side', 'side'];
  const f: { i: number[]; m: CarMat }[] = [];
  for (let s = 0; s < secs.length - 1; s++) {
    const a = s * 8, b = a + 8, zm = (secs[s][0] + secs[s + 1][0]) / 2;
    for (let e = 0; e < 8; e++) f.push({ i: [a + e, a + ((e + 1) % 8), b + ((e + 1) % 8), b + e], m: mat(zm, bands[e]) });
  }
  f.push({ i: [0, 1, 2, 3, 4, 5, 6, 7], m: capFront });
  const last = (secs.length - 1) * 8;
  f.push({ i: [7, 6, 5, 4, 3, 2, 1, 0].map((k) => last + k), m: capBack });
  return finish(v, f);
}

/** A box; `slope` lifts the front end (wing elements meet the air at an angle). */
function boxP(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: CarMat, topM: CarMat = m, slope = 0, decal = false): Part {
  const v: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0 + slope, z1], [x1, y0 + slope, z1], [x1, y1 + slope, z1], [x0, y1 + slope, z1]];
  return finish(v, [
    { i: [3, 2, 6, 7], m: topM }, { i: [0, 1, 5, 4], m: 'black' }, { i: [0, 1, 2, 3], m }, { i: [4, 5, 6, 7], m }, { i: [0, 3, 7, 4], m }, { i: [1, 2, 6, 5], m },
  ], { decal });
}

/** A thin flat strut between two points (wishbones, pylons, mirror stalks). */
function beam(a: V3, c: V3, t: number, m: CarMat): Part {
  return finish([[a[0], a[1] - t, a[2]], [a[0], a[1] + t, a[2]], [c[0], c[1] + t, c[2]], [c[0], c[1] - t, c[2]]], [{ i: [0, 1, 2, 3], m }], { two: true });
}

/** The helmet: a ball of `seg` x `rings` facets, the visor band facing forward, a stripe over the crown. */
function helmet(cx: number, cy: number, cz: number, r: number, seg: number, rings: number): Part {
  const v: V3[] = [];
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI * 0.82; // stop short of the chin: it sits in the cockpit
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      v.push([cx + Math.sin(phi) * Math.sin(th) * r, cy + Math.cos(phi) * r, cz + Math.sin(phi) * Math.cos(th) * r * 1.08]);
    }
  }
  const f: { i: number[]; m: CarMat }[] = [];
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const i2 = (i + 1) % seg, th = ((i + 0.5) / seg) * Math.PI * 2;
    const visor = j === Math.floor(rings * 0.55) && Math.cos(th) > 0.35;
    const stripe = j > 0 && j < rings - 1 && Math.abs(Math.sin(th)) < 0.2 && Math.cos(th) < 0.5;
    f.push({ i: [j * seg + i, j * seg + i2, (j + 1) * seg + i2, (j + 1) * seg + i], m: visor ? 'visor' : stripe ? 'accent' : 'helmet' });
  }
  f.push({ i: Array.from({ length: seg }, (_, i) => rings * seg + (seg - 1 - i)), m: 'black' });
  return finish(v, f, { centre: [cx, cy, cz] });
}

/** A slick: tread, sidewalls, then the rim and the hub nut as decals on the outer face. */
function wheel(parts: Part[], x: number, z: number, r: number, w: number, sides: number, detail: boolean): void {
  const v: V3[] = [];
  const ox = x > 0 ? 1 : -1;
  // the tread rounds into the sidewall: the outer rings sit a little in
  const rings: [number, number][] = detail ? [[-w / 2, r * 0.93], [-w / 2 + w * 0.1, r], [w / 2 - w * 0.1, r], [w / 2, r * 0.93]] : [[-w / 2, r], [w / 2, r]];
  for (const [dx, rr] of rings) for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    v.push([x + dx, r + Math.cos(a) * rr, z + Math.sin(a) * rr]);
  }
  const f: { i: number[]; m: CarMat }[] = [];
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < sides; i++) {
    const i2 = (i + 1) % sides;
    f.push({ i: [k * sides + i, k * sides + i2, (k + 1) * sides + i2, (k + 1) * sides + i], m: 'tyre' });
  }
  const lastRing = (rings.length - 1) * sides;
  f.push({ i: Array.from({ length: sides }, (_, i) => i), m: 'black' });
  f.push({ i: Array.from({ length: sides }, (_, i) => lastRing + (sides - 1 - i)), m: 'black' });
  parts.push(finish(v, f, { centre: [x, r, z] }));
  // rim and hub on the outer face only
  const hx = x + ox * (w / 2 + 0.004);
  const disc = (rad: number, n: number, m: CarMat, dx = 0): Part => {
    const dv: V3[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dv.push([hx + ox * dx, r + Math.cos(a) * rad, z + Math.sin(a) * rad]); }
    return finish(dv, [{ i: dv.map((_, i) => i), m }], { decal: true, centre: [x, r, z] });
  };
  parts.push(disc(r * 0.62, detail ? 12 : 8, 'rim'));
  if (detail) parts.push(disc(r * 0.46, 12, 'dark', 0.002), disc(r * 0.14, 6, 'metal', 0.004));
}

function build(detail: boolean): Part[] {
  const P: Part[] = [];
  // the floor under everything
  P.push(boxP(-0.92, 0.92, 0.06, 0.1, -1.7, 0.95, 'dark'));
  // nose and monocoque: white nose cone with a stripe, livery from the cockpit back
  P.push(loft([
    [3.02, 0.06, 0.05, 0.2, 0.28], [2.75, 0.11, 0.09, 0.16, 0.34], [2.3, 0.17, 0.14, 0.13, 0.42], [1.75, 0.24, 0.2, 0.12, 0.52],
    [1.15, 0.31, 0.26, 0.11, 0.61], [0.6, 0.37, 0.3, 0.1, 0.66], [-0.1, 0.4, 0.32, 0.1, 0.67], [-0.6, 0.38, 0.3, 0.1, 0.62],
  ], (z, band) => (band === 'bottom' ? 'black' : z > 1.25 ? (band === 'top' && z < 2.2 && z > 1.6 ? 'accent' : 'white') : z > 0.95 && band !== 'side' ? 'accent' : 'body'), 'white', 'body'));
  // cockpit opening, the wind deflector, then the driver
  P.push(boxP(-0.21, 0.21, 0.66, 0.672, -0.42, 0.62, 'black', 'black', 0.004, true));
  if (detail) P.push(boxP(-0.2, 0.2, 0.64, 0.7, 0.58, 0.66, 'dark', 'dark', 0, true));
  P.push(detail ? helmet(0, 0.78, -0.12, 0.16, 12, 6) : boxP(-0.14, 0.14, 0.64, 0.92, -0.26, 0.04, 'helmet'));
  // airbox over the driver's head sweeping down to the gearbox
  P.push(loft([
    [-0.32, 0.15, 0.11, 0.4, 0.98], [-0.62, 0.2, 0.13, 0.36, 0.97], [-1.05, 0.25, 0.13, 0.3, 0.84], [-1.55, 0.25, 0.11, 0.24, 0.66], [-2.0, 0.18, 0.08, 0.2, 0.46], [-2.3, 0.12, 0.06, 0.18, 0.34],
  ], (z, band) => (band === 'top' && z > -1.2 ? 'accent' : band === 'bottom' ? 'black' : 'body'), 'black', 'dark'));
  // sidepods: radiator mouths at the front, coke-bottle taper to the gearbox
  for (const s of [-1, 1]) P.push(loft([
    [0.82, 0.24, 0.22, 0.1, 0.42, s * 0.66], [0.6, 0.27, 0.25, 0.1, 0.47, s * 0.68], [-0.3, 0.28, 0.25, 0.1, 0.47, s * 0.68],
    [-0.95, 0.24, 0.19, 0.1, 0.4, s * 0.62], [-1.45, 0.17, 0.11, 0.1, 0.3, s * 0.52], [-1.75, 0.1, 0.06, 0.1, 0.22, s * 0.42],
  ], (z, band) => (band === 'bottom' ? 'black' : band === 'top' || band === 'shoulder' ? (z > -0.4 ? 'white' : 'body') : z > 0 && z < 0.5 ? 'side' : 'body'), 'black', 'dark'));
  // mirrors on stalks
  if (detail) for (const s of [-1, 1]) {
    P.push(beam([s * 0.3, 0.64, 0.78], [s * 0.5, 0.74, 0.78], 0.012, 'dark'));
    P.push(boxP(s * 0.5 - 0.07, s * 0.5 + 0.07, 0.7, 0.79, 0.74, 0.82, 'body'));
  }
  // front wing: main plane and flap between endplates, hung from the nose on pylons
  P.push(boxP(-1.28, 1.28, 0.05, 0.09, 2.66, 3.08, 'body', 'body', 0.02));
  P.push(boxP(-1.24, 1.24, 0.11, 0.15, 2.58, 2.78, 'white', 'white', 0.05));
  if (detail) P.push(boxP(-0.18, 0.18, 0.09, 0.11, 2.7, 3.04, 'dark', 'dark', 0.02, true));
  for (const s of [-1, 1]) P.push(boxP(s * 1.3 - 0.025, s * 1.3 + 0.025, 0.02, 0.3, 2.56, 3.12, 'white', 'white', -0.04));
  if (detail) for (const s of [-1, 1]) P.push(beam([s * 0.08, 0.2, 2.8], [s * 0.1, 0.1, 2.85], 0.012, 'dark'));
  // rear wing: three elements on tall endplates, beam wing below, central pylon
  P.push(boxP(-0.86, 0.86, 1.0, 1.06, -2.56, -2.22, 'body', 'body', 0.06));
  P.push(boxP(-0.86, 0.86, 0.9, 0.95, -2.3, -2.08, 'white', 'white', 0.05));
  if (detail) P.push(boxP(-0.86, 0.86, 0.82, 0.86, -2.14, -1.98, 'accent', 'accent', 0.04));
  for (const s of [-1, 1]) P.push(boxP(s * 0.88 - 0.025, s * 0.88 + 0.025, 0.36, 1.14, -2.62, -1.92, 'white', 'white'));
  P.push(boxP(-0.6, 0.6, 0.38, 0.43, -2.42, -2.12, 'dark', 'dark', 0.03));
  P.push(boxP(-0.05, 0.05, 0.4, 1.0, -2.4, -2.2, 'dark'));
  // gearbox, diffuser and the rain light
  P.push(boxP(-0.3, 0.3, 0.08, 0.2, -2.4, -2.0, 'dark'));
  if (detail) P.push(boxP(-0.07, 0.07, 0.22, 0.28, -2.44, -2.4, 'light', 'light', 0, true));
  // wishbones and push rods
  if (detail) for (const s of [-1, 1]) {
    P.push(beam([s * 0.28, 0.42, 1.8], [s * 0.86, 0.36, 1.66], 0.016, 'dark'));
    P.push(beam([s * 0.24, 0.16, 1.7], [s * 0.86, 0.22, 1.66], 0.016, 'dark'));
    P.push(beam([s * 0.36, 0.36, -1.4], [s * 0.8, 0.46, -1.5], 0.016, 'dark'));
    P.push(beam([s * 0.36, 0.14, -1.4], [s * 0.8, 0.22, -1.5], 0.016, 'dark'));
  }
  // slicks: narrow fronts, fat rears
  const sides = detail ? 16 : 8;
  wheel(P, -0.98, 1.66, 0.31, 0.3, sides, detail); wheel(P, 0.98, 1.66, 0.31, 0.3, sides, detail);
  wheel(P, -1.06, -1.5, 0.39, 0.52, sides, detail); wheel(P, 1.06, -1.5, 0.39, 0.52, sides, detail);
  return P;
}

const NEAR = build(true), FAR = build(false);

/** Faces in the near and far models (for tests and budgets). */
export const FACES = { near: NEAR.reduce((a, p) => a + p.f.length, 0), far: FAR.reduce((a, p) => a + p.f.length, 0) };

const SUN = (() => { const l = Math.hypot(-0.45, 0.8, -0.4); return [-0.45 / l, 0.8 / l, -0.4 / l] as V3; })();

const rgbCache = new Map<string, number[]>();
function rgb(color: string): number[] {
  let c = rgbCache.get(color);
  if (!c) {
    if (color.startsWith('#')) c = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    else { const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(color); c = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [128, 128, 128]; }
    rgbCache.set(color, c);
  }
  return c;
}

/**
 * World polygons for a car at (x, y, z) heading `yaw`, scaled by k, painted with its livery,
 * seen from `eye`: back faces culled, parts sorted far to near, faces lit and already coloured.
 * Draw them in the returned order (the painter keeps them together as one group).
 */
export function carPolys(x: number, y: number, z: number, yaw: number, k: number, livery: Record<CarMat, string>, near: boolean, roll = 0, eye?: { x: number; y: number; z: number }): Poly[] {
  const parts = near ? NEAR : FAR;
  const c = Math.cos(yaw), s = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
  const tf = (lx: number, ly: number, lz: number): P3 => {
    const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
    return { x: x + (rx * c + lz * s) * k, y: y + ry * k, z: z + (-rx * s + lz * c) * k };
  };
  const rot = (n: V3): V3 => { const rx = n[0] * cr - n[1] * sr, ry = n[0] * sr + n[1] * cr; return [rx * c + n[2] * s, ry, -rx * s + n[2] * c]; };
  const E = eye ?? { x: x - s * 10, y: y + 3, z: z - c * 10 };
  // group parts: a decal travels with the part before it
  const groups: { parts: Part[]; d: number }[] = [];
  for (const p of parts) {
    if (p.decal && groups.length) { groups[groups.length - 1].parts.push(p); continue; }
    const w = tf(p.c[0], p.c[1], p.c[2]);
    groups.push({ parts: [p], d: (w.x - E.x) ** 2 + (w.y - E.y) ** 2 + (w.z - E.z) ** 2 });
  }
  groups.sort((a, b) => b.d - a.d);
  const out: Poly[] = [];
  for (const g of groups) for (const p of g.parts) {
    const pts = p.v.map((q) => tf(q[0], q[1], q[2]));
    for (const f of p.f) {
      let n = rot(f.n);
      const q = pts[f.i[0]];
      let vx = E.x - q.x, vy = E.y - q.y, vz = E.z - q.z;
      if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) { if (!p.two) continue; n = [-n[0], -n[1], -n[2]]; }
      const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
      const dif = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
      let light = 0.5 + dif * 0.62 + Math.max(0, n[1]) * 0.08;
      // glossy paint: a Blinn highlight towards white
      const gl = GLOSS[f.m] ?? 0;
      let spec = 0;
      if (gl > 0) {
        let hx = SUN[0] + vx, hy = SUN[1] + vy, hz = SUN[2] + vz;
        const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
        spec = Math.pow(Math.max(0, n[0] * hx + n[1] * hy + n[2] * hz), 18) * gl;
      }
      if (f.m === 'light') { light = 1.2; spec = 0; }
      const base = rgb(livery[f.m]);
      const col = base.map((v) => Math.max(0, Math.min(255, Math.round(v * light + (255 - v * light) * spec))));
      out.push({ pts: f.i.map((i) => pts[i]), color: `rgb(${col[0]},${col[1]},${col[2]})` });
    }
  }
  return out;
}
