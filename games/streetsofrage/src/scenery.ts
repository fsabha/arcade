/**
 * 16-bit backdrops for Streets of Rage, painted once per round into tileable strips: night
 * skylines with lit windows, shop fronts with awnings and neon, brick alleys with graffiti,
 * the sunset beach, the bridge, the ship, the factory and the syndicate's office, plus floors
 * (sidewalk and asphalt, concrete, sand, planks, steel plate, carpet).
 */
import { H } from './config';
import { Img, TW, hash, hex, mix, mul, noise1, noise2, ramp, stones } from '@arcade/brawl';
import type { RGB, Strip } from '@arcade/brawl';

const OUT: RGB = [10, 8, 16];

function sky(h: number, top: string, bottom: string, starCount: number, seed: number): Img {
  const img = new Img(TW, h);
  const a = hex(top), b = hex(bottom);
  for (let y = 0; y < h; y++) {
    const c = mix(a, b, Math.floor((y / h) * 10) / 9);
    for (let x = 0; x < TW; x++) img.set(x, y, c);
  }
  for (let i = 0; i < starCount; i++) {
    const x = hash(i, seed) * TW, y = hash(i, seed + 1) * h * 0.7;
    img.set(x, y, hash(i, seed + 2) > 0.7 ? [255, 255, 255] : [140, 150, 200]);
  }
  return img;
}

/** City skyline: shaded towers, lit windows, roof tanks and antennas, hazed by distance. */
function skyline(h: number, base: number, maxH: number, body: string, haze: string, hazeK: number, seed: number, minW = 18, maxW = 46): Img {
  const img = new Img(TW, h);
  const r = ramp(body, '#04040a', 4).map((c) => mix(c, hex(haze), hazeK));
  const lit = [mix([255, 220, 120], hex(haze), hazeK * 0.6), mix([250, 250, 210], hex(haze), hazeK * 0.6), mix([120, 200, 255], hex(haze), hazeK * 0.6)] as RGB[];
  let x = 0, k = 0;
  while (x < TW) {
    const w = Math.round(minW + hash(k, seed) * (maxW - minW));
    const bh = Math.round(maxH * (0.35 + hash(k, seed + 1) * 0.65));
    const top = base - bh;
    const side = Math.max(3, Math.round(w * 0.22));
    for (let i = 0; i < w && x + i < TW; i++) for (let y = top; y <= base; y++) {
      const face = i < side ? 1 : i === w - 1 ? 3 : 2;
      img.set(x + i, y, r[face]);
    }
    // windows on the front face
    const cols = Math.floor((w - side - 2) / 4), rows = Math.floor((bh - 6) / 5);
    for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) {
      const on = hash(k * 977 + cx * 31 + ry, seed + 2) < 0.38;
      const c = on ? lit[Math.floor(hash(k + cx + ry * 7, seed + 3) * 3)] : r[3];
      img.rect(x + side + 1 + cx * 4, top + 4 + ry * 5, 2, 3, c);
    }
    if (hash(k, seed + 4) > 0.6) { img.rect(x + w / 2, top - 8, 1, 8, r[1]); img.set(x + w / 2, top - 9, [255, 60, 60]); }
    else if (hash(k, seed + 5) > 0.5) img.rect(x + side + 2, top - 5, 8, 5, r[2]);
    x += w + Math.round(hash(k, seed + 6) * 4);
    k++;
  }
  return img;
}

/** Street-level fronts: two storeys over shops with lit windows, striped awnings and neon signs. */
function shopFronts(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const walls = [['#a86450', '#40201c'], ['#8a8aa0', '#2a2a3a'], ['#b09070', '#3c2c20'], ['#607890', '#1c2430']];
  const neon: RGB[] = [[255, 60, 160], [60, 230, 255], [255, 220, 60], [120, 255, 120]];
  for (let n = 0; n < 4; n++) {
    const x0 = n * 128, top = base - 100 - Math.round(hash(n, seed) * 10);
    const [l, d] = walls[n % walls.length];
    if (n % 2 === 0) stones(img, x0, top, 128, base - top, 4, 8, 12, l, d, '#24161a', seed + n);
    else { const rr = ramp(l, d, 4); for (let y = top; y <= base; y++) for (let x = 0; x < 128; x++) img.set(x0 + x, y, rr[(y - top) % 12 === 0 ? 2 : noise2((x0 + x) / 3, y / 3, Math.round(TW / 3), seed) > 0.75 ? 0 : 1]); }
    img.rect(x0, top - 3, 128, 3, ramp(l, d, 4)[0]); // cornice
    img.rect(x0, top, 128, 1, OUT);
    // upper windows with frames, some lit
    for (let fl = 0; fl < 2; fl++) for (let wi = 0; wi < 4; wi++) {
      const wx = x0 + 10 + wi * 29, wy = top + 8 + fl * 26;
      const on = hash(n * 13 + fl * 5 + wi, seed + 1) < 0.5;
      img.rect(wx - 1, wy - 1, 18, 19, OUT);
      img.rect(wx, wy, 16, 17, on ? [240, 200, 110] : [40, 48, 80]);
      if (on) img.rect(wx + 1, wy + 1, 6, 15, [255, 236, 170]);
      else img.rect(wx + 1, wy + 1, 3, 15, [70, 84, 130]);
      img.rect(wx + 7, wy, 2, 17, [90, 70, 60]);
      img.rect(wx - 2, wy + 17, 20, 2, [200, 196, 190]);
    }
    // shop: glass with goods glowing, a door, the awning
    const sy = base - 40;
    img.rect(x0 + 6, sy, 116, 41, [26, 20, 30]);
    img.rect(x0 + 8, sy + 10, 70, 28, [90, 120, 150]);
    for (let i = 0; i < 9; i++) img.ball(x0 + 14 + i * 7, sy + 30, 3, ramp(['#f06060', '#60c0f0', '#f0e060', '#c070f0'][(i + n) % 4], '#202030', 4), seed + i);
    img.rect(x0 + 8, sy + 10, 70, 2, [200, 230, 255]);
    img.rect(x0 + 86, sy + 12, 24, 29, [60, 34, 24]);
    img.rect(x0 + 88, sy + 14, 20, 12, [150, 190, 210]);
    img.set(x0 + 104, sy + 28, [240, 210, 80]);
    const stripe: RGB[] = [[[220, 40, 50], [40, 120, 210], [40, 160, 80], [230, 150, 30]][n % 4] as RGB, [240, 236, 228]];
    for (let y = 0; y < 9; y++) for (let x = 0; x < 120 + y; x++) {
      const c = stripe[Math.floor((x + y * 0.3) / 6) % 2];
      img.set(x0 + 4 - y / 2 + x, sy + y, mul(c, y > 6 ? 0.7 : 1));
    }
    // neon sign
    const nc = neon[n % neon.length];
    const sx = x0 + 30, sy2 = top + 60;
    img.rect(sx - 2, sy2 - 2, 60, 13, [16, 10, 20]);
    for (let i = 0; i < 6; i++) { // letter-ish glyphs drawn as neon tubes
      const gx = sx + 2 + i * 9;
      img.rect(gx, sy2, 1, 9, nc); img.rect(gx, sy2, 5, 1, nc); img.rect(gx + (i % 2 ? 4 : 0), sy2 + 4, 1, 5, nc); img.rect(gx, sy2 + 8, 5, 1, nc);
    }
  }
  return img;
}

/** Brick alley: soot-stained bricks, graffiti, a fire escape, metal doors and bins. */
function alley(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  stones(img, 0, 0, TW, base + 1, 4, 8, 12, '#a85a42', '#3a1a14', '#2a1814', seed);
  // soot towards the ground
  for (let y = 0; y <= base; y++) for (let x = 0; x < TW; x++) {
    const k = Math.max(0, (y - base * 0.6) / (base * 0.4)) * 0.45 + noise2(x / 10, y / 10, Math.round(TW / 10), seed) * 0.15;
    const i = (y * TW + x) * 4;
    img.d[i] *= 1 - k; img.d[i + 1] *= 1 - k; img.d[i + 2] *= 1 - k;
  }
  // graffiti: fat sprayed blobs with an outline and drips
  const tags: RGB[] = [[230, 60, 160], [60, 200, 240], [250, 210, 40], [90, 220, 90]];
  for (let g = 0; g < 4; g++) {
    const gx = g * 128 + 30, gy = base - 34;
    const c = tags[g];
    for (let i = 0; i < 6; i++) img.ball(gx + i * 9, gy + Math.sin(i * 1.7 + g) * 3, 5 + (i % 2), [mix(c, [255, 255, 255], 0.4), c, c, mul(c, 0.6)], seed + g * 10 + i);
    for (let i = 0; i < 5; i++) img.rect(gx + i * 11 + 2, gy + 6, 1, 4 + (i * 3) % 6, mul(c, 0.7));
  }
  // metal doors and the fire escape
  for (let d = 0; d < 2; d++) {
    const dx = d * 256 + 180;
    img.rect(dx - 1, base - 41, 26, 42, OUT);
    const dr = ramp('#8a96a0', '#2a3038', 4);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 24; x++) img.set(dx + x, base - 40 + y, dr[x < 2 ? 0 : x > 21 ? 3 : y % 10 === 0 ? 2 : 1]);
    img.rect(dx + 18, base - 22, 3, 2, [220, 200, 120]);
    // fire escape: platform and ladder
    const fx = d * 256 + 60;
    img.rect(fx, base - 70, 70, 2, [50, 50, 60]);
    for (let i = 0; i < 70; i += 5) img.rect(fx + i, base - 78, 1, 8, [60, 60, 70]);
    img.rect(fx, base - 78, 70, 1, [80, 80, 90]);
    for (let y = base - 68; y < base - 20; y += 4) img.rect(fx + 56, y, 8, 1, [70, 70, 80]);
    img.rect(fx + 56, base - 68, 1, 48, [70, 70, 80]); img.rect(fx + 63, base - 68, 1, 48, [70, 70, 80]);
  }
  img.outline(OUT);
  return img;
}

/** Sunset: orange-pink banded sky, the sun, streaky clouds. */
function sunsetSky(h: number, seed: number): Img {
  const img = sky(h, '#5a2a78', '#ffb050', 0, seed);
  img.ball(TW * 0.3, h * 0.72, 16, ramp('#fff8d0', '#ffa040', 4), seed);
  for (let y = 0; y < h * 0.6; y += 1) for (let x = 0; x < TW; x++) {
    const n = noise2(x / 30, y / 2, Math.round(TW / 30), seed + 1);
    if (n > 0.72) img.set(x, y, mix(hex('#ff8070'), hex('#7a3060'), (y / h) * 0.5 + (n - 0.72)));
  }
  return img;
}

/** The sea at sunset/night with the sun's reflection and crests. */
function sea(h: number, top: number, light: string, dark: string, glitter: RGB, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp(light, dark, 4);
  for (let y = top; y < h; y++) for (let x = 0; x < TW; x++) {
    const k = (y - top) / (h - top);
    const n = noise2(x / 10, y / 1.2, Math.round(TW / 10), seed);
    let c = r[Math.min(3, Math.floor(k * 2.4 + n))];
    if (n > 0.8 && (x + y) % 2 === 0) c = glitter;
    if (Math.abs(x - TW * 0.3) < 10 + k * 14 && n > 0.45 && (x + y * 3) % 4 === 0) c = glitter;
    img.set(x, y, c);
  }
  return img;
}

function palms(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const bark = ramp('#c08a50', '#402410', 4), leaf = ramp('#70d060', '#0c3010', 4);
  for (let p = 0; p < 4; p++) {
    let x = p * 128 + 40 + hash(p, seed) * 40, y = base;
    const lean = (hash(p, seed + 1) - 0.5) * 0.8;
    for (let i = 0; i < 80; i++) { // trunk with rings
      x += lean * (i / 80);
      y -= 1;
      for (let k = -3; k <= 3; k++) img.set(x + k, y, bark[i % 6 === 0 ? 3 : k < -1 ? 0 : k > 1 ? 2 : 1]);
    }
    for (let f = 0; f < 7; f++) { // fronds
      const a = -Math.PI / 2 + (f - 3) * 0.55;
      for (let t = 0; t < 34; t++) {
        const fx = x + Math.cos(a) * t, fy = y + Math.sin(a) * t + t * t * 0.018;
        const w = Math.max(1, 4 - Math.abs(t - 12) / 6);
        for (let k = -w; k <= w; k++) img.set(fx, fy + k, leaf[k < 0 ? 0 : k === 0 ? 1 : t > 26 ? 3 : 2]);
      }
    }
    img.ball(x, y + 2, 3, ramp('#a07040', '#301808', 4), seed + p); // coconuts
    img.ball(x + 4, y + 3, 3, ramp('#a07040', '#301808', 4), seed + p + 1);
  }
  img.outline(OUT);
  return img;
}

/** Suspension bridge: towers and the swooping main cable with hangers. */
function bridge(h: number, base: number): Img {
  const img = new Img(TW, h);
  const steel = ramp('#c04848', '#300c10', 4);
  for (let t = 0; t < 2; t++) {
    const tx = t * 256 + 40;
    for (let y = 0; y < base; y++) for (let x = 0; x < 12; x++) if (x < 3 || x > 8 || y % 30 < 4) img.set(tx + x, y, steel[x < 1 ? 0 : x > 10 ? 3 : x < 3 ? 1 : 2]);
    for (let x = 0; x < 256; x++) {
      const u = x / 256;
      const cy = 8 + Math.pow(Math.abs(u - 0.5) * 2, 2) * -0 + (1 - Math.pow((u - 0.5) * 2, 2)) * (base - 30);
      img.set(tx + 12 + x, cy, steel[1]); img.set(tx + 12 + x, cy + 1, steel[3]);
      if (x % 10 === 0) for (let y = cy + 2; y < base; y++) img.set(tx + 12 + x, y, steel[2]);
    }
  }
  return img;
}

/** Ship superstructure: white steel with portholes, rivets, a funnel and a lifeboat. */
function ship(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const hull = ramp('#f0f0ec', '#606878', 4);
  const top = base - 64;
  for (let y = top; y <= base; y++) for (let x = 0; x < TW; x++) img.set(x, y, hull[(y - top) % 16 === 0 ? 2 : x % 64 === 0 ? 3 : (y - top) % 16 === 1 ? 0 : 1]);
  for (let x = 4; x < TW; x += 8) for (let y = top + 3; y < base; y += 16) img.set(x, y, hull[2]);
  for (let i = 0; i < 8; i++) { // portholes
    const px = i * 64 + 32, py = top + 26;
    img.ball(px, py, 6, ramp('#d0d8e0', '#404858', 4), seed + i);
    img.ball(px, py, 4, ramp(hash(i, seed) > 0.4 ? '#ffe080' : '#5080c0', '#102040', 4), seed + i);
  }
  for (let f = 0; f < 2; f++) { // funnel
    const fx = f * 256 + 140;
    for (let y = top - 40; y < top; y++) for (let x = 0; x < 30; x++) img.set(fx + x, y, y < top - 30 ? [30, 30, 36] : x < 6 ? [230, 80, 60] : x > 24 ? [120, 30, 30] : [200, 50, 40]);
  }
  for (let b = 0; b < 2; b++) { // lifeboat
    const bx = b * 256 + 20;
    for (let x = 0; x < 60; x++) { const d = Math.abs(x - 30) / 30; for (let y = 0; y < 10 - d * 4; y++) img.set(bx + x, top - 12 + y + d * 2, y < 3 ? [250, 250, 240] : [230, 110, 40]); }
  }
  img.outline(OUT);
  return img;
}

/** Factory: corrugated wall, a run of shaded pipes with valves, machines with gauges and hazard stripes. */
function factory(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const wall = ramp('#7a7488', '#1c1a24', 4);
  for (let y = 0; y <= base; y++) for (let x = 0; x < TW; x++) img.set(x, y, wall[x % 8 < 2 ? 0 : x % 8 < 5 ? 1 : x % 8 < 7 ? 2 : 3]);
  const pipe = (y: number, r: number, light: string, dark: string) => {
    const pr = ramp(light, dark, 4);
    for (let x = 0; x < TW; x++) for (let k = -r; k <= r; k++) img.set(x, y + k, pr[k < -r / 2 ? 0 : k < 0 ? 1 : k < r / 2 ? 2 : 3]);
    for (let x = 0; x < TW; x += 64) for (let k = -r - 1; k <= r + 1; k++) img.rect(x, y + k, 3, 1, pr[k < 0 ? 1 : 3]);
  };
  pipe(14, 5, '#d0a060', '#4a2c10');
  pipe(30, 3, '#a0c0d0', '#203040');
  for (let m = 0; m < 4; m++) { // machines
    const mx = m * 128 + 14, mw = 70, mh = 54 + (m % 2) * 10;
    const mr = ramp('#90a0a8', '#202830', 4);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) img.set(mx + x, base - y, mr[x < 3 ? 0 : x > mw - 4 ? 3 : y % 18 === 0 ? 2 : 1]);
    for (let x = 0; x < mw; x++) for (let y = 0; y < 6; y++) img.set(mx + x, base - mh + 6 + y, Math.floor((x + y) / 4) % 2 ? [240, 200, 40] : [30, 26, 20]);
    for (let g = 0; g < 2; g++) {
      const gx = mx + 18 + g * 30, gy = base - mh + 28;
      img.ball(gx, gy, 7, ramp('#f0f0e8', '#808890', 4), seed + m * 3 + g);
      for (let k = 0; k < 5; k++) img.set(gx + Math.cos(-0.6 - g) * k, gy + Math.sin(-0.6 - g) * k, [200, 30, 30]);
    }
    img.rect(mx + 8, base - 16, 10, 4, hash(m, seed) > 0.5 ? [80, 230, 80] : [230, 60, 40]);
  }
  img.outline(OUT);
  return img;
}

/** Syndicate office: dark wood panelling, tall windows over the city at night, gold trim. */
function office(h: number, base: number, seed: number): Img {
  const img = new Img(TW, h);
  const wood = ramp('#a05a30', '#200c06', 4);
  for (let y = 0; y <= base; y++) for (let x = 0; x < TW; x++) {
    const grain = noise2(x / 2, y / 14, TW / 2, seed);
    img.set(x, y, wood[x % 32 === 0 ? 3 : x % 32 === 1 ? 0 : grain > 0.6 ? 1 : 2]);
  }
  const city = skyline(56, 56, 46, '#3a3060', '#100828', 0.1, seed + 1, 8, 20);
  for (let w = 0; w < 4; w++) {
    const wx = w * 128 + 24, wy = 10;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 80; x++) {
      const i = (Math.min(55, y) * TW + ((wx + x) % TW)) * 4;
      const c: RGB = city.d[i + 3] ? [city.d[i], city.d[i + 1], city.d[i + 2]] : mix([16, 8, 40], [60, 30, 90], y / 60);
      img.set(wx + x, wy + y, c);
    }
    img.rect(wx + 39, wy, 2, 60, [200, 160, 60]);
    img.rect(wx - 2, wy - 2, 84, 2, [220, 180, 70]); img.rect(wx - 2, wy + 60, 84, 3, [160, 120, 40]);
  }
  img.rect(0, base - 12, TW, 2, [220, 180, 70]);
  return img;
}

// ---------- floors ----------

function streetFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const pave = ramp('#a8a4b0', '#3a3844', 4), road = ramp('#5a5866', '#18161e', 4);
  const walk = 22;
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    if (y < walk) {
      const joint = x % 24 === 0 || y % 11 === 10;
      img.set(x, y, joint ? pave[3] : pave[noise2(x / 4, y / 4, TW / 4, seed) > 0.65 ? 0 : x % 24 === 1 || y % 11 === 0 ? 0 : 1]);
    } else if (y < walk + 3) img.set(x, y, y === walk ? pave[0] : pave[3]); // curb
    else {
      const n = noise2(x / 2, y / 2, TW / 2, seed + 1);
      let c = road[n > 0.78 ? 0 : n > 0.4 ? 1 : 2];
      if (Math.abs(y - (walk + (h - walk) * 0.55)) < 1.5 && x % 64 < 32) c = [230, 200, 60];
      img.set(x, y, c);
    }
  }
  for (let m = 0; m < 2; m++) img.ball(m * 256 + 120, h - 16, 8, ramp('#707080', '#202028', 4), seed + m); // manholes
  return img;
}

function concreteFloor(h: number, light: string, dark: string, seed: number, puddles: boolean): Img {
  const img = new Img(TW, h);
  const r = ramp(light, dark, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const n = noise2(x / 6, y / 3, Math.round(TW / 6), seed), c = noise2(x / 2, y, TW / 2, seed + 1);
    img.set(x, y, r[c > 0.85 ? 3 : (x % 80 === 0 || y % 26 === 25) ? 2 : n > 0.6 ? 0 : 1]);
  }
  if (puddles) for (let i = 0; i < 5; i++) {
    const px = hash(i, seed) * TW, py = 10 + hash(i, seed + 1) * (h - 20);
    for (let y = -3; y <= 3; y++) for (let x = -14; x <= 14; x++) if (x * x / 196 + y * y / 9 < 1) img.set(px + x, py + y, y < 0 ? [120, 140, 190] : [70, 80, 120]);
  }
  return img;
}

function sandFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#f8e0a0', '#a07840', 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const ripple = Math.sin((x * 0.15 + y * 0.9) + noise1(x / 20, TW / 20, seed) * 6);
    img.set(x, y, r[ripple > 0.7 ? 0 : ripple < -0.8 ? 2 : hash(x * 7 + y * 13, seed) < 0.06 ? 2 : 1]);
  }
  for (let i = 0; i < 14; i++) img.ball(hash(i, seed + 2) * TW, 6 + hash(i, seed + 3) * (h - 8), 2, ramp('#fff0f0', '#c08080', 4), seed + i);
  // wet edge where the waves reach
  for (let x = 0; x < TW; x++) for (let y = 0; y < 3 + noise1(x / 16, TW / 16, seed + 4) * 4; y++) img.set(x, y, [200, 170, 110]);
  return img;
}

function plankFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#d8a060', '#4a2810', 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const row = Math.floor(y / 7), off = (row * 37) % 64;
    const seam = y % 7 === 6 || (x + off) % 64 === 0;
    const grain = noise2(x / 12, y / 1, Math.round(TW / 12), seed + row);
    img.set(x, y, seam ? r[3] : r[y % 7 === 0 ? 0 : grain > 0.62 ? 2 : 1]);
    if ((x + off) % 64 === 3 && y % 7 === 3) img.set(x, y, [60, 50, 40]);
  }
  return img;
}

function plateFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#a8b0b8', '#2a3038', 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    const diamond = ((x + y) % 6 === 0 && (x - y + 600) % 12 < 3) || ((x - y + 600) % 6 === 0 && (x + y) % 12 < 3);
    const seam = x % 48 === 0 || y % 24 === 23;
    img.set(x, y, seam ? r[3] : diamond ? r[0] : r[noise2(x / 8, y / 4, TW / 8, seed) > 0.6 ? 1 : 2]);
    if ((x % 48 === 4 || x % 48 === 44) && y % 24 === 4) img.set(x, y, r[0]);
  }
  return img;
}

function carpetFloor(h: number, seed: number): Img {
  const img = new Img(TW, h);
  const r = ramp('#d03848', '#400810', 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < TW; x++) {
    let c = r[noise2(x / 2, y / 2, TW / 2, seed) > 0.7 ? 1 : 2];
    if (y < 4) c = [40, 30, 20];
    else if (y < 7 || (y > 10 && y < 13)) c = [220, 180, 70];
    else if ((x % 32 === 16 && y % 16 < 8) || ((x + 8) % 32 === 0 && (y + 8) % 16 < 8)) c = r[0];
    img.set(x, y, c);
  }
  return img;
}

// ---------- rounds ----------

const cache = new Map<string, Strip[] | null>();

/** Painted layers for a round (back to front); null when they cannot be painted (headless). */
export function roundStrips(theme: string, top: number, horizon: number): Strip[] | null {
  const key = `${theme}|${top}|${horizon}`;
  if (cache.has(key)) return cache.get(key)!;
  const skyH = horizon - top, floorH = H - horizon;
  const L: [Img, number, number][] = [];
  const bg = (img: Img, speed: number, y = top) => L.push([img, y, speed]);
  switch (theme) {
    case 'street': default:
      bg(sky(skyH, '#06061a', '#3a2060', 60, 1), 0.02);
      bg(skyline(skyH, skyH - 40, 70, '#3a3a70', '#3a2060', 0.35, 2), 0.15);
      bg(shopFronts(skyH + 1, skyH, 3), 0.55);
      bg(streetFloor(floorH, 4), 1, horizon);
      break;
    case 'alley':
      bg(alley(skyH + 1, skyH, 11), 0.6);
      bg(concreteFloor(floorH, '#8a8a94', '#2a2a32', 12, true), 1, horizon);
      break;
    case 'beach':
      bg(sunsetSky(skyH, 21), 0.03);
      bg(sea(skyH, Math.round(skyH * 0.62), '#7090d0', '#18205a', [255, 220, 150], 22), 0.1);
      bg(palms(skyH + 1, skyH, 23), 0.6);
      bg(sandFloor(floorH, 24), 1, horizon);
      break;
    case 'bridge':
      bg(sky(skyH, '#040818', '#1c2450', 70, 31), 0.02);
      bg(skyline(skyH, skyH - 18, 40, '#28305a', '#1c2450', 0.4, 32, 10, 26), 0.1);
      bg(bridge(skyH + 1, skyH), 0.45);
      bg(streetFloor(floorH, 33), 1, horizon);
      break;
    case 'ship':
      bg(sky(skyH, '#060c24', '#203a68', 50, 41), 0.02);
      bg(sea(skyH, Math.round(skyH * 0.45), '#3a68a8', '#08142c', [200, 220, 255], 42), 0.08);
      bg(ship(skyH + 1, skyH, 43), 0.6);
      bg(plankFloor(floorH, 44), 1, horizon);
      break;
    case 'factory':
      bg(factory(skyH + 1, skyH, 51), 0.6);
      bg(plateFloor(floorH, 52), 1, horizon);
      break;
    case 'hq':
      bg(office(skyH + 1, skyH, 61), 0.6);
      bg(carpetFloor(floorH, 62), 1, horizon);
      break;
  }
  const out: Strip[] = [];
  for (const [img, y, speed] of L) {
    const c = img.canvas(3); // enlarged with Scale3x for the 3x screen
    if (!c) { cache.set(key, null); return null; }
    out.push({ canvas: c, y, speed });
  }
  cache.set(key, out);
  return out;
}
