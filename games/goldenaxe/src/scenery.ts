/**
 * 16-bit backdrops for Golden Axe: every layer is painted once, pixel by pixel, into a tileable
 * strip (sky with banded gradient and clouds, shaded mountains with snow, forest canopies,
 * textured floors with paths and stones, and the set pieces of each stage), then scrolled in
 * parallax. Painting uses periodic noise so the strips wrap without seams.
 */
import { H } from './config';

import { Img, TW, hash, hex, mix, mul, noise1, noise2, ramp, stones } from '@arcade/brawl';
import type { RGB, Strip } from '@arcade/brawl';

// ---------- generators ----------

/** Sky: 8-colour banded gradient, then puffy clouds in three tones. */
function sky(h: number, top: string, bottom: string, clouds: number, cloudCol: string, seed: number): Img {
  const img = new Img(TW, h);
  const a = hex(top), b = hex(bottom);
  for (let y = 0; y < h; y++) {
    const band = Math.floor((y / h) * 8) / 7;
    const c = mix(a, b, band);
    for (let x = 0; x < TW; x++) img.set(x, y, c);
  }
  const cr = ramp('#ffffff', cloudCol, 4).map((c) => mix(c, b, 0.15));
  for (let i = 0; i < clouds; i++) {
    const cx = hash(i, seed) * TW, cy = h * (0.25 + hash(i, seed + 1) * 0.5);
    const n = 4 + Math.floor(hash(i, seed + 2) * 5);
    for (let k = 0; k < n; k++) {
      const r = 5 + hash(i * 9 + k, seed + 3) * 8;
      img.ball(cx + (k - n / 2) * 7 + hash(k, seed + 4) * 4, cy - r * 0.4 + (k % 2) * 3, r, cr, seed + i);
    }
    for (let x = -n * 4; x < n * 4; x++) img.set(cx + x, cy + 4, cr[2]); // flat underside
  }
  return img;
}

/** Mountain range: fractal ridge, faces lit from the left, rock striations, optional snow caps. */
function mountains(h: number, base: number, amp: number, period: number, light: string, dark: string, snow: string | null, haze: string, hazeK: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp(light, dark, 4).map((c) => mix(c, hex(haze), hazeK));
  const sr = snow ? ramp('#ffffff', snow, 3).map((c) => mix(c, hex(haze), hazeK * 0.6)) : null;
  // ridged noise: sharp peaks and valleys instead of rounded plateaus
  const ridge = (x: number) => {
    let v = 0, a = 0.6, f = 1;
    for (let o = 0; o < 5; o++) { const n = noise1((x / TW) * period * f, period * f, seed + o * 17); v += (1 - Math.abs(n * 2 - 1)) * a; a *= 0.45; f *= 2; }
    return v / 1.05;
  };
  const top = (x: number) => base - Math.pow(ridge(x), 1.6) * amp;
  for (let x = 0; x < TW; x++) {
    const y0 = Math.round(top(x));
    const slope = (top(x + 3) - top(x - 3)) / 3; // >0: going down to the right
    const peak = base - amp;
    for (let y = Math.max(0, y0); y < h; y++) {
      const depth = y - y0;
      const strat = noise2((x + y * (slope > 0 ? -1.2 : 1.2)) / 3, y / 2.5, Math.round(TW / 3), seed + 5);
      let t = slope > 0.25 ? 2 : slope < -0.25 ? 0 : 1;
      if (strat > 0.8 && depth > 3) t++;
      if (depth > 26) t = Math.max(t, 2);
      if (depth > 40) t = 3;
      let c = r[Math.min(3, t)];
      if (sr && y - peak < amp * 0.32 && depth < 10 + noise1(x / 5, TW / 5, seed + 9) * 8) c = sr[Math.min(2, t)];
      img.set(x, y, c);
    }
  }
  return img;
}

/** Forest: overlapping round canopies, shaded, darker towards the back rows. */
function forest(h: number, base: number, rows: number, light: string, dark: string, trunk: string, seed: number): Img {
  const img = new Img(TW, h);
  const rr = ramp(light, dark, 5);
  for (let row = 0; row < rows; row++) {
    const y = base - (rows - 1 - row) * 5;
    const shadeK = (rows - 1 - row) * 0.18;
    const rp = rr.map((c) => mul(c, 1 - shadeK));
    const count = 28 + row * 6;
    for (let i = 0; i < count; i++) {
      const x = (i / count) * TW + hash(i, seed + row) * 14;
      const rad = 7 + hash(i, seed + row + 50) * 6;
      img.rect(x - 1, y, 3, h - y, mul(hex(trunk), 1 - shadeK));
      img.ball(x, y - rad * 0.6, rad, rp.slice(0, 4), seed + i);
      img.ball(x - rad * 0.6, y - rad * 0.2, rad * 0.7, rp.slice(1, 5), seed + i + 3);
      img.ball(x + rad * 0.6, y - rad * 0.1, rad * 0.65, rp.slice(1, 5), seed + i + 5);
    }
  }
  for (let y = base; y < h; y++) for (let x = 0; x < TW; x++) img.set(x, y, mul(rr[4], 0.8));
  return img;
}

/** Grass floor with a winding dirt path, tufts, flowers and pebbles. */
function grassFloor(h: number, grass: [string, string], dirt: [string, string] | null, seed: number, flowers = true): Img {
  const img = new Img(TW, h);
  const g = ramp(grass[0], grass[1], 4), d = dirt ? ramp(dirt[0], dirt[1], 4) : null;
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const n = noise2(x / 9, y / 4, TW / 9, seed);
    let c = g[n > 0.66 ? 1 : n > 0.33 ? 2 : 1];
    if (d) {
      const centre = h * 0.55 + (noise1(x / 40, TW / 40, seed + 3) - 0.5) * h * 0.5;
      const half = 6 + y * 0.12;
      const dist = Math.abs(y - centre);
      if (dist < half) c = d[dist > half - 2 ? 2 : noise2(x / 5, y / 3, TW / 5, seed + 4) > 0.6 ? 0 : 1];
    }
    // darker far edge, lighter near
    if (y < 4) c = mul(c, 0.8);
    img.set(x, y, c);
  }
  // tufts of grass: little V blades in light and dark
  for (let i = 0; i < 520; i++) {
    const x = hash(i, seed + 10) * TW, y = 2 + hash(i, seed + 11) * (h - 4);
    const top = img.d[((Math.round(y) * TW + Math.round(x)) * 4)] === Math.round(g[1][0]) || true;
    if (!top) continue;
    const tall = 2 + Math.floor(hash(i, seed + 12) * 3 + y / h * 2);
    for (let k = 0; k < tall; k++) { img.set(x - k * 0.4, y - k, g[k === tall - 1 ? 0 : 1]); img.set(x + 2 + k * 0.4, y - k, g[k === tall - 1 ? 0 : 1]); }
    img.set(x + 1, y, g[3]);
  }
  if (flowers) for (let i = 0; i < 40; i++) {
    const x = hash(i, seed + 20) * TW, y = 4 + hash(i, seed + 21) * (h - 6);
    const col: RGB = hash(i, seed + 22) > 0.5 ? [248, 232, 96] : [240, 120, 160];
    img.set(x, y, col); img.set(x + 1, y, col); img.set(x, y - 1, [255, 255, 255]);
  }
  // pebbles
  for (let i = 0; i < 26; i++) {
    const x = hash(i, seed + 30) * TW, y = 6 + hash(i, seed + 31) * (h - 8);
    img.ball(x, y, 1.5 + hash(i, seed + 32) * 1.5, ramp('#e0dcd0', '#5a5650', 4), seed + i);
  }
  return img;
}

// ---------- set pieces ----------

function huts(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const logs = ramp('#c08850', '#4a2c14', 4), straw = ramp('#f0d080', '#7a5420', 4);
  for (let n = 0; n < 4; n++) {
    const x0 = n * 128 + 20 + hash(n, seed) * 30, w = 54, wallH = 30;
    for (let x = 0; x < w; x++) for (let y = 0; y < wallH; y++) {
      const plank = x % 6;
      const t = plank === 0 ? 3 : plank === 1 ? 0 : plank > 3 ? 2 : 1;
      img.set(x0 + x, base - y, logs[t]);
    }
    for (let y = 0; y < 30; y++) { // thatched roof, wider than the hut
      const half = (y / 30) * (w / 2 + 10);
      for (let x = -half; x < half; x++) {
        const t = noise2((x0 + x) / 2, y, TW / 2, seed + 4) > 0.7 ? 0 : (x + y * 0.5) % 5 < 1 ? 3 : y > 26 ? 2 : 1;
        img.set(x0 + w / 2 + x, base - wallH - 30 + y, straw[t]);
      }
    }
    img.rect(x0 + 20, base - 18, 12, 19, [40, 20, 10]);
    img.rect(x0 + 21, base - 17, 10, 1, [90, 50, 20]);
    img.rect(x0 + 40, base - 22, 8, 6, [250, 210, 110]);
    img.rect(x0 + 43, base - 22, 1, 6, [70, 40, 20]);
  }
  img.outline([24, 14, 10]);
  return img;
}

function castleWall(h: number, base: number, light: string, dark: string, seed: number, torches: boolean, inside: boolean): Img {
  const img = new Img(TW, h);
  const top = inside ? 0 : base - 92;
  stones(img, 0, top, TW, base - top + 1, 8, 14, 26, light, dark, '#16121c', seed);
  if (!inside) for (let x = 0; x < TW; x += 24) stones(img, x, top - 10, 14, 10, 5, 7, 7, light, dark, '#16121c', seed + x); // battlements
  // towers / pillars
  const pr = ramp(light, dark, 5);
  for (let p = 0; p < 4; p++) {
    const cx = p * 128 + 64, pw = inside ? 22 : 30;
    for (let x = -pw / 2; x < pw / 2; x++) {
      const u = x / (pw / 2);
      const t = u < -0.55 ? 1 : u < 0.1 ? 0 : u < 0.6 ? 2 : 3;
      for (let y = inside ? 0 : top - 30; y <= base; y++) img.set(cx + x, y, mul(pr[t + (y % 18 === 0 ? 1 : 0)] ?? pr[4], 1));
    }
    if (!inside) for (let y = 0; y < 18; y++) { // conical roof
      const half = (y / 18) * (pw / 2 + 4);
      for (let x = -half; x < half; x++) img.set(cx + x, top - 48 + y, x < 0 ? [150, 50, 50] : [96, 30, 34]);
    }
    if (inside) { // capital and base
      img.rect(cx - pw / 2 - 3, 0, pw + 6, 5, pr[1]); img.rect(cx - pw / 2 - 3, base - 6, pw + 6, 7, pr[2]);
    }
  }
  // arched windows / doorways between pillars
  for (let p = 0; p < 4; p++) {
    const cx = p * 128, aw = 26, ay = base - (inside ? 60 : 70);
    for (let y = 0; y < 44; y++) for (let x = -aw / 2; x < aw / 2; x++) {
      const inArch = y > aw / 2 || (x * x + (y - aw / 2) * (y - aw / 2)) < (aw / 2) * (aw / 2);
      if (inArch) img.set(cx + x, ay + y, inside ? [14, 10, 20] : [30, 30, 60]);
    }
    if (torches) { img.rect(cx + 30, base - 50, 4, 10, [90, 60, 30]); img.rect(cx + 29, base - 51, 6, 2, [140, 140, 150]); }
  }
  img.outline([12, 8, 16]);
  return img;
}

function deadTrees(h: number, base: number, col: string, seed: number): Img {
  const img = new Img(TW, h);
  const c = ramp(col, '#100808', 3);
  const branch = (x: number, y: number, a: number, len: number, w: number, depth: number, s: number) => {
    for (let i = 0; i < len; i++) {
      const px = x + Math.sin(a) * i, py = y - Math.cos(a) * i;
      for (let k = 0; k < w; k++) img.set(px + k, py, c[k === 0 ? 0 : k === w - 1 ? 2 : 1]);
    }
    if (depth <= 0) return;
    const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
    branch(ex, ey, a - 0.5 - hash(s, seed) * 0.3, len * 0.65, Math.max(1, w - 1), depth - 1, s * 3 + 1);
    branch(ex, ey, a + 0.4 + hash(s, seed + 1) * 0.3, len * 0.6, Math.max(1, w - 1), depth - 1, s * 3 + 2);
  };
  for (let n = 0; n < 5; n++) branch(n * 102 + 30, base, (hash(n, seed) - 0.5) * 0.3, 26 + hash(n, seed + 2) * 14, 4, 4, n + 1);
  // jagged crags behind
  img.outline([10, 6, 10]);
  return img;
}

/** Sea seen from the turtle: bands of blue with sparkling crests. */
function sea(h: number, top: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#78b8f0', '#103878', 5);
  for (let y = top; y < h; y++) for (let x = 0; x < TW; x++) {
    const k = (y - top) / (h - top);
    const n = noise2(x / 12, y / 1.5, TW / 12, seed);
    let t = Math.min(4, Math.floor(k * 3 + n * 1.6));
    if (n > 0.86 && (x + y) % 3 === 0) t = 0;
    img.set(x, y, r[t]);
  }
  return img;
}

/** Turtle shell floor: hexagonal plates, lighter centres, dark seams. */
function shellFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#b0b060', '#384018', 5);
  const sz = 22;
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const row = Math.floor(y / (sz * 0.75));
    const ox = row % 2 ? sz / 2 : 0;
    const cx = Math.floor((x + ox) / sz) * sz - ox + sz / 2, cy = row * sz * 0.75 + sz * 0.4;
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    const d = Math.max(dx * 0.87 + dy * 0.5, dy) / (sz / 2);
    let t = d > 0.92 ? 4 : d > 0.75 ? 3 : d < 0.35 ? 0 : d < 0.55 ? 1 : 2;
    if (t < 3 && noise2(x / 3, y / 3, TW / 3, seed) > 0.75) t++;
    img.set(x, y, r[t]);
  }
  return img;
}

/** Eagle's head floor: overlapping feathers in gold and brown with quills. */
function featherFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#f0c878', '#4a2c10', 5);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) img.set(x, y, r[3]);
  for (let row = -1; row < h / 7 + 1; row++) for (let i = 0; i < TW / 16; i++) {
    const fx = i * 16 + (row % 2) * 8, fy = row * 7;
    for (let y = 0; y < 14; y++) for (let x = -8; x < 8; x++) {
      const u = x / 8, v = y / 14;
      if (Math.abs(u) > Math.sin(Math.PI * v) * 0.95) continue;
      let t = Math.abs(u) < 0.1 ? 0 : u < -0.4 ? 1 : u > 0.5 ? 3 : 2;
      if (v > 0.8) t = 3;
      if (t > 0 && t < 3 && hash(fx + x + (fy + y) * 517, seed) < 0.08) t--;
      img.set(fx + x - y * 0.4, fy + y, r[t]);
    }
  }
  return img;
}

/** Rocky ground for the dark stages: cracked earth with stones and bones. */
function rockFloor(h: number, light: string, dark: string, seed: number, bones: boolean): Img {
  const img = new Img(TW, h);
  const r = ramp(light, dark, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const n = noise2(x / 7, y / 3, TW / 7, seed), c = noise2(x / 3, y / 1.5, TW / 3, seed + 1);
    img.set(x, y, r[c > 0.82 ? 3 : n > 0.62 ? 0 : n > 0.32 ? 1 : 2]);
  }
  for (let i = 0; i < 34; i++) img.ball(hash(i, seed + 5) * TW, 4 + hash(i, seed + 6) * (h - 6), 2 + hash(i, seed + 7) * 3, ramp('#a8a0a0', '#302830', 4), seed + i);
  if (bones) for (let i = 0; i < 10; i++) {
    const x = hash(i, seed + 8) * TW, y = 8 + hash(i, seed + 9) * (h - 12);
    for (let k = 0; k < 7; k++) img.set(x + k, y, [230, 225, 200]);
    img.set(x - 1, y - 1, [230, 225, 200]); img.set(x - 1, y + 1, [230, 225, 200]); img.set(x + 7, y - 1, [230, 225, 200]); img.set(x + 7, y + 1, [230, 225, 200]);
  }
  return img;
}

function flagstones(h: number, light: string, dark: string, seed: number): Img {
  const img = new Img(TW, h);
  stones(img, 0, 0, TW, h, 12, 22, 40, light, dark, '#141018', seed);
  return img;
}

function stars(h: number, seed: number): Img {
  const img = new Img(TW, h);
  for (let i = 0; i < 90; i++) {
    const x = hash(i, seed) * TW, y = hash(i, seed + 1) * h * 0.8;
    const b = hash(i, seed + 2);
    img.set(x, y, b > 0.8 ? [255, 255, 255] : [150, 160, 210]);
    if (b > 0.93) { img.set(x - 1, y, [120, 130, 190]); img.set(x + 1, y, [120, 130, 190]); img.set(x, y - 1, [120, 130, 190]); img.set(x, y + 1, [120, 130, 190]); }
  }
  // the moon
  img.ball(380, 26, 11, ramp('#fffff0', '#a0a090', 4), seed);
  return img;
}

// ---------- themes ----------

const cache = new Map<string, Strip[] | null>();

/** Layers back to front for a theme; `horizon` is where the floor starts. */
export function themeStrips(theme: string, top: number, horizon: number): Strip[] | null {
  const key = `${theme}|${top}|${horizon}`;
  if (cache.has(key)) return cache.get(key)!;
  const skyH = horizon - top;
  const floorH = H - horizon;
  const L: [Img, number, number][] = []; // img, y, speed
  const bg = (img: Img, speed: number, y = top) => L.push([img, y, speed]);
  switch (theme) {
    case 'wilderness':
    default:
      bg(sky(skyH, '#2850b8', '#a8d0f8', 9, '#a0b8e0', 1), 0.04);
      bg(mountains(skyH, skyH, 96, 4, '#b8c8f0', '#3a4a80', '#c8d8f8', '#a8d0f8', 0.18, 2), 0.15);
      bg(mountains(skyH, skyH, 40, 8, '#6a9a58', '#1c4028', null, '#a8d0f8', 0.15, 3), 0.3);
      bg(forest(skyH + 2, skyH, 3, '#78c050', '#103018', '#3a2410', 4), 0.55);
      bg(grassFloor(floorH, ['#80c048', '#2c5c20'], ['#d8b880', '#7a5a30'], 5), 1, horizon);
      break;
    case 'village':
      bg(sky(skyH, '#2848b0', '#b0d8f8', 7, '#a0b8e0', 11), 0.04);
      bg(mountains(skyH, skyH, 60, 4, '#a8c0e8', '#384878', '#d8e8f8', '#b0d8f8', 0.2, 12), 0.15);
      bg(forest(skyH + 2, skyH, 2, '#70b050', '#183818', '#3a2410', 13), 0.35);
      bg(huts(skyH + 2, skyH, 14), 0.6);
      bg(grassFloor(floorH, ['#a8a058', '#4a4420'], ['#e0c890', '#806038'], 15, false), 1, horizon);
      break;
    case 'turtle':
      bg(sky(skyH, '#2040b8', '#90c8f8', 6, '#a8c0e8', 21), 0.04);
      bg(sea(skyH, Math.round(skyH * 0.5), 22), 0.1);
      bg(shellFloor(floorH, 23), 1, horizon);
      break;
    case 'eagle':
      bg(sky(skyH, '#1830a8', '#80c0f8', 14, '#d0e0f8', 31), 0.06);
      bg(sky(skyH, '#1830a8', '#80c0f8', 0, '#ffffff', 32), 0.0); // replaced below by the cloud sea
      L.pop();
      bg(mountains(skyH, skyH, 30, 4, '#ffffff', '#90a8d8', null, '#80c0f8', 0.1, 33), 0.2);
      bg(featherFloor(floorH, 34), 1, horizon);
      break;
    case 'path':
      bg(sky(skyH, '#281038', '#d07060', 5, '#904060', 41), 0.04);
      bg(mountains(skyH, skyH, 80, 4, '#805070', '#20101c', null, '#d07060', 0.15, 42), 0.15);
      bg(mountains(skyH, skyH, 46, 10, '#5a3838', '#180c10', null, '#d07060', 0.05, 43), 0.3);
      bg(deadTrees(skyH + 2, skyH, '#3a2420', 44), 0.6);
      bg(rockFloor(floorH, '#9a7058', '#2a1810', 45, true), 1, horizon);
      break;
    case 'gate':
      bg(stars(skyH, 51), 0.02);
      bg(mountains(skyH, skyH, 50, 6, '#383860', '#101024', null, '#202040', 0.2, 52), 0.12);
      bg(castleWall(skyH + 2, skyH, '#9890a8', '#302c40', 53, true, false), 0.6);
      bg(flagstones(floorH, '#8a8a90', '#2c2c34', 54), 1, horizon);
      break;
    case 'castle':
      bg(castleWall(skyH + 2, skyH, '#7a7088', '#201c2c', 61, true, true), 0.6);
      bg(flagstones(floorH, '#6a6a78', '#1c1c26', 62), 1, horizon);
      break;
    case 'dungeon':
      bg(castleWall(skyH + 2, skyH, '#4a4058', '#0c0a12', 71, true, true), 0.6);
      bg(rockFloor(floorH, '#4a4050', '#0c0a10', 72, true), 1, horizon);
      break;
    case 'camp':
      bg(stars(skyH, 81), 0.02);
      bg(mountains(skyH, skyH, 50, 6, '#283050', '#0c1020', null, '#101830', 0.2, 82), 0.12);
      bg(forest(skyH + 2, skyH, 2, '#284a38', '#04100c', '#100808', 83), 0.4);
      bg(grassFloor(floorH, ['#3c6040', '#0c2014'], ['#6a6050', '#2a2418'], 84, false), 1, horizon);
      break;
  }
  const out: Strip[] = [];
  for (const [img, y, speed] of L) {
    const c = img.canvas();
    if (!c) { cache.set(key, null); return null; }
    out.push({ canvas: c, y, speed });
  }
  cache.set(key, out);
  return out;
}

