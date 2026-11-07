/**
 * 16-bit figures: the posed rig rasterised pixel by pixel at cartridge size (heroes about 64 px
 * tall), with anatomical limbs (muscle bulges, tapered joints), four-tone ramps per material lit
 * from the upper front, dark contact lines where parts overlap, a coloured outline and a
 * hand-drawn head per character. Every pose is cached, so it costs nothing after the first frame.
 */
import type { Pose, RigDef, WeaponShape } from './rig';

export type Mat = 'skin' | 'hair' | 'top' | 'top2' | 'legs' | 'boots' | 'metal' | 'gold' | 'wood' | 'belt' | 'bone' | 'glove' | 'helm';

export type Build = 'hero' | 'slim' | 'lean' | 'heavy' | 'fat' | 'dwarf' | 'small' | 'bony';

export interface Look {
  /** standing height in px, feet to the top of the head (default 64 x rig.scale) */
  height?: number;
  build?: Build;
  top?: 'bare' | 'shirt' | 'tank' | 'vest' | 'jacket' | 'bikini' | 'armor' | 'ribs' | 'robe' | 'tunic';
  lower?: 'trunks' | 'shorts' | 'pants' | 'skirt' | 'loin' | 'bikini' | 'robe';
  /** 0 none, 1 the whole upper arm, 2 down to the wrist */
  sleeves?: number;
  /** fraction of the shin covered by boots (0 barefoot, 0.15 shoes, 1 up to the knee) */
  boots?: number;
  belt?: boolean;
  bracers?: boolean;
  gloves?: boolean;
  pauldrons?: boolean;
  /** knee pads / greaves in metal */
  greaves?: boolean;
  /** hand-drawn head, facing right; letters: a-d skin, h-k hair, m-p helm metal, q-t top, u-w gold, x dark, y white, z red, e eye */
  head?: string[];
  /** pixel of the art that sits on the neck (default: bottom row, 45% across) */
  neck?: [number, number];
  /** blade length of swords, haft of axes (px at height 64) */
  reach?: number;
  colors?: Partial<Record<Mat, string | [string, string]>>;
}

type RGB = [number, number, number];

function hex(c: string): RGB {
  if (c.startsWith('rgb')) { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c)!; return [+m[1], +m[2], +m[3]]; }
  const v = c.length === 4 ? c.slice(1).split('').map((d) => d + d).join('') : c.slice(1);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** Four tones from a light and a mid colour: warm highlight, light, mid, cool deep shadow. */
function ramp(light: string, mid?: string): RGB[] {
  const l = hex(light);
  const m = mid ? hex(mid) : mix(mul(l, 0.68), [40, 30, 90], 0.12);
  return [mix(l, [255, 250, 230], 0.38), l, m, mix(mul(m, 0.62), [30, 16, 60], 0.25)];
}

interface Dims {
  thigh: number; shin: number; ankle: number; torso: number; neck: number; upper: number; fore: number;
  rThigh: number; rShin: number; rUpper: number; rFore: number; fist: number; foot: number;
  /** torso profile: [t, back half-width, front half-width] */
  prof: [number, number, number][];
}

const BUILDS: Record<Build, Dims> = {
  hero: { thigh: 14, shin: 14, ankle: 3, torso: 18, neck: 3, upper: 12, fore: 11, rThigh: 4.4, rShin: 3.3, rUpper: 3.4, rFore: 2.9, fist: 2.7, foot: 7,
    prof: [[-0.07, 4, 4], [0, 6, 6.5], [0.3, 5.6, 6.2], [0.6, 7, 8.2], [0.8, 8.2, 8.8], [0.93, 7.6, 7.6], [1.02, 4, 4]] },
  slim: { thigh: 15, shin: 15, ankle: 3, torso: 16, neck: 3, upper: 11, fore: 10, rThigh: 3.9, rShin: 2.6, rUpper: 2.4, rFore: 2.1, fist: 2.1, foot: 6,
    prof: [[-0.07, 4.2, 4.4], [0, 5.8, 6], [0.16, 6.2, 6.6], [0.44, 4.4, 4.7], [0.64, 5, 7], [0.8, 5.4, 6], [0.94, 5.4, 5.4], [1.02, 3, 3]] },
  lean: { thigh: 14, shin: 14, ankle: 3, torso: 18, neck: 3, upper: 12, fore: 11, rThigh: 3.8, rShin: 2.9, rUpper: 2.8, rFore: 2.5, fist: 2.4, foot: 7,
    prof: [[-0.07, 4, 4], [0, 5.6, 5.8], [0.35, 5.2, 5.6], [0.65, 6.4, 7.2], [0.85, 7, 7.4], [0.95, 6.6, 6.6], [1.02, 3.6, 3.6]] },
  heavy: { thigh: 14, shin: 13, ankle: 3, torso: 19, neck: 2, upper: 12, fore: 11, rThigh: 5.4, rShin: 4, rUpper: 4.4, rFore: 3.7, fist: 3.4, foot: 8,
    prof: [[-0.07, 5, 5], [0, 7.6, 8], [0.3, 7.8, 8.6], [0.6, 9, 10], [0.8, 10, 10.4], [0.93, 9.4, 9.4], [1.02, 5, 5]] },
  fat: { thigh: 12, shin: 12, ankle: 3, torso: 20, neck: 1, upper: 12, fore: 11, rThigh: 5.6, rShin: 4.2, rUpper: 4.4, rFore: 3.8, fist: 3.4, foot: 8,
    prof: [[-0.07, 6, 6], [0, 8.4, 9], [0.3, 9.6, 12.6], [0.55, 10, 12.4], [0.8, 10, 10], [0.94, 9, 9], [1.03, 5, 5]] },
  dwarf: { thigh: 9, shin: 8, ankle: 3, torso: 17, neck: 1, upper: 10, fore: 9, rThigh: 4.6, rShin: 3.8, rUpper: 3.8, rFore: 3.3, fist: 3, foot: 7,
    prof: [[-0.07, 5, 5], [0, 7, 7.4], [0.3, 7.4, 8.4], [0.6, 8.2, 9.2], [0.82, 8.6, 9], [0.94, 8, 8], [1.02, 4.6, 4.6]] },
  small: { thigh: 8, shin: 7, ankle: 2, torso: 12, neck: 1, upper: 7, fore: 7, rThigh: 3, rShin: 2.4, rUpper: 2.2, rFore: 2, fist: 2.1, foot: 5,
    prof: [[-0.07, 4, 4], [0, 5.4, 5.6], [0.4, 6, 6.4], [0.75, 5.6, 6], [0.95, 4.6, 4.6], [1.03, 3, 3]] },
  bony: { thigh: 14, shin: 14, ankle: 3, torso: 18, neck: 3, upper: 12, fore: 11, rThigh: 1.7, rShin: 1.5, rUpper: 1.5, rFore: 1.4, fist: 2, foot: 6,
    prof: [[-0.07, 3, 3], [0, 5, 5], [0.12, 4.4, 4.4], [0.26, 2, 2], [0.42, 2, 2], [0.5, 5.4, 6], [0.8, 7, 7.4], [0.94, 6.4, 6.4], [1.02, 2.4, 2.4]] },
};

const EMPTY = -1;
const LIGHT = (() => { const v = [0.32, -0.74, 0.6]; const l = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / l) as [number, number, number]; })();
const OUTLINE: RGB = [20, 12, 26];

/** Tone index from a unit normal (0 highlight .. 3 deep shadow). */
function toneOf(nx: number, ny: number, nz: number): number {
  const i = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  return i > 0.9 ? 0 : i > 0.6 ? 1 : i > 0.22 ? 2 : 3;
}

interface Px { mat: Mat; tone: number }

/** The pixel buffer a figure is painted into. */
class Buf {
  col: Int32Array; // packed rgb, -1 empty
  grp: Int16Array;
  mark: Uint8Array;
  tmpTone: Int8Array;
  tmpMat: (Mat | null)[];
  touched: number[] = [];
  constructor(public w: number, public h: number, private ramps: Record<Mat, RGB[]>) {
    this.col = new Int32Array(w * h).fill(EMPTY);
    this.grp = new Int16Array(w * h).fill(EMPTY);
    this.mark = new Uint8Array(w * h);
    this.tmpTone = new Int8Array(w * h);
    this.tmpMat = new Array(w * h).fill(null);
  }
  /** Paints one part: sample(x, y) gives a material + tone (or null) per pixel centre. */
  part(x0: number, y0: number, x1: number, y1: number, group: number, shift: number, sample: (x: number, y: number) => Px | null): void {
    const X0 = Math.max(0, Math.floor(x0)), Y0 = Math.max(0, Math.floor(y0));
    const X1 = Math.min(this.w - 1, Math.ceil(x1)), Y1 = Math.min(this.h - 1, Math.ceil(y1));
    const list = this.touched; list.length = 0;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const p = sample(x + 0.5, y + 0.5);
      if (!p) continue;
      const i = y * this.w + x;
      this.mark[i] = 1; this.tmpTone[i] = Math.max(0, Math.min(3, p.tone + shift)); this.tmpMat[i] = p.mat;
      list.push(i);
    }
    const w = this.w;
    for (const i of list) {
      let tone = this.tmpTone[i];
      // contact line: an edge pixel lying over another part becomes this part's deepest tone
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= this.mark.length || this.mark[j]) continue;
        if (this.grp[j] !== EMPTY && this.grp[j] !== group) { tone = 3; break; }
      }
      const c = this.ramps[this.tmpMat[i]!][tone];
      this.col[i] = (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
      this.grp[i] = group;
    }
    for (const i of list) this.mark[i] = 0;
  }
  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d')!;
    if (!g || typeof g.createImageData !== 'function') return c; // headless tests
    const img = g.createImageData(this.w, this.h);
    if (!img?.data) return c; // headless tests
    const d = img.data;
    const w = this.w;
    for (let i = 0; i < this.col.length; i++) {
      let v = this.col[i];
      let rgb: RGB | null = null;
      if (v === EMPTY) {
        const x = i % w;
        const solid = (j: number) => j >= 0 && j < this.col.length && this.col[j] !== EMPTY;
        if ((x > 0 && solid(i - 1)) || (x < w - 1 && solid(i + 1)) || solid(i - w) || solid(i + w)) rgb = OUTLINE;
        else continue;
      } else rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
      v = i * 4;
      d[v] = rgb[0]; d[v + 1] = rgb[1]; d[v + 2] = rgb[2]; d[v + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

type V = { x: number; y: number };
const add = (a: V, b: V, k = 1): V => ({ x: a.x + b.x * k, y: a.y + b.y * k });
/** unit vector of a limb angle (0 = hanging down, positive swings forward) */
const dirOf = (a: number): V => ({ x: Math.sin(a), y: Math.cos(a) });

/** A limb segment with a radius profile; matOf(t, u) picks the material along it. */
function capsule(buf: Buf, a: V, b: V, r0: number, r1: number, group: number, shift: number, matOf: (t: number, u: number) => Mat | null, bulge = 0, bulgeAt = 0.35, detail?: (t: number, u: number) => number): void {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(len2);
  const ux = dx / len, uy = dy / len;
  const R = Math.max(r0, r1) * (1 + bulge) + 1;
  const rad = (t: number) => {
    const tc = Math.max(0, Math.min(1, t));
    const bump = bulge * Math.max(0, 1 - Math.abs(tc - bulgeAt) / 0.45);
    return (r0 + (r1 - r0) * tc) * (1 + bump);
  };
  buf.part(Math.min(a.x, b.x) - R, Math.min(a.y, b.y) - R, Math.max(a.x, b.x) + R, Math.max(a.y, b.y) + R, group, shift, (x, y) => {
    const px = x - a.x, py = y - a.y;
    const t = (px * dx + py * dy) / len2;
    const tc = Math.max(0, Math.min(1, t));
    const cx = a.x + dx * tc, cy = a.y + dy * tc;
    const ox = x - cx, oy = y - cy;
    const r = rad(t);
    const d2 = ox * ox + oy * oy;
    if (d2 > r * r) return null;
    const nx = ox / r, ny = oy / r;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    // u: signed across the limb (+ = the right-hand side of the direction of travel)
    const u = (ox * -uy + oy * ux) / r;
    const mat = matOf(tc, u);
    if (!mat) return null;
    return { mat, tone: Math.max(0, Math.min(3, toneOf(nx, ny, nz) + (detail ? detail(tc, u) : 0))) };
  });
}

/** Flat polygon (weapon heads, skirts) in one material; tone(x, y) picks the shade. */
function poly(buf: Buf, pts: V[], group: number, mat: Mat, tone: (x: number, y: number) => number): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  buf.part(x0 - 1, y0 - 1, x1 + 1, y1 + 1, group, 0, (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside ? { mat, tone: tone(x, y) } : null;
  });
}

/** A ball (fists, pommels, shoulder pads). */
function disc(buf: Buf, c: V, r: number, group: number, shift: number, mat: Mat): void {
  capsule(buf, c, { x: c.x + 0.001, y: c.y }, r, r, group, shift, () => mat);
}

const HEAD_LETTERS: Record<string, [Mat | 'x' | 'y' | 'z' | 'e', number]> = {
  a: ['skin', 0], b: ['skin', 1], c: ['skin', 2], d: ['skin', 3],
  h: ['hair', 0], i: ['hair', 1], j: ['hair', 2], k: ['hair', 3],
  m: ['helm', 0], n: ['helm', 1], o: ['helm', 2], p: ['helm', 3],
  q: ['top', 0], r: ['top', 1], s: ['top', 2], t: ['top', 3],
  u: ['gold', 0], v: ['gold', 1], w: ['gold', 2],
  f: ['top2', 1], g: ['top2', 2],
  x: ['x', 0], y: ['y', 0], z: ['z', 0], e: ['e', 0],
};

function rampsFor(rig: RigDef, look: Look): Record<Mat, RGB[]> {
  const p = rig.palette;
  const c = look.colors ?? {};
  const pick = (m: Mat, light: string, mid?: string): RGB[] => {
    const o = c[m];
    if (Array.isArray(o)) return ramp(o[0], o[1]);
    if (typeof o === 'string') return ramp(o);
    return ramp(light, mid);
  };
  const r = {
    skin: pick('skin', p.skin, p.skinDark),
    hair: pick('hair', p.hair),
    top: pick('top', p.top, p.topDark),
    top2: pick('top2', '#f0f0e8'),
    legs: pick('legs', p.legs, p.legsDark),
    boots: pick('boots', p.boots),
    metal: pick('metal', p.weapon, p.weaponDark),
    gold: pick('gold', '#f8d048', '#b88a20'),
    wood: pick('wood', '#9a6430', '#64401c'),
    belt: pick('belt', '#7a4c24', '#4e2e14'),
    bone: pick('bone', '#ece6cc', '#b0a888'),
    glove: pick('glove', p.boots),
    helm: pick('helm', '#d8dce4', '#8a94a4'),
  } as Record<Mat, RGB[]>;
  return r;
}

interface Built { canvas: HTMLCanvasElement; ox: number; oy: number }

const cache = new Map<string, Built>();
const rigIds = new WeakMap<object, number>();
let nextRig = 1;

/** Renders (or fetches) the figure for a pose. */
export function hdFrame(rig: RigDef, pose: Pose): Built {
  const look = rig.look!;
  let id = rigIds.get(look);
  if (!id) { id = nextRig++; rigIds.set(look, id); }
  const q = (v: number) => Math.round(v * 10);
  const key = `${id}|${rig.weapon}|${rig.palette.top}|${q(pose.lShoulder)},${q(pose.lElbow)},${q(pose.rShoulder)},${q(pose.rElbow)},${q(pose.lHip)},${q(pose.lKnee)},${q(pose.rHip)},${q(pose.rKnee)},${q(pose.lean)},${Math.round(pose.crouch * 20)},${q(pose.headTilt)},${q(pose.weapon)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const qp: Pose = { ...pose };
  for (const k of Object.keys(qp) as (keyof Pose)[]) qp[k] = k === 'crouch' ? Math.round(pose.crouch * 20) / 20 : Math.round(pose[k] * 10) / 10;
  const built = paint(rig, look, qp);
  if (cache.size > 4000) cache.delete(cache.keys().next().value!);
  cache.set(key, built);
  return built;
}

function paint(rig: RigDef, look: Look, pose: Pose): Built {
  if (rig.beast) return paintBeast(rig, look, pose);
  const H = look.height ?? Math.round(64 * rig.scale);
  const D = BUILDS[look.build ?? 'hero'];
  const std = D.thigh + D.shin + D.ankle + D.torso + D.neck + 12;
  const s = H / std;
  const W = Math.ceil(H * 2.6) + 8, BH = Math.ceil(H * 1.9) + 10;
  const ox = Math.floor(W / 2), oy = BH - 8;
  const ramps = rampsFor(rig, look);
  const buf = new Buf(W, BH, ramps);
  const lower = look.lower ?? 'pants';
  const top = look.top ?? 'shirt';
  const bootH = look.boots ?? 0.35;

  // ---- skeleton (figure space, facing +x, y down) ----
  const crouch = pose.crouch * 11 * s;
  const hip: V = { x: ox, y: oy - (D.thigh + D.shin + D.ankle) * s + crouch };
  const lean = pose.lean;
  const axis: V = { x: Math.sin(lean), y: -Math.cos(lean) };
  const front: V = { x: Math.cos(lean), y: Math.sin(lean) };
  const T = D.torso * s;
  const neckBase = add(hip, axis, T);
  const shoulderAt = add(hip, axis, T * 0.86);

  const legJoints = (hipA: number, knee: number, side: number) => {
    const h0 = add(hip, front, side * 1.6 * s);
    const k = add(h0, dirOf(hipA), D.thigh * s);
    const an = add(k, dirOf(hipA - knee), D.shin * s);
    return { h0, k, an, shinA: hipA - knee };
  };

  const legMatThigh = (t: number): Mat => {
    if (lower === 'pants' || lower === 'robe') return 'legs';
    if (lower === 'shorts') return t < 0.62 ? 'legs' : 'skin';
    if (lower === 'trunks') return t < 0.22 ? 'legs' : 'skin';
    if (lower === 'bikini') return t < 0.1 ? 'top' : 'skin';
    return 'skin';
  };
  const legMatShin = (t: number): Mat => {
    if (t > 1 - bootH) return 'boots';
    if (look.greaves && t < 0.35) return 'metal';
    return lower === 'pants' || lower === 'robe' ? 'legs' : 'skin';
  };

  const drawLeg = (hipA: number, knee: number, back: boolean) => {
    const { h0, k, an, shinA } = legJoints(hipA, knee, back ? -1 : 1);
    const g = back ? 1 : 2, sh = back ? 1 : 0;
    capsule(buf, an, k, D.rShin * s * 0.62, D.rShin * s, g, sh, (t) => legMatShin(1 - t), 0.16, 0.7);
    capsule(buf, k, h0, D.rThigh * s * 0.74, D.rThigh * s, g, sh, (t) => legMatThigh(1 - t), 0.1, 0.55);
    if (look.greaves) disc(buf, k, D.rShin * s * 1.05, g, sh, 'metal');
    // foot: points forward, flat on the ground when the shin is upright
    const fd = dirOf(shinA - Math.PI / 2 + (shinA > 0.6 ? 0.3 : 0));
    const fwd: V = { x: -fd.x, y: -fd.y }; // perpendicular to the shin, towards the front
    const heel = add(an, fwd, -1.5 * s);
    const toe = add(an, fwd, D.foot * s);
    const footMat: Mat = bootH > 0 ? 'boots' : 'skin';
    capsule(buf, heel, add(toe, dirOf(shinA), 0.8 * s), D.rShin * s * 0.7, D.rShin * s * 0.55, g, sh, () => footMat);
  };

  const sleeveMat = (t: number, fore: boolean): Mat => {
    const sl = look.sleeves ?? (top === 'shirt' || top === 'jacket' || top === 'robe' || top === 'tunic' ? 1 : 0);
    if (!fore) return t < sl ? (top === 'armor' ? 'metal' : 'top') : 'skin';
    if (sl > 1 && t < sl - 1) return 'top';
    if (look.gloves && t > 0.72) return 'glove';
    if (look.bracers && t > 0.42 && t < 0.88) return 'belt';
    return 'skin';
  };

  const weaponOf = (): WeaponShape => rig.weapon;
  const drawArm = (shA: number, el: number, back: boolean, withWeapon: boolean) => {
    const sp = add(shoulderAt, front, (back ? -1.5 : 1.2) * s);
    const e = add(sp, dirOf(shA), D.upper * s);
    const hd = add(e, dirOf(shA + el), D.fore * s);
    const g = back ? 3 : 6, sh = back ? 1 : 0;
    capsule(buf, e, sp, D.rFore * s * 0.92, D.rUpper * s * 1.08, g, sh, (t) => sleeveMat(1 - t, false), 0.12, 0.45);
    if (look.pauldrons) capsule(buf, add(sp, axis, -0.6 * s), add(sp, dirOf(shA), 3 * s), D.rUpper * s * 1.12, D.rUpper * s * 1.02, g + 1, sh, () => (top === 'armor' ? 'metal' : 'top'));
    capsule(buf, hd, e, D.rFore * s * 0.7, D.rFore * s, g, sh, (t) => sleeveMat(1 - t, true), 0.12, 0.7);
    const wp = weaponOf();
    if (withWeapon && wp !== 'none') drawWeapon(buf, wp, hd, shA + el + pose.weapon, look.reach ?? 20, s, g + 1);
    disc(buf, hd, D.fist * s, g + 1, sh, look.gloves ? 'glove' : 'skin');
  };

  const torsoMat = (t: number, u: number): Mat | null => {
    if (t < 0.17) {
      if (lower === 'bikini') return 'top';
      if (lower === 'loin' || lower === 'skirt') return 'legs';
      return 'legs';
    }
    if (look.belt && t < 0.25) return Math.abs(u - 0.3) < 0.16 ? 'gold' : 'belt';
    switch (top) {
      case 'bare': return 'skin';
      case 'shirt': case 'robe': case 'tunic': return t > 0.97 && u > -0.2 ? 'skin' : 'top';
      case 'tank': return t > 0.82 && Math.abs(u) > 0.62 ? 'skin' : 'top';
      case 'vest': return u > 0.0 && u < 0.62 && t > 0.3 ? 'skin' : 'top';
      case 'jacket': return u > 0.08 && u < 0.5 && t > 0.3 ? 'top2' : 'top';
      case 'bikini': return t > 0.58 && t < 0.8 ? 'top' : 'skin';
      case 'armor': return t > 0.32 ? 'metal' : 'top';
      case 'ribs': return 'bone';
    }
    return 'top';
  };

  const prof = D.prof;
  const half = (t: number, frontSide: boolean): number => {
    if (t <= prof[0][0] || t >= prof[prof.length - 1][0]) return 0;
    for (let i = 1; i < prof.length; i++) {
      if (t <= prof[i][0]) {
        const a = prof[i - 1], b = prof[i];
        const k = (t - a[0]) / (b[0] - a[0]);
        const va = frontSide ? a[2] : a[1], vb = frontSide ? b[2] : b[1];
        return (va + (vb - va) * k) * s;
      }
    }
    return 0;
  };
  const tMin = prof[0][0], tMax = prof[prof.length - 1][0];
  const drawTorso = () => {
    const R = 12 * s + 2;
    const c = add(hip, axis, T / 2);
    buf.part(c.x - T / 2 - R, c.y - T / 2 - R, c.x + T / 2 + R, c.y + T / 2 + R, 4, 0, (x, y) => {
      const px = x - hip.x, py = y - hip.y;
      const t = (px * axis.x + py * axis.y) / T;
      if (t < tMin || t > tMax) return null;
      const across = px * front.x + py * front.y;
      const hw = half(t, across > 0);
      if (hw <= 0 || Math.abs(across) > hw) return null;
      const u = across / hw;
      if (top === 'ribs' && t > 0.26 && t < 0.5 && Math.abs(u) > 0.5) return null;
      const un = Math.sign(u) * Math.pow(Math.abs(u), 1.4);
      const an = t > 0.84 ? (t - 0.84) / (tMax - 0.84) * 0.75 : t < 0.08 ? -(0.08 - t) / (0.08 - tMin) * 0.6 : 0;
      const nz = Math.sqrt(Math.max(0, 1 - un * un - an * an));
      const nx = front.x * un + axis.x * an, ny = front.y * un + axis.y * an;
      let tone = toneOf(nx, ny, nz);
      const mat = torsoMat(t, u);
      if (!mat) return null;
      const pxT = t * T, pxU = across; // pixel distances for thin detail lines
      if (mat === 'skin' && top === 'bare' && look.build !== 'slim' && look.build !== 'fat') {
        const pec = (0.64 + 0.045 * (u - 0.25) * (u - 0.25)) * T;
        if (Math.abs(pxT - pec) < 0.55 && u > -0.55 && u < 0.95) tone = Math.min(3, tone + 1);
        if (Math.abs(pxU - 0.25 * hw) < 0.5 && t > 0.3 && t < 0.86) tone = Math.min(3, tone + 1);
        for (const ab of [0.4, 0.5]) if (Math.abs(pxT - ab * T) < 0.5 && u > 0.02 && u < 0.62) tone = Math.min(3, tone + 1);
      }
      if (mat === 'skin' && top === 'bare' && look.build === 'fat' && Math.abs(pxT - 0.62 * T) < 0.55 && u > 0) tone = Math.min(3, tone + 1);
      if (top === 'ribs' && mat === 'bone' && t > 0.5 && t < 0.9 && Math.round(pxT / 2) % 2 === 0 && Math.abs(u) > 0.15) tone = 3;
      if ((top === 'jacket' || top === 'vest') && mat === 'top' && Math.abs(u - (top === 'vest' ? 0.62 : 0.5)) * hw < 0.6) tone = 3; // lapel edge
      if (mat === 'metal' && Math.abs(pxU - 0.28 * hw) < 0.5) tone = 0; // armour ridge
      if (look.belt && t >= 0.17 && t < 0.25 && mat === 'belt' && Math.abs(pxT - 0.21 * T) < 0.5) tone = Math.max(0, tone - 1);
      return { mat, tone };
    });
  };

  const drawSkirt = () => {
    if (lower !== 'skirt' && lower !== 'loin' && lower !== 'robe') return;
    const l = legJoints(pose.lHip, pose.lKnee, -1), r = legJoints(pose.rHip, pose.rKnee, 1);
    const waistB = add(add(hip, axis, 0.2 * T), front, -half(0.17, false) - 0.5);
    const waistF = add(add(hip, axis, 0.2 * T), front, half(0.17, true) + 0.5);
    const k = lower === 'robe' ? 0.95 : lower === 'skirt' ? 0.5 : 0.62;
    const hemB = add({ x: l.h0.x + (l.k.x - l.h0.x) * k, y: l.h0.y + (l.k.y - l.h0.y) * k }, front, -D.rThigh * s * 1.5);
    const hemF = add({ x: r.h0.x + (r.k.x - r.h0.x) * k, y: r.h0.y + (r.k.y - r.h0.y) * k }, front, D.rThigh * s * 1.5);
    if (lower === 'loin') {
      const mid = add(add(hip, axis, 0.18 * T), front, half(0.17, true) * 0.35);
      const tip = add(add(r.h0, dirOf(pose.rHip * 0.5), D.thigh * s * 0.75), front, 1);
      poly(buf, [add(mid, front, -3 * s), add(mid, front, 3 * s), add(tip, front, 2.5 * s), add(tip, front, -2.5 * s)], 5, 'legs', (x) => (x < mid.x ? 2 : 1));
      return;
    }
    poly(buf, [waistB, waistF, hemF, hemB], 5, 'legs', (x, y) => {
      const fold = Math.round((x - ox) / (2.5 * s)) % 2 === 0;
      const low = y > hemB.y - 2 && y > hemF.y - 2;
      return low ? 2 : fold ? 2 : 1;
    });
  };

  // ---- head: hand-drawn art, rotated by the tilt in 22.5 degree steps ----
  const drawHead = () => {
    const art = look.head;
    if (!art || art.length === 0) return;
    const hw = art[0].length, hh = art.length;
    const [ax, ay] = look.neck ?? [Math.round(hw * 0.45), hh - 1];
    const tilt = lean + pose.headTilt * 0.6;
    const step = Math.round(tilt / (Math.PI / 8)) * (Math.PI / 8);
    const anchor = add(neckBase, axis, D.neck * s * 0.5);
    // neck
    capsule(buf, add(neckBase, axis, -2 * s), add(anchor, axis, -1), 2.4 * s, 2.2 * s, 7, 0, () => (top === 'armor' ? 'metal' : 'skin'));
    const cs = Math.cos(step), sn = Math.sin(step);
    const scale = Math.max(1, s);
    const reach = Math.ceil(Math.hypot(hw, hh) * scale) + 2;
    const lookup = (m: Mat | 'x' | 'y' | 'z' | 'e', tone: number): Px | null => {
      if (m === 'x') return { mat: 'skin', tone: -1 };
      if (m === 'y') return { mat: 'skin', tone: -2 };
      if (m === 'z') return { mat: 'skin', tone: -3 };
      if (m === 'e') return { mat: 'skin', tone: -4 };
      return { mat: m, tone };
    };
    const specials: Record<number, RGB> = { [-1]: [28, 18, 30], [-2]: [248, 248, 240], [-3]: [200, 40, 40], [-4]: [40, 60, 120] };
    // head pixels are written directly (the art has its own shading)
    const X0 = Math.floor(anchor.x - reach), X1 = Math.ceil(anchor.x + reach), Y0 = Math.floor(anchor.y - reach), Y1 = Math.ceil(anchor.y + reach);
    for (let y = Math.max(0, Y0); y <= Math.min(BH - 1, Y1); y++) for (let x = Math.max(0, X0); x <= Math.min(W - 1, X1); x++) {
      const dx = (x + 0.5 - anchor.x) / scale, dy = (y + 0.5 - anchor.y) / scale;
      // inverse rotation into art space
      const sx = Math.floor(ax + 0.5 + dx * cs + dy * sn);
      const sy = Math.floor(ay + 0.5 - dx * sn + dy * cs);
      if (sx < 0 || sy < 0 || sx >= hw || sy >= hh) continue;
      const ch = art[sy][sx];
      const L = HEAD_LETTERS[ch];
      if (!L) continue;
      const p = lookup(L[0], L[1]);
      if (!p) continue;
      const c = p.tone < 0 ? specials[p.tone] : ramps[p.mat][p.tone];
      const i = y * W + x;
      buf.col[i] = (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
      buf.grp[i] = 8;
    }
  };

  drawArm(pose.lShoulder, pose.lElbow, true, false);
  drawLeg(pose.lHip, pose.lKnee, true);
  drawLeg(pose.rHip, pose.rKnee, false);
  drawTorso();
  drawSkirt();
  drawHead();
  drawArm(pose.rShoulder, pose.rElbow, false, true);
  return { canvas: buf.toCanvas(), ox, oy };
}

/** Weapons in the hand at `h`, pointing along limb angle `a`. */
function drawWeapon(buf: Buf, w: WeaponShape, h: V, a: number, reach: number, s: number, g: number): void {
  if ((w === 'hammer' || w === 'club' || w === 'axe' || w === 'bat' || w === 'pipe') && a < 1.2 && a > -0.5) a = 2.6;
  const d = dirOf(a);
  const p: V = { x: -d.y, y: d.x }; // perpendicular
  const at = (k: number, side = 0): V => ({ x: h.x + d.x * k * s + p.x * side * s, y: h.y + d.y * k * s + p.y * side * s });
  const R = reach; // blade / haft length in units of height-64 pixels
  const flat = (side: (x: number, y: number) => number) => (x: number, y: number) => side(x, y);
  const across = (x: number, y: number) => ((x - h.x) * p.x + (y - h.y) * p.y) / s;
  switch (w) {
    case 'sword': {
      capsule(buf, at(-3), at(3), 1.3 * s, 1.3 * s, g, 0, () => 'belt');
      disc(buf, at(-3.5), 1.6 * s, g, 0, 'gold');
      capsule(buf, at(3.2, -4.2), at(3.2, 4.2), 1.2 * s, 1.2 * s, g, 0, () => 'gold');
      capsule(buf, at(4), at(4 + R), 1.9 * s, 0.6 * s, g, 0, () => 'metal', 0, 0, (_t, u) => (u > 0.2 ? -1 : 0));
      break;
    }
    case 'axe': {
      capsule(buf, at(-7), at(R + 2), 1.4 * s, 1.4 * s, g, 0, () => 'wood', 0, 0, (t) => (Math.round(t * 12) % 4 === 0 ? 1 : 0));
      const k = R - 4;
      for (const sd of [1, -1]) {
        poly(buf, [at(k - 4, sd * 1), at(k - 7, sd * 8), at(k - 2, sd * 10), at(k + 3, sd * 10), at(k + 8, sd * 8), at(k + 5, sd * 1)], g, 'metal', flat((x, y) => { const c = Math.abs(across(x, y)); return c > 8.5 ? 0 : c > 5 ? 1 : 2; }));
      }
      disc(buf, at(k), 1.8 * s, g, 0, 'gold');
      break;
    }
    case 'club': capsule(buf, at(-3), at(R * 0.85), 1.4 * s, 3.4 * s, g, 0, () => 'wood', 0, 0, (t, u) => (t > 0.5 && Math.round(t * 10 + u * 2) % 3 === 0 ? 1 : 0)); break;
    case 'hammer': {
      capsule(buf, at(-4), at(R * 0.9), 1.4 * s, 1.4 * s, g, 0, () => 'wood');
      const k = R * 0.8;
      poly(buf, [at(k - 4, -8), at(k + 4, -8), at(k + 4, 8), at(k - 4, 8)], g, 'metal', flat((x, y) => { const c = across(x, y); return c < -5 ? 1 : c > 5 ? 3 : 2; }));
      poly(buf, [at(k - 4, -8), at(k - 2, -8), at(k - 2, 8), at(k - 4, 8)], g, 'metal', () => 0);
      break;
    }
    case 'knife':
      capsule(buf, at(-2), at(2), 1.2 * s, 1.2 * s, g, 0, () => 'belt');
      capsule(buf, at(2.5), at(10), 1.4 * s, 0.3 * s, g, 0, () => 'metal');
      break;
    case 'pipe':
      capsule(buf, at(-4), at(R * 0.9), 1.5 * s, 1.5 * s, g, 0, () => 'metal');
      capsule(buf, at(R * 0.9 - 1.5), at(R * 0.9 + 0.5), 2.1 * s, 2.1 * s, g, 0, () => 'metal');
      break;
    case 'bat': capsule(buf, at(-4), at(R), 1.1 * s, 2.6 * s, g, 0, () => 'wood'); break;
    case 'whip': {
      let prev = at(0);
      for (let i = 1; i <= 9; i++) {
        const q = at(i * 3.6, Math.sin(i * 1.1) * 2.2);
        capsule(buf, prev, q, 0.9 * s, 0.8 * s, g, 0, () => (i < 3 ? 'belt' : 'wood'));
        prev = q;
      }
      break;
    }
    case 'claws': for (const sd of [-2, 0, 2]) capsule(buf, at(1, sd), at(11, sd * 1.4), 0.8 * s, 0.4 * s, g, 0, () => 'metal'); break;
    case 'boomerang':
      capsule(buf, h, at(7, -2), 1.4 * s, 1.2 * s, g, 0, () => 'metal');
      capsule(buf, h, at(1, 7), 1.4 * s, 1.2 * s, g, 0, () => 'metal');
      break;
    case 'bottle':
      capsule(buf, at(0), at(5), 2.4 * s, 2.4 * s, g, 0, () => 'top2');
      capsule(buf, at(5), at(9), 1.1 * s, 1.1 * s, g, 0, () => 'top2');
      break;
    case 'staff':
      capsule(buf, at(-12), at(22), 1.3 * s, 1.3 * s, g, 0, () => 'wood');
      disc(buf, at(23), 2.4 * s, g, 0, 'metal');
      break;
    case 'shaker':
      capsule(buf, at(0), at(6), 2.4 * s, 2.4 * s, g, 0, () => 'top2');
      capsule(buf, at(6), at(8), 2.2 * s, 2.2 * s, g, 0, () => 'metal');
      break;
    case 'gun':
      capsule(buf, at(-7), at(15), 1.6 * s, 1.6 * s, g, 0, () => 'metal');
      capsule(buf, at(2), at(2, 5), 1.4 * s, 1.4 * s, g, 0, () => 'metal');
      capsule(buf, at(8), at(8, 4), 1.2 * s, 1.2 * s, g, 0, () => 'metal');
      break;
    case 'none': break;
  }
}

/**
 * Golden Axe mounts, two-legged like the cartridge's: the chicken-leg Bizarrian (beak, crest,
 * whip tail) and the dragons (snout, jaw, back spines, heavy tail). Legs swing with the walk pose,
 * the tail with pose.weapon and the head with pose.headTilt.
 */
function paintBeast(rig: RigDef, look: Look, pose: Pose): Built {
  const H = look.height ?? 60;
  const s = H / 60;
  const dragon = rig.beast === 'dragon';
  const W = Math.ceil(H * 2.8) + 8, BH = Math.ceil(H * 1.6) + 10;
  const ox = Math.floor(W / 2), oy = BH - 8;
  const ramps = rampsFor(rig, look);
  const buf = new Buf(W, BH, ramps);
  const P = (x: number, y: number): V => ({ x: ox + x * s, y: oy + y * s });
  const bob = Math.sin(pose.lHip * 3) * 1.2;
  const body = (dx: number, dy: number) => P(dx, dy + bob);

  // legs: thigh forward, shin back (bird knee), three toes
  const leg = (swing: number, back: boolean) => {
    const g = back ? 1 : 3, sh = back ? 1 : 0;
    const hip = body(back ? -4 : 2, -30);
    const knee = add(hip, dirOf(0.75 + swing * 0.8), 12 * s);
    const ankle = add(knee, dirOf(-0.55 + swing * 0.6), 14 * s);
    const ground = Math.min(ankle.y, oy - 2 * s);
    const foot = { x: ankle.x, y: ground };
    capsule(buf, knee, hip, 3.2 * s, (dragon ? 6.4 : 5.6) * s, g, sh, () => (dragon ? 'top' : 'legs'), 0.15, 0.6);
    capsule(buf, foot, knee, 1.8 * s, 2.8 * s, g, sh, () => 'legs');
    for (const t of [-0.5, 0.2, 0.9]) capsule(buf, foot, add(foot, { x: Math.cos(t * 0.6), y: Math.sin(t * 0.6) * 0.3 + 0.2 }, 6 * s), 1.4 * s, 0.6 * s, g, sh, () => 'gold');
    capsule(buf, foot, add(foot, { x: -1, y: 0 }, 3 * s), 1.2 * s, 0.6 * s, g, sh, () => 'gold');
  };
  leg(pose.lHip, true);

  // tail: tapering chain swinging with pose.weapon
  const wag = Math.sin(pose.weapon * 1.7) * 0.5;
  let prev = body(-12, -38);
  let ang = -1.9 + wag;
  const segs = dragon ? 9 : 10;
  for (let i = 0; i < segs; i++) {
    const r0 = (dragon ? 7 : 5) * (1 - i / segs) + 1.2, r1 = (dragon ? 7 : 5) * (1 - (i + 1) / segs) + 1;
    const next = add(prev, dirOf(ang), (dragon ? 4.6 : 4.4) * s);
    capsule(buf, next, prev, r1 * s, r0 * s, 2, 0, () => 'top');
    if (dragon && i % 2 === 0) poly(buf, [add(prev, { x: 0, y: -1 }, r0 * s), add(next, { x: 0, y: -1 }, r1 * s), add({ x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 }, { x: 0, y: -1 }, (r0 + 4) * s)], 2, 'top2', () => 2);
    prev = next;
    ang += dragon ? -0.08 : -0.16 + wag * 0.15;
  }
  if (!dragon) { // the tail ends in a feathered club
    disc(buf, prev, 4 * s, 2, 0, 'top2');
  }

  // body: a big egg, belly lighter
  capsule(buf, body(-12, -37), body(9, -39), (dragon ? 12 : 11) * s, (dragon ? 11 : 10) * s, 4, 0, (_t, u) => (u > 0.45 ? 'top2' : 'top'), 0.08, 0.5);
  if (dragon) for (let i = 0; i < 5; i++) { // back spines
    const b = body(-12 + i * 5, -49 + Math.abs(i - 2) * 0.6);
    poly(buf, [add(b, { x: -1, y: 0 }, 2.5 * s), add(b, { x: 1, y: 0 }, 2.5 * s), add(b, { x: -0.4, y: -1 }, 5 * s)], 5, 'top2', () => 1);
  }
  // saddle and reins
  poly(buf, [body(-7, -48), body(5, -49), body(6, -44), body(-8, -43)], 5, 'belt', (_x, y) => (y < oy + (-47 + bob) * s ? 1 : 2));

  // neck and head
  const tilt = pose.headTilt;
  const neckA = body(8, -42);
  const headC = add(body(18, -60), { x: Math.sin(tilt), y: Math.cos(tilt) * 0.3 }, 5 * s);
  capsule(buf, headC, neckA, (dragon ? 4.8 : 3.6) * s, (dragon ? 7 : 6) * s, 6, 0, (_t, u) => (u < -0.4 ? 'top2' : 'top'));
  if (dragon) {
    capsule(buf, add(headC, { x: -1, y: 0 }, 2 * s), add(headC, { x: 1, y: 0.15 }, 11 * s), 5.2 * s, 3.4 * s, 7, 0, () => 'top'); // snout
    const open = Math.max(0, tilt) * 6;
    capsule(buf, add(headC, { x: 0, y: 1 }, 3 * s), add(headC, { x: 1, y: 0.45 + open * 0.08 }, 10 * s), 2.4 * s, 1.6 * s, 7, 1, () => 'top2'); // jaw
    poly(buf, [add(headC, { x: -0.8, y: -1 }, 4 * s), add(headC, { x: -1, y: -0.2 }, 9 * s), add(headC, { x: -0.3, y: -1 }, 7 * s)], 7, 'gold', () => 1); // horn
    for (const t of [3, 6, 9]) disc(buf, add(add(headC, { x: 1, y: 0.15 }, t * s), { x: 0, y: 1 }, 2.6 * s), 0.6 * s, 7, 0, 'bone' as Mat);
  } else {
    disc(buf, headC, 5 * s, 7, 0, 'top');
    poly(buf, [add(headC, { x: 0.5, y: -0.6 }, 3 * s), add(headC, { x: 1, y: 0.1 }, 12 * s), add(headC, { x: 0.4, y: 0.6 }, 3.5 * s)], 7, 'gold', (_x, y) => (y < headC.y ? 0 : 2)); // beak
    for (let i = 0; i < 3; i++) poly(buf, [add(headC, { x: -0.3 - i * 0.3, y: -1 }, 3.5 * s), add(headC, { x: -0.6 - i * 0.35, y: -1 }, 9 * s), add(headC, { x: -0.9 - i * 0.3, y: -0.6 }, 5 * s)], 7, 'legs', () => 1); // crest
  }
  // eye
  const eye = add(headC, { x: 0.35, y: -0.55 }, 3 * s);
  disc(buf, eye, 1.3 * s, 8, 0, 'bone' as Mat);
  const ei = Math.round(eye.y) * W + Math.round(eye.x + 0.5);
  if (ei >= 0 && ei < buf.col.length) buf.col[ei] = 0x180c10;

  leg(pose.rHip, false);
  if (dragon) { // little arms
    const sh = body(10, -36);
    capsule(buf, add(sh, dirOf(0.9), 8 * s), sh, 1.6 * s, 2.6 * s, 9, 0, () => 'top');
  }
  return { canvas: buf.toCanvas(), ox, oy };
}

const tinted = new Map<string, HTMLCanvasElement>();

/** Draws a look-based figure with its feet at (fx, fy). */
export function drawHd(ctx: CanvasRenderingContext2D, rig: RigDef, pose: Pose, fx: number, fy: number, flip: boolean, tint?: string): void {
  const f = hdFrame(rig, pose);
  let img = f.canvas;
  if (tint) {
    const k = `${tint}`;
    let t = tinted.get(k + (img as unknown as { _id?: string })._id);
    if (!t) {
      t = document.createElement('canvas');
      t.width = img.width; t.height = img.height;
      const g = t.getContext('2d')!;
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.55;
      g.fillStyle = tint;
      g.fillRect(0, 0, t.width, t.height);
      if (tinted.size > 400) tinted.clear();
      const id = ((img as unknown as { _id?: string })._id ??= Math.random().toString(36).slice(2));
      tinted.set(k + id, t);
    }
    img = t;
  }
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(fx), Math.round(fy));
    ctx.scale(-1, 1);
    ctx.drawImage(img, -f.ox, -f.oy);
    ctx.restore();
  } else ctx.drawImage(img, Math.round(fx) - f.ox, Math.round(fy) - f.oy);
}
