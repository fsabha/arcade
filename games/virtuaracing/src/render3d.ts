import { FOCAL, NEAR, W } from './config';
import type { P3 } from './track';

/** A camera on the ground plane: position, yaw (radians, 0 = +z), pitch offset in screen px. */
export interface Camera { x: number; y: number; z: number; yaw: number; horizon: number }

export interface Poly { pts: P3[]; color: string; /** optional outline colour */ line?: string; /** shade by the face normal */ lit?: boolean }

const LIGHT = { x: -0.45, y: 0.8, z: -0.4 }; // from the upper left, slightly behind the camera

/** Flat shading factor for a polygon from its first three points (0.55 dark .. 1.25 bright). */
function lightOf(pts: P3[]): number {
  if (pts.length < 3) return 1;
  const a = pts[0], b = pts[1], c = pts[2];
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  const d = Math.abs(nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
  return 0.55 + d * 0.7;
}

interface ScreenPoly { depth: number; pts: { x: number; y: number }[]; color: string; line?: string; /** a model drawn as one, in its own order */ group?: ScreenPoly[] }

/** Camera-space point: x right, y up, z forward. */
function toCamera(cam: Camera, p: P3): P3 {
  const dx = p.x - cam.x, dz = p.z - cam.z;
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  return { x: dx * c - dz * s, y: p.y - cam.y, z: dx * s + dz * c };
}

/** Clips a camera-space polygon against the near plane z = NEAR (Sutherland-Hodgman on one plane). */
function clipNear(pts: P3[]): P3[] {
  const out: P3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ain = a.z >= NEAR, bin = b.z >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a.z) / (b.z - a.z);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR });
    }
  }
  return out;
}

function project(cam: Camera, p: P3): { x: number; y: number } {
  return { x: W / 2 + (p.x * FOCAL) / p.z, y: cam.horizon - (p.y * FOCAL) / p.z };
}

/** Transforms, clips and sorts polygons back to front, then fills them. */
export class Painter {
  private list: ScreenPoly[] = [];

  constructor(private cam: Camera) {}

  private ground: ScreenPoly[] = [];

  /** `flat` marks the road and grass: they are painted before every object standing on them. */
  add(poly: Poly, flat = false): void {
    const sp = this.screen(poly);
    if (sp) (flat ? this.ground : this.list).push(sp);
  }

  /** A whole model (a car) already ordered back to front: sorted into the scene at the depth of `centre`. */
  addGroup(polys: Poly[], centre: P3): void {
    const group: ScreenPoly[] = [];
    for (const p of polys) { const sp = this.screen(p); if (sp) group.push(sp); }
    if (!group.length) return;
    const z = toCamera(this.cam, centre).z;
    this.list.push({ depth: z, pts: [], color: '', group });
  }

  private screen(poly: Poly): ScreenPoly | null {
    const cs = clipNear(poly.pts.map((p) => toCamera(this.cam, p)));
    if (cs.length < 3) return null;
    const color = poly.lit ? shade(poly.color, lightOf(poly.pts)) : poly.color;
    let depth = 0;
    for (const p of cs) depth += p.z;
    depth /= cs.length;
    const pts = cs.map((p) => project(this.cam, p));
    // skip polygons entirely off screen
    if (pts.every((p) => p.x < -40) || pts.every((p) => p.x > W + 40) || pts.every((p) => p.y < -40) || pts.every((p) => p.y > 300)) return null;
    return { depth, pts, color, line: poly.line };
  }

  /** A billboard: a vertical rectangle facing the camera, width w and height h at ground point p. */
  addBillboard(p: P3, w: number, h: number, color: string, line?: string): void {
    const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
    const rx = c * (w / 2), rz = -s * (w / 2);
    this.add({ pts: [{ x: p.x - rx, y: p.y, z: p.z - rz }, { x: p.x + rx, y: p.y, z: p.z + rz }, { x: p.x + rx, y: p.y + h, z: p.z + rz }, { x: p.x - rx, y: p.y + h, z: p.z - rz }], color, line });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.list.sort((a, b) => b.depth - a.depth);
    const fill = (p: ScreenPoly, seam: number) => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.pts[0].x, p.pts[0].y);
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y);
      ctx.closePath();
      ctx.fill();
      if (p.line) { ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.stroke(); }
      else if (seam) { ctx.strokeStyle = p.color; ctx.lineWidth = seam; ctx.stroke(); } // hides hairline gaps between faces
    };
    this.ground.sort((a, b) => b.depth - a.depth);
    for (const p of this.ground) fill(p, 0.5);
    this.ground = [];
    for (const p of this.list) {
      if (p.group) for (const q of p.group) fill(q, 0.35);
      else fill(p, 0.5);
    }
    this.list = [];
  }

  get count(): number {
    return this.list.length + this.ground.length;
  }
}

/** Shades a colour by k (0.5 darker .. 1.5 lighter); accepts #rrggbb or rgb(). */
export function shade(color: string, k: number): string {
  let c: number[];
  if (color.startsWith('#')) c = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  else { const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(color); c = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [128, 128, 128]; }
  c = c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Local-space helper: rotate (lx, ly, lz) about y by yaw and translate to (cx, cy, cz). */
function place(cx: number, cy: number, cz: number, yaw: number) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return (lx: number, ly: number, lz: number): P3 => ({ x: cx + lx * c + lz * s, y: cy + ly, z: cz - lx * s + lz * c });
}

/** A prism of `sides` faces along the local x axis (a wheel), lit per face, with end caps. */
export function cylinder(cx: number, cy: number, cz: number, r: number, len: number, yaw: number, sides: number, color: string, cap: string): Poly[] {
  const pt = place(cx, cy, cz, yaw);
  const out: Poly[] = [];
  const ring = (x: number): P3[] => Array.from({ length: sides }, (_, i) => { const a = (i / sides) * Math.PI * 2; return pt(x, Math.cos(a) * r, Math.sin(a) * r); });
  const a = ring(-len / 2), b = ring(len / 2);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    out.push({ pts: [a[i], a[j], b[j], b[i]], color, lit: true });
  }
  out.push({ pts: a, color: cap, lit: true });
  out.push({ pts: [...b].reverse(), color: cap, lit: true });
  return out;
}

/** A cone (tree crown) with `sides` facets, apex up. */
export function cone(cx: number, cy: number, cz: number, r: number, h: number, sides: number, color: string): Poly[] {
  const out: Poly[] = [];
  const apex = { x: cx, y: cy + h, z: cz };
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    out.push({ pts: [{ x: cx + Math.cos(a0) * r, y: cy, z: cz + Math.sin(a0) * r }, { x: cx + Math.cos(a1) * r, y: cy, z: cz + Math.sin(a1) * r }, apex], color, lit: true });
  }
  return out;
}

/** A wedge: a box whose top narrows towards the front (the nose of a formula car). */
export function wedge(cx: number, cy: number, cz: number, wRear: number, wFront: number, h: number, l: number, yaw: number, color: string, hFront = h): Poly[] {
  const pt = place(cx, cy, cz, yaw);
  const z0 = -l / 2, z1 = l / 2;
  const rl = -wRear / 2, rr = wRear / 2, fl = -wFront / 2, fr = wFront / 2;
  return [
    { pts: [pt(rl, h, z0), pt(rr, h, z0), pt(fr, hFront, z1), pt(fl, hFront, z1)], color, lit: true }, // top
    { pts: [pt(fl, 0, z1), pt(fr, 0, z1), pt(fr, hFront, z1), pt(fl, hFront, z1)], color, lit: true }, // nose
    { pts: [pt(rl, 0, z0), pt(rr, 0, z0), pt(rr, h, z0), pt(rl, h, z0)], color, lit: true }, // tail
    { pts: [pt(rl, 0, z0), pt(fl, 0, z1), pt(fl, hFront, z1), pt(rl, h, z0)], color, lit: true }, // left
    { pts: [pt(rr, 0, z0), pt(fr, 0, z1), pt(fr, hFront, z1), pt(rr, h, z0)], color, lit: true }, // right
  ];
}

/** Axis-aligned box in local car space turned into world polygons (top + 4 sides). */
export function box(cx: number, cy: number, cz: number, w: number, h: number, l: number, yaw: number, color: string): Poly[] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const pt = (lx: number, ly: number, lz: number): P3 => ({ x: cx + lx * c + lz * s, y: cy + ly, z: cz - lx * s + lz * c });
  const x0 = -w / 2, x1 = w / 2, z0 = -l / 2, z1 = l / 2;
  return [
    { pts: [pt(x0, h, z0), pt(x1, h, z0), pt(x1, h, z1), pt(x0, h, z1)], color, lit: true },
    { pts: [pt(x0, 0, z1), pt(x1, 0, z1), pt(x1, h, z1), pt(x0, h, z1)], color, lit: true },
    { pts: [pt(x0, 0, z0), pt(x1, 0, z0), pt(x1, h, z0), pt(x0, h, z0)], color, lit: true },
    { pts: [pt(x0, 0, z0), pt(x0, 0, z1), pt(x0, h, z1), pt(x0, h, z0)], color, lit: true },
    { pts: [pt(x1, 0, z0), pt(x1, 0, z1), pt(x1, h, z1), pt(x1, h, z0)], color, lit: true },
  ];
}
