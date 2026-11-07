/**
 * Painted 360-degree backdrops for the three courses (the strip repeats three times around the
 * horizon): banded skies with clouds, ridged and shaded mountains with snow, conifer hills for
 * Big Forest, a hazy skyline over the bay for Bay Bridge, warm cliffs and a temple for Acropolis.
 */
import { Img, TW, hash, hex, mix, noise1, noise2, ramp } from '@arcade/brawl';
import type { RGB } from '@arcade/brawl';

export const PANO_H = 120;

function skyBands(img: Img, top: string, bottom: string): void {
  const a = hex(top), b = hex(bottom);
  for (let y = 0; y < img.h; y++) { const c = mix(a, b, Math.floor((y / img.h) * 10) / 9); for (let x = 0; x < TW; x++) img.set(x, y, c); }
}

function clouds(img: Img, n: number, col: string, seed: number): void {
  const cr = ramp('#ffffff', col, 4);
  for (let i = 0; i < n; i++) {
    const cx = hash(i, seed) * TW, cy = 14 + hash(i, seed + 1) * 40;
    const k = 3 + Math.floor(hash(i, seed + 2) * 4);
    for (let j = 0; j < k; j++) img.ball(cx + (j - k / 2) * 8, cy - (j % 2) * 3, 5 + hash(i * 7 + j, seed + 3) * 5, cr, seed + i);
  }
}

function ridge(img: Img, base: number, amp: number, period: number, light: string, dark: string, haze: string, hazeK: number, snow: boolean, seed: number): void {
  const r = ramp(light, dark, 4).map((c) => mix(c, hex(haze), hazeK));
  const sr = ramp('#ffffff', '#a8b8d8', 3).map((c) => mix(c, hex(haze), hazeK * 0.5));
  const h = (x: number) => {
    let v = 0, a = 0.6, f = 1;
    for (let o = 0; o < 5; o++) { const n = noise1((x / TW) * period * f, period * f, seed + o * 17); v += (1 - Math.abs(n * 2 - 1)) * a; a *= 0.45; f *= 2; }
    return base - Math.pow(v / 1.05, 1.6) * amp;
  };
  for (let x = 0; x < TW; x++) {
    const y0 = Math.round(h(x)), slope = (h(x + 3) - h(x - 3)) / 3;
    for (let y = Math.max(0, y0); y < img.h; y++) {
      const d = y - y0;
      let t = slope > 0.25 ? 2 : slope < -0.25 ? 0 : 1;
      if (noise2((x + y * (slope > 0 ? -1.2 : 1.2)) / 3, y / 2.5, Math.round(TW / 3), seed + 5) > 0.8 && d > 3) t++;
      if (d > 30) t = 3;
      let c = r[Math.min(3, t)];
      if (snow && y < base - amp * 0.62 && d < 8) c = sr[Math.min(2, t)];
      img.set(x, y, c);
    }
  }
}

function conifers(img: Img, base: number, count: number, light: string, dark: string, seed: number): void {
  const r = ramp(light, dark, 4);
  for (let i = 0; i < count; i++) {
    const x = hash(i, seed) * TW, h = 10 + hash(i, seed + 1) * 12, w = h * 0.42;
    const yb = base + hash(i, seed + 2) * 4;
    for (let y = 0; y < h; y++) {
      const half = (y / h) * w * (1 + 0.25 * ((y % 4) / 4));
      for (let k = -half; k <= half; k++) img.set(x + k, yb - h + y, r[k < -half * 0.3 ? 0 : k < half * 0.3 ? 1 : y % 4 === 3 ? 3 : 2]);
    }
  }
  for (let y = base + 2; y < img.h; y++) for (let x = 0; x < TW; x++) img.set(x, y, r[3]);
}

function city(img: Img, base: number, seed: number): void {
  const body = ramp('#c8d0e0', '#4a5470', 4);
  let x = 0, k = 0;
  while (x < 200) {
    const w = 6 + Math.round(hash(k, seed) * 12), bh = 8 + Math.round(hash(k, seed + 1) * 34);
    for (let i = 0; i < w; i++) for (let y = base - bh; y <= base; y++) {
      const win = i % 3 === 1 && (y - base) % 3 === 0;
      img.set(140 + x + i, y, win ? body[3] : body[i < 2 ? 0 : i === w - 1 ? 3 : 1]);
    }
    x += w + 1; k++;
  }
  // the bay
  const sea = ramp('#80b8f0', '#1c4c90', 4);
  for (let y = base + 1; y < img.h; y++) for (let x2 = 0; x2 < TW; x2++) img.set(x2, y, sea[Math.min(3, Math.floor(((y - base) / (img.h - base)) * 3 + noise2(x2 / 8, y, TW / 8, seed) * 0.8))]);
}

function temple(img: Img, x0: number, base: number): void {
  const st: RGB[] = ramp('#fff4dc', '#9a8460', 4);
  for (let y = 0; y < 4; y++) for (let x = -y * 2 - 22; x < 22 + y * 2; x++) img.set(x0 + x, base - 26 + y - 4, st[y === 0 ? 0 : 1]);
  for (let c = 0; c < 8; c++) for (let y = 0; y < 20; y++) for (let k = 0; k < 3; k++) img.set(x0 - 20 + c * 6 + k, base - 22 + y, st[k === 0 ? 0 : k === 1 ? 1 : 3]);
  for (let x = -24; x < 24; x++) for (let y = 0; y < 3; y++) img.set(x0 + x, base - 2 + y, st[2]);
}

const cache = new Map<string, HTMLCanvasElement | null>();

/** The painted panorama strip for a course (bottom row sits on the horizon). */
export function panorama(course: string): HTMLCanvasElement | null {
  if (cache.has(course)) return cache.get(course)!;
  const img = new Img(TW, PANO_H);
  const B = PANO_H - 1;
  if (course === 'baybridge') {
    skyBands(img, '#2a64c8', '#c0dcf8');
    clouds(img, 8, '#b0c4e0', 3);
    ridge(img, B - 8, 46, 4, '#90a8d0', '#384a78', '#c0dcf8', 0.35, false, 4);
    city(img, B - 8, 5);
  } else if (course === 'acropolis') {
    skyBands(img, '#c86a3a', '#f8d8a0');
    clouds(img, 5, '#e8a070', 6);
    ridge(img, B, 64, 4, '#e0a060', '#5a2c18', '#f8d8a0', 0.25, false, 7);
    ridge(img, B, 30, 7, '#c08048', '#3a1c10', '#f8d8a0', 0.08, false, 8);
    temple(img, 380, B - 22);
  } else {
    skyBands(img, '#1c54c0', '#a8d4f8');
    clouds(img, 9, '#a8c0e0', 9);
    ridge(img, B, 84, 4, '#b8c8f0', '#3a4a80', '#a8d4f8', 0.2, true, 10);
    ridge(img, B, 36, 7, '#6aa060', '#163a20', '#a8d4f8', 0.12, false, 11);
    conifers(img, B - 4, 160, '#4a9a50', '#0c2c14', 12);
  }
  const c = img.canvas();
  cache.set(course, c);
  return c;
}
