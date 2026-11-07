/**
 * Pixel painting helpers for 16-bit backdrops: periodic noise, a pixel buffer with shaded balls
 * and outlines, colour ramps, stone courses, and parallax strips that wrap every TW pixels.
 */
export type RGB = [number, number, number];
export const TW = 512; // strip width, a power of two so the noise wraps

export function hex(c: string): RGB { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
export const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** Seeded hash -> 0..1 */
export function hash(n: number, seed: number): number {
  let x = (n * 374761393 + seed * 668265263) | 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
/** Periodic smooth value noise in 1D. */
export function noise1(x: number, period: number, seed: number): number {
  const i = Math.floor(x), f = x - i;
  const a = hash(((i % period) + period) % period, seed), b = hash((((i + 1) % period) + period) % period, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
/** Periodic 2D value noise (period on x only). */
export function noise2(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (a: number, b: number) => hash((((a % period) + period) % period) + b * 7919, seed);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** A pixel buffer with helpers. */
export class Img {
  d: Uint8ClampedArray;
  constructor(public w: number, public h: number) { this.d = new Uint8ClampedArray(w * h * 4); }
  set(x: number, y: number, c: RGB, a = 255): void {
    x = ((Math.round(x) % this.w) + this.w) % this.w; y = Math.round(y);
    if (y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  solid(x: number, y: number): boolean {
    x = ((Math.round(x) % this.w) + this.w) % this.w;
    return y >= 0 && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0;
  }
  /** shaded ball: 4 tones lit from the upper left, with a hint of dither between tones */
  ball(cx: number, cy: number, r: number, ramp: RGB[], seed = 0): void {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const l = -dx * 0.5 - dy * 0.6 + nz * 0.6;
      let t = l > 0.75 ? 0 : l > 0.45 ? 1 : l > 0.1 ? 2 : 3;
      if (t < 3 && hash(x * 31 + y * 17, seed) < 0.12) t++;
      this.set(x, y, ramp[Math.min(t, ramp.length - 1)]);
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** a one-pixel dark outline around everything already painted */
  outline(c: RGB): void {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.solid(x, y)) continue;
      if (this.solid(x - 1, y) || this.solid(x + 1, y) || this.solid(x, y - 1) || this.solid(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
  }
  /** The painted pixels as a canvas; `scale` 3 enlarges them with Scale3x (smooth diagonals, crisp edges). */
  canvas(scale = 1): HTMLCanvasElement | null {
    const k = scale === 3 ? 3 : 1;
    const w = this.w * k, h = this.h * k;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g || typeof g.createImageData !== 'function') return null;
    const img = g.createImageData(w, h);
    if (!img?.data) return null;
    img.data.set(k === 3 ? scale3x(this.d, this.w, this.h) : this.d);
    g.putImageData(img, 0, 0);
    return c;
  }
}

/** AdvMAME3x on RGBA pixels; wraps horizontally (strips tile), clamps vertically. */
export function scale3x(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const p = new Uint32Array(src.buffer, src.byteOffset, w * h);
  const out = new Uint32Array(w * h * 9);
  const W3 = w * 3;
  const at = (x: number, y: number) => p[Math.max(0, Math.min(h - 1, y)) * w + ((x % w) + w) % w];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1);
    const D = at(x - 1, y), E = p[y * w + x], F = at(x + 1, y);
    const G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1);
    let e0 = E, e1 = E, e2 = E, e3 = E, e5 = E, e6 = E, e7 = E, e8 = E;
    if (B !== H && D !== F) {
      if (D === B) e0 = D;
      if ((D === B && E !== C) || (B === F && E !== A)) e1 = B;
      if (B === F) e2 = F;
      if ((D === B && E !== G) || (D === H && E !== A)) e3 = D;
      if ((B === F && E !== I) || (H === F && E !== C)) e5 = F;
      if (D === H) e6 = D;
      if ((D === H && E !== I) || (H === F && E !== G)) e7 = H;
      if (H === F) e8 = F;
    }
    const o = y * 3 * W3 + x * 3;
    out[o] = e0; out[o + 1] = e1; out[o + 2] = e2;
    out[o + W3] = e3; out[o + W3 + 1] = E; out[o + W3 + 2] = e5;
    out[o + 2 * W3] = e6; out[o + 2 * W3 + 1] = e7; out[o + 2 * W3 + 2] = e8;
  }
  return new Uint8ClampedArray(out.buffer);
}

export const ramp = (light: string, dark: string, n = 4): RGB[] => Array.from({ length: n }, (_, i) => mix(hex(light), hex(dark), i / (n - 1)));

/** Stones in rows (castle walls, cobbles, flagstones): each stone shaded and speckled, dark mortar. */
export function stones(img: Img, x0: number, y0: number, w: number, h: number, rowH: number, minW: number, maxW: number, light: string, dark: string, mortar: string, seed: number): void {
  const r = ramp(light, dark, 4), m = hex(mortar);
  let row = 0;
  for (let y = y0; y < y0 + h; y += rowH, row++) {
    let x = x0 - hash(row, seed) * maxW;
    let k = 0;
    while (x < x0 + w) {
      const sw = Math.round(minW + hash(row * 97 + k, seed + 1) * (maxW - minW));
      const tint = 0.9 + hash(row * 31 + k, seed + 2) * 0.2;
      for (let j = 0; j < rowH; j++) for (let i = 0; i < sw; i++) {
        const px = x + i, py = y + j;
        if (px < x0 || px >= x0 + w || py >= y0 + h) continue;
        if (i === sw - 1 || j === rowH - 1) { img.set(px, py, m); continue; }
        let t = i === 0 || j === 0 ? 0 : i === sw - 2 || j === rowH - 2 ? 2 : 1;
        if (hash(px * 13 + py * 7, seed + 3) < 0.1) t = Math.min(3, t + 1);
        img.set(px, py, mul(r[t], tint));
      }
      x += sw; k++;
    }
  }
}

export interface Strip { canvas: HTMLCanvasElement; y: number; speed: number }

/** Blits the strips with parallax; returns false when they could not be painted (headless). */
export function drawStrips(ctx: CanvasRenderingContext2D, strips: Strip[] | null, scrollX: number, W: number): boolean {
  if (!strips) return false;
  for (const s of strips) {
    const off = ((Math.round(scrollX * s.speed) % TW) + TW) % TW;
    const k = s.canvas.width / TW; // strips may be stored enlarged
    for (let x = -off; x < W; x += TW) {
      if (k === 1) ctx.drawImage(s.canvas, x, s.y);
      else ctx.drawImage(s.canvas, x, s.y, TW, s.canvas.height / k);
    }
  }
  return true;
}
