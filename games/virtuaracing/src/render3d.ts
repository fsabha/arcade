import { FOCAL, NEAR, W } from './config';
import type { P3 } from './track';

/** A camera on the ground plane: position, yaw (radians, 0 = +z), pitch offset in screen px. */
export interface Camera { x: number; y: number; z: number; yaw: number; horizon: number }

export interface Poly { pts: P3[]; color: string; /** optional outline colour */ line?: string }

interface ScreenPoly { depth: number; pts: { x: number; y: number }[]; color: string; line?: string }

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

  add(poly: Poly): void {
    const cs = clipNear(poly.pts.map((p) => toCamera(this.cam, p)));
    if (cs.length < 3) return;
    let depth = 0;
    for (const p of cs) depth += p.z;
    depth /= cs.length;
    const pts = cs.map((p) => project(this.cam, p));
    // skip polygons entirely off screen
    if (pts.every((p) => p.x < -40) || pts.every((p) => p.x > W + 40) || pts.every((p) => p.y < -40) || pts.every((p) => p.y > 300)) return;
    this.list.push({ depth, pts, color: poly.color, line: poly.line });
  }

  /** A billboard: a vertical rectangle facing the camera, width w and height h at ground point p. */
  addBillboard(p: P3, w: number, h: number, color: string, line?: string): void {
    const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
    const rx = c * (w / 2), rz = -s * (w / 2);
    this.add({ pts: [{ x: p.x - rx, y: p.y, z: p.z - rz }, { x: p.x + rx, y: p.y, z: p.z + rz }, { x: p.x + rx, y: p.y + h, z: p.z + rz }, { x: p.x - rx, y: p.y + h, z: p.z - rz }], color, line });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.list.sort((a, b) => b.depth - a.depth);
    for (const p of this.list) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(Math.round(p.pts[0].x), Math.round(p.pts[0].y));
      for (let i = 1; i < p.pts.length; i++) ctx.lineTo(Math.round(p.pts[i].x), Math.round(p.pts[i].y));
      ctx.closePath();
      ctx.fill();
      if (p.line) { ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.stroke(); }
    }
    this.list = [];
  }

  get count(): number {
    return this.list.length;
  }
}

/** Shades a hex colour by k (0.5 darker .. 1.5 lighter). */
export function shade(hex: string, k: number): string {
  const c = [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Axis-aligned box in local car space turned into world polygons (top + 4 sides). */
export function box(cx: number, cy: number, cz: number, w: number, h: number, l: number, yaw: number, color: string): Poly[] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const pt = (lx: number, ly: number, lz: number): P3 => ({ x: cx + lx * c + lz * s, y: cy + ly, z: cz - lx * s + lz * c });
  const x0 = -w / 2, x1 = w / 2, z0 = -l / 2, z1 = l / 2;
  return [
    { pts: [pt(x0, h, z0), pt(x1, h, z0), pt(x1, h, z1), pt(x0, h, z1)], color: shade(color, 1.15) },
    { pts: [pt(x0, 0, z1), pt(x1, 0, z1), pt(x1, h, z1), pt(x0, h, z1)], color: shade(color, 0.9) },
    { pts: [pt(x0, 0, z0), pt(x1, 0, z0), pt(x1, h, z0), pt(x0, h, z0)], color: shade(color, 0.8) },
    { pts: [pt(x0, 0, z0), pt(x0, 0, z1), pt(x0, h, z1), pt(x0, h, z0)], color: shade(color, 0.7) },
    { pts: [pt(x1, 0, z0), pt(x1, 0, z1), pt(x1, h, z1), pt(x1, h, z0)], color: shade(color, 1.0) },
  ];
}
