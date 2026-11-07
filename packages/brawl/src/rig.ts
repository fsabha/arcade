/**
 * Procedural pixel characters: a humanoid rig (head, torso, arms, legs, weapon) posed by
 * joint angles, rasterised as chunky pixel segments so it matches the pixel-art games.
 */
export interface Palette {
  skin: string;
  skinDark: string;
  hair: string;
  top: string; // shirt / armour / fur
  topDark: string;
  legs: string;
  legsDark: string;
  boots: string;
  weapon: string;
  weaponDark: string;
  eyes?: string;
}

export type WeaponShape = 'none' | 'sword' | 'axe' | 'club' | 'hammer' | 'claws' | 'knife' | 'pipe' | 'bat' | 'whip' | 'boomerang' | 'bottle' | 'staff' | 'shaker' | 'gun';

export interface RigDef {
  palette: Palette;
  /** overall scale: 1 = hero (about 46 px tall), 1.6 = giant */
  scale: number;
  weapon: WeaponShape;
  /** head style */
  head: 'bare' | 'helmet' | 'hood' | 'horns' | 'long' | 'mohawk' | 'cap' | 'skull' | 'beast';
  /** female proportions */
  slim?: boolean;
  /** bare chest (barbarian) */
  bareChest?: boolean;
  /** four-legged creature instead of a humanoid */
  beast?: 'chicken' | 'dragon';
  /** extra bulk for giants */
  bulk?: number;
}

/** Joint angles in radians (0 = hanging down for limbs; positive swings forward). */
export interface Pose {
  lShoulder: number; lElbow: number; rShoulder: number; rElbow: number;
  lHip: number; lKnee: number; rHip: number; rKnee: number;
  lean: number; // torso lean forward
  crouch: number; // 0..1 lowers the body
  headTilt: number;
  /** weapon angle relative to the forearm */
  weapon: number;
}

export interface Keyframe { t: number; pose: Partial<Pose> }

export const REST: Pose = { lShoulder: 0.15, lElbow: 0.2, rShoulder: -0.15, rElbow: 0.2, lHip: 0.05, lKnee: 0, rHip: -0.05, rKnee: 0, lean: 0, crouch: 0, headTilt: 0, weapon: 2.7 };

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Interpolates a keyframe track at time t (seconds), clamped to the track. */
export function poseAt(track: Keyframe[], t: number): Pose {
  if (track.length === 0) return { ...REST };
  if (t <= track[0].t) return { ...REST, ...track[0].pose };
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    if (t <= b.t) {
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
      const pa = { ...REST, ...a.pose };
      const pb = { ...REST, ...b.pose };
      const out = { ...REST };
      for (const key of Object.keys(REST) as (keyof Pose)[]) out[key] = lerp(pa[key], pb[key], k);
      return out;
    }
  }
  return { ...REST, ...track[track.length - 1].pose };
}

/** The animation library: every state the engine can be in has a track; games may add more. */
export const POSES: Record<string, Keyframe[]> = {
  idle: [
    { t: 0, pose: {} },
    { t: 0.6, pose: { lShoulder: 0.2, rShoulder: -0.2, crouch: 0.05 } },
    { t: 1.2, pose: {} },
  ],
  walk: [
    { t: 0, pose: { lHip: 0.6, lKnee: 0.3, rHip: -0.5, rKnee: 0.1, lShoulder: -0.5, rShoulder: 0.5, lean: 0.05 } },
    { t: 0.2, pose: { lHip: 0, lKnee: 0.6, rHip: 0, rKnee: 0, lShoulder: 0, rShoulder: 0, lean: 0.05 } },
    { t: 0.4, pose: { lHip: -0.5, lKnee: 0.1, rHip: 0.6, rKnee: 0.3, lShoulder: 0.5, rShoulder: -0.5, lean: 0.05 } },
    { t: 0.6, pose: { lHip: 0, lKnee: 0, rHip: 0, rKnee: 0.6, lShoulder: 0, rShoulder: 0, lean: 0.05 } },
    { t: 0.8, pose: { lHip: 0.6, lKnee: 0.3, rHip: -0.5, rKnee: 0.1, lShoulder: -0.5, rShoulder: 0.5, lean: 0.05 } },
  ],
  run: [
    { t: 0, pose: { lHip: 1.0, lKnee: 0.8, rHip: -0.8, rKnee: 0.2, lShoulder: -0.9, rShoulder: 0.9, lean: 0.3, lElbow: 1.2, rElbow: 1.2 } },
    { t: 0.15, pose: { lHip: 0, lKnee: 1.2, rHip: 0, rKnee: 0, lShoulder: 0, rShoulder: 0, lean: 0.3, lElbow: 1.2, rElbow: 1.2 } },
    { t: 0.3, pose: { lHip: -0.8, lKnee: 0.2, rHip: 1.0, rKnee: 0.8, lShoulder: 0.9, rShoulder: -0.9, lean: 0.3, lElbow: 1.2, rElbow: 1.2 } },
    { t: 0.45, pose: { lHip: 0, lKnee: 0, rHip: 0, rKnee: 1.2, lShoulder: 0, rShoulder: 0, lean: 0.3, lElbow: 1.2, rElbow: 1.2 } },
    { t: 0.6, pose: { lHip: 1.0, lKnee: 0.8, rHip: -0.8, rKnee: 0.2, lShoulder: -0.9, rShoulder: 0.9, lean: 0.3, lElbow: 1.2, rElbow: 1.2 } },
  ],
  combo1: [ // forehand swing
    { t: 0, pose: { rShoulder: -2.6, rElbow: 0.6, weapon: 1.0, lean: -0.1 } },
    { t: 0.12, pose: { rShoulder: 0.4, rElbow: 0.1, weapon: -0.2, lean: 0.25, lHip: 0.3, rHip: -0.3 } },
    { t: 0.3, pose: { rShoulder: 0.6, rElbow: 0.1, weapon: -0.3, lean: 0.2, lHip: 0.3, rHip: -0.3 } },
  ],
  combo2: [ // backhand
    { t: 0, pose: { rShoulder: 1.2, rElbow: 0.4, weapon: -0.8, lean: 0.2 } },
    { t: 0.12, pose: { rShoulder: -1.4, rElbow: 0.2, weapon: 0.9, lean: 0.05, lHip: -0.2, rHip: 0.3 } },
    { t: 0.3, pose: { rShoulder: -1.6, rElbow: 0.2, weapon: 1.0, lean: 0 } },
  ],
  combo3: [ // overhead
    { t: 0, pose: { rShoulder: -3.0, rElbow: 0.3, lShoulder: -2.0, weapon: 0.3, lean: -0.3, crouch: 0.05 } },
    { t: 0.14, pose: { rShoulder: 0.9, rElbow: 0.2, lShoulder: 0.8, weapon: -0.6, lean: 0.45, crouch: 0.2, lHip: 0.5, rHip: -0.2, lKnee: 0.4 } },
    { t: 0.4, pose: { rShoulder: 1.0, rElbow: 0.2, lShoulder: 0.8, weapon: -0.6, lean: 0.4, crouch: 0.2, lHip: 0.5, rHip: -0.2, lKnee: 0.4 } },
  ],
  jump: [
    { t: 0, pose: { lHip: 0.8, lKnee: 1.2, rHip: 0.3, rKnee: 0.9, lShoulder: -0.6, rShoulder: -0.6, lElbow: 0.8, rElbow: 0.8 } },
  ],
  jumpAttack: [
    { t: 0, pose: { lHip: 1.4, lKnee: 0.1, rHip: -0.3, rKnee: 1.2, rShoulder: -1.0, weapon: 0.5, lean: -0.2 } },
    { t: 0.1, pose: { lHip: 1.5, lKnee: 0, rHip: -0.3, rKnee: 1.2, rShoulder: 0.8, weapon: -0.5, lean: 0.2 } },
    { t: 0.4, pose: { lHip: 1.3, lKnee: 0.1, rHip: -0.3, rKnee: 1.2, rShoulder: 0.9, weapon: -0.5, lean: 0.2 } },
  ],
  dashAttack: [
    { t: 0, pose: { lean: 0.5, rShoulder: -1.5, rElbow: 0.3, weapon: 0.8, lHip: 0.8, rHip: -0.6, lKnee: 0.5 } },
    { t: 0.15, pose: { lean: 0.6, rShoulder: 1.1, rElbow: 0.1, weapon: -0.6, lHip: 0.9, rHip: -0.7, lKnee: 0.4 } },
    { t: 0.4, pose: { lean: 0.5, rShoulder: 1.1, rElbow: 0.1, weapon: -0.6, lHip: 0.9, rHip: -0.7, lKnee: 0.4 } },
  ],
  hit: [
    { t: 0, pose: { lean: -0.35, headTilt: -0.4, lShoulder: 0.8, rShoulder: 0.8, lElbow: 1.0, rElbow: 1.0, crouch: 0.1 } },
    { t: 0.3, pose: { lean: -0.2, headTilt: -0.2, lShoulder: 0.4, rShoulder: 0.4 } },
  ],
  fly: [ // knocked back through the air
    { t: 0, pose: { lean: -1.1, headTilt: -0.5, lShoulder: 1.6, rShoulder: 1.2, lHip: 0.9, rHip: 0.4, lKnee: 0.5, rKnee: 0.7 } },
  ],
  down: [
    { t: 0, pose: { lean: -1.55, headTilt: 0, lShoulder: 0.6, rShoulder: 0.4, lHip: 0.2, rHip: 0.1, lKnee: 0.3, rKnee: 0.1, crouch: 0.85 } },
  ],
  getup: [
    { t: 0, pose: { lean: -1.55, crouch: 0.85, lShoulder: 0.6, rShoulder: 0.4 } },
    { t: 0.25, pose: { lean: 0.5, crouch: 0.5, lHip: 1.2, lKnee: 1.4, rHip: 0.4, rKnee: 0.8, lShoulder: 0.4, rShoulder: 0.4 } },
    { t: 0.5, pose: {} },
  ],
  grab: [
    { t: 0, pose: { lShoulder: -1.4, lElbow: 0.5, rShoulder: -1.2, rElbow: 0.6, lean: 0.15 } },
  ],
  grabbed: [
    { t: 0, pose: { lean: -0.2, lShoulder: 0.9, rShoulder: 0.9, lElbow: 0.8, rElbow: 0.8, headTilt: -0.2 } },
  ],
  knee: [
    { t: 0, pose: { lShoulder: -1.4, lElbow: 0.5, rShoulder: -1.2, rElbow: 0.6, lean: 0.15 } },
    { t: 0.1, pose: { lShoulder: -1.2, rShoulder: -1.0, lean: 0.3, rHip: 1.8, rKnee: 1.6, crouch: 0.1 } },
    { t: 0.3, pose: { lShoulder: -1.4, rShoulder: -1.2, lean: 0.15 } },
  ],
  throw: [
    { t: 0, pose: { lShoulder: -1.4, rShoulder: -1.2, lean: 0.15 } },
    { t: 0.15, pose: { lShoulder: -2.6, rShoulder: -2.6, lean: -0.4, crouch: 0.1 } },
    { t: 0.35, pose: { lShoulder: 0.9, rShoulder: 0.9, lean: 0.5, lHip: 0.5, rHip: -0.3 } },
    { t: 0.6, pose: { lShoulder: 0.9, rShoulder: 0.9, lean: 0.4 } },
  ],
  special: [
    { t: 0, pose: { lShoulder: -0.5, rShoulder: -0.5, crouch: 0.3, lean: 0.2 } },
    { t: 0.3, pose: { lShoulder: -2.9, rShoulder: -2.9, lElbow: 0.2, rElbow: 0.2, crouch: 0, lean: -0.2, headTilt: 0.3 } },
    { t: 1.0, pose: { lShoulder: -2.9, rShoulder: -2.9, lElbow: 0.2, rElbow: 0.2, lean: -0.1 } },
  ],
  ride: [
    { t: 0, pose: { lHip: 1.3, lKnee: 1.2, rHip: 1.3, rKnee: 1.2, lShoulder: -0.8, rShoulder: -0.8, lElbow: 0.6, rElbow: 0.6, lean: 0.1 } },
  ],
  die: [
    { t: 0, pose: { lean: -0.3, lShoulder: 0.8, rShoulder: 0.8, crouch: 0.1 } },
    { t: 0.4, pose: { lean: -1.55, crouch: 0.85, lShoulder: 0.6, rShoulder: 0.4, lHip: 0.2, rHip: 0.1 } },
  ],
  thrown: [
    { t: 0, pose: { lean: -2.2, lShoulder: 1.6, rShoulder: 1.2, lHip: 0.9, rHip: 0.4, lKnee: 0.5, rKnee: 0.7 } },
  ],
  // bare-handed brawling (Streets of Rage): jabs, a straight, kicks
  punch: [
    { t: 0, pose: { rShoulder: -0.3, rElbow: 1.3, lShoulder: 0.6, lElbow: 1.4, lean: 0 } },
    { t: 0.07, pose: { rShoulder: 1.55, rElbow: 0, lShoulder: 0.7, lElbow: 1.5, lean: 0.18, lHip: 0.25, rHip: -0.25, weapon: 0 } },
    { t: 0.3, pose: { rShoulder: 1.45, rElbow: 0.1, lShoulder: 0.7, lElbow: 1.5, lean: 0.12, lHip: 0.25, rHip: -0.25, weapon: 0 } },
  ],
  punch2: [
    { t: 0, pose: { lShoulder: -0.3, lElbow: 1.3, rShoulder: 0.6, rElbow: 1.4, lean: 0 } },
    { t: 0.07, pose: { lShoulder: 1.55, lElbow: 0, rShoulder: 0.7, rElbow: 1.5, lean: 0.18, lHip: -0.25, rHip: 0.25 } },
    { t: 0.3, pose: { lShoulder: 1.45, lElbow: 0.1, rShoulder: 0.7, rElbow: 1.5, lean: 0.12, lHip: -0.25, rHip: 0.25 } },
  ],
  kick: [
    { t: 0, pose: { rHip: -0.5, rKnee: 0.9, lean: -0.1, lShoulder: 0.5, rShoulder: -0.6, lElbow: 1.0, rElbow: 1.0 } },
    { t: 0.1, pose: { rHip: 1.65, rKnee: 0, lean: -0.2, lShoulder: -0.8, rShoulder: 0.9, lElbow: 0.8, rElbow: 0.6, crouch: 0.05 } },
    { t: 0.45, pose: { rHip: 1.5, rKnee: 0.1, lean: -0.15, lShoulder: -0.8, rShoulder: 0.9, lElbow: 0.8, rElbow: 0.6 } },
  ],
  jumpKick: [
    { t: 0, pose: { lHip: 0.6, lKnee: 1.3, rHip: -0.2, rKnee: 1.0, lShoulder: -0.6, rShoulder: -0.6, lElbow: 0.8, rElbow: 0.8 } },
    { t: 0.08, pose: { lHip: 0.4, lKnee: 1.4, rHip: 1.7, rKnee: 0, lean: -0.25, lShoulder: -0.9, rShoulder: 0.9, lElbow: 0.6, rElbow: 0.4 } },
    { t: 0.5, pose: { lHip: 0.4, lKnee: 1.4, rHip: 1.6, rKnee: 0.1, lean: -0.2, lShoulder: -0.9, rShoulder: 0.9, lElbow: 0.6, rElbow: 0.4 } },
  ],
  slide: [ // sliding kick along the floor
    { t: 0, pose: { lean: 0.3, crouch: 0.3, rHip: 0.6, rKnee: 0.8, lHip: -0.3, lKnee: 0.8, lShoulder: -0.6, rShoulder: -0.6 } },
    { t: 0.1, pose: { lean: 0.9, crouch: 0.8, rHip: 1.5, rKnee: 0, lHip: -0.6, lKnee: 1.4, lShoulder: -1.2, rShoulder: -1.0, lElbow: 0.5, rElbow: 0.5 } },
    { t: 0.5, pose: { lean: 0.9, crouch: 0.8, rHip: 1.5, rKnee: 0, lHip: -0.6, lKnee: 1.4, lShoulder: -1.2, rShoulder: -1.0, lElbow: 0.5, rElbow: 0.5 } },
  ],
  lash: [ // whip crack straight ahead
    { t: 0, pose: { rShoulder: -2.4, rElbow: 0.4, weapon: 1.0, lean: -0.1 } },
    { t: 0.12, pose: { rShoulder: 1.5, rElbow: 0, weapon: 0.15, lean: 0.2, lHip: 0.3, rHip: -0.3 } },
    { t: 0.4, pose: { rShoulder: 1.4, rElbow: 0.05, weapon: 0.2, lean: 0.15, lHip: 0.3, rHip: -0.3 } },
  ],
  shoot: [ // arm out, the weapon level with the ground
    { t: 0, pose: { rShoulder: 1.5, rElbow: 0, weapon: 0.1, lShoulder: 0.9, lElbow: 1.2, lean: 0.05 } },
    { t: 0.3, pose: { rShoulder: 1.45, rElbow: 0, weapon: 0.1, lShoulder: 0.9, lElbow: 1.2, lean: 0.05 } },
  ],
  breath: [ // leans back, then forward blowing fire
    { t: 0, pose: { lean: -0.3, headTilt: -0.3, lShoulder: -0.5, rShoulder: -0.5, lElbow: 0.8, rElbow: 0.8 } },
    { t: 0.3, pose: { lean: 0.2, headTilt: 0.35, lShoulder: 0.4, rShoulder: 0.4, lElbow: 0.5, rElbow: 0.5 } },
    { t: 0.8, pose: { lean: 0.15, headTilt: 0.3, lShoulder: 0.4, rShoulder: 0.4 } },
  ],
};

export interface Frame { x: number; y: number; scale: number; flip: boolean }

/** When set, every primitive is drawn one pixel fatter in this colour: the 16-bit outline pass. */
let outline: string | null = null;

/** Draws a chunky pixel segment of thickness `t` from (x0,y0) to (x1,y1). */
function seg(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number, color: string): void {
  ctx.fillStyle = outline ?? color;
  if (outline) t += 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const half = Math.floor(t / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (dx * i) / n);
    const y = Math.round(y0 + (dy * i) / n);
    ctx.fillRect(x - half, y - half, t, t);
  }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = outline ?? c;
  const o = outline ? 1 : 0;
  ctx.fillRect(Math.round(x) - o, Math.round(y) - o, Math.round(w) + 2 * o, Math.round(h) + 2 * o);
}

/**
 * Draws the rig at feet position (fx, fy) in screen space. `flip` mirrors to face left.
 * Returns nothing; the caller sorts by depth.
 */
export function drawRig(ctx: CanvasRenderingContext2D, rig: RigDef, pose: Pose, fx: number, fy: number, flip: boolean, tint?: string): void {
  // outline pass first (dark, one pixel fatter), then the coloured figure on top
  outline = '#141018';
  drawFigure(ctx, rig, pose, fx, fy, flip);
  outline = null;
  drawFigure(ctx, rig, pose, fx, fy, flip);
  if (tint) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = tint;
    const s = rig.scale;
    ctx.fillRect(Math.round(fx - 14 * s), Math.round(fy - 48 * s), Math.round(28 * s), Math.round(50 * s));
    ctx.restore();
  }
}

function drawFigure(ctx: CanvasRenderingContext2D, rig: RigDef, pose: Pose, fx: number, fy: number, flip: boolean): void {
  if (rig.beast) { drawBeast(ctx, rig, pose, fx, fy, flip); return; }
  const s = rig.scale;
  const pal = rig.palette;
  const dir = flip ? -1 : 1;
  const bulk = rig.bulk ?? 0;
  const slim = rig.slim ? -1 : 0;
  // proportions (hero scale 1: ~46 px tall)
  const legLen = 10 * s;
  const shin = 9 * s;
  const torsoH = 15 * s;
  const torsoW = (11 + bulk * 3 + slim * 2) * s;
  const armLen = 8 * s;
  const foreLen = 7 * s;
  const headR = 5 * s;
  const limb = Math.max(2, Math.round((3 + bulk) * s));
  const crouch = pose.crouch * 8 * s;

  const hipY = fy - legLen - shin + crouch;
  const hipX = fx;
  // legs: hip angle swings forward (+dir), knee bends back
  const leg = (hip: number, knee: number, shade: boolean) => {
    const kx = hipX + Math.sin(hip) * legLen * dir;
    const ky = hipY + Math.cos(hip) * legLen;
    const ax = kx + Math.sin(hip - knee) * shin * dir;
    const ay = ky + Math.cos(hip - knee) * shin;
    seg(ctx, hipX, hipY, kx, ky, limb, shade ? pal.legsDark : pal.legs);
    seg(ctx, kx, ky, ax, ay, limb, shade ? pal.legsDark : pal.legs);
    rect(ctx, ax - limb / 2 + (dir > 0 ? 0 : -2 * s), ay - 2 * s, limb + 2 * s, 3 * s, pal.boots);
  };
  const lean = pose.lean;
  const shX = hipX + Math.sin(lean) * torsoH * dir;
  const shY = hipY - Math.cos(lean) * torsoH;
  // back leg, back arm first
  leg(pose.lHip, pose.lKnee, true);
  const arm = (sh: number, el: number, shade: boolean, withWeapon: boolean) => {
    const ex = shX + Math.sin(sh) * armLen * dir;
    const ey = shY + Math.cos(sh) * armLen;
    const hx = ex + Math.sin(sh + el) * foreLen * dir;
    const hy = ey + Math.cos(sh + el) * foreLen;
    const skin = shade ? pal.skinDark : pal.skin;
    const sleeve = rig.bareChest ? skin : shade ? pal.topDark : pal.top;
    seg(ctx, shX, shY, ex, ey, limb, sleeve);
    seg(ctx, ex, ey, hx, hy, limb, skin);
    if (withWeapon && rig.weapon !== 'none') drawWeapon(ctx, rig, hx, hy, sh + el + pose.weapon, dir, s);
  };
  arm(pose.lShoulder, pose.lElbow, true, false);
  // torso
  const tw = torsoW;
  ctx.save();
  ctx.translate(Math.round(hipX), Math.round(hipY));
  ctx.rotate(-lean * dir);
  rect(ctx, -tw / 2, -torsoH, tw, torsoH, rig.bareChest ? pal.skin : pal.top);
  rect(ctx, -tw / 2, -torsoH * 0.45, tw, torsoH * 0.45, rig.bareChest ? pal.skinDark : pal.topDark);
  if (rig.bareChest) rect(ctx, -tw / 2, -3 * s, tw, 3 * s, pal.legs); // belt
  ctx.restore();
  // head
  const hx = shX + Math.sin(lean + pose.headTilt) * headR * 1.2 * dir;
  const hy = shY - Math.cos(lean + pose.headTilt) * headR * 1.2;
  rect(ctx, hx - headR, hy - headR, headR * 2, headR * 2, pal.skin);
  drawHead(ctx, rig, hx, hy, headR, dir);
  // eye (colour pass only)
  if (!outline) rect(ctx, hx + dir * headR * 0.4, hy - headR * 0.1, Math.max(1, s), Math.max(1, s), pal.eyes ?? '#000');
  // front leg, front arm with weapon
  leg(pose.rHip, pose.rKnee, false);
  arm(pose.rShoulder, pose.rElbow, false, true);
}

function drawHead(ctx: CanvasRenderingContext2D, rig: RigDef, hx: number, hy: number, r: number, dir: number): void {
  const pal = rig.palette;
  switch (rig.head) {
    case 'bare': rect(ctx, hx - r, hy - r, r * 2, r * 0.7, pal.hair); break;
    case 'long': rect(ctx, hx - r, hy - r, r * 2, r * 0.7, pal.hair); rect(ctx, hx - r * 1.2 * dir - (dir > 0 ? r * 0.6 : 0), hy - r, r * 0.8, r * 2.6, pal.hair); break;
    case 'helmet': rect(ctx, hx - r * 1.1, hy - r * 1.2, r * 2.2, r * 1.1, pal.weapon); rect(ctx, hx - r * 1.1, hy - r * 1.2, r * 2.2, r * 0.3, pal.weaponDark); break;
    case 'horns': rect(ctx, hx - r * 1.1, hy - r * 1.2, r * 2.2, r, pal.weapon); rect(ctx, hx - r * 1.6, hy - r * 1.9, r * 0.5, r, pal.weaponDark); rect(ctx, hx + r * 1.1, hy - r * 1.9, r * 0.5, r, pal.weaponDark); break;
    case 'hood': rect(ctx, hx - r * 1.1, hy - r * 1.2, r * 2.2, r * 1.6, pal.top); rect(ctx, hx - r * 0.6 + dir * r * 0.2, hy - r * 0.6, r * 1.3, r * 1.2, pal.skinDark); break;
    case 'mohawk': rect(ctx, hx - r * 0.3, hy - r * 1.8, r * 0.6, r * 1.2, pal.hair); break;
    case 'cap': rect(ctx, hx - r, hy - r * 1.1, r * 2, r * 0.8, pal.top); rect(ctx, hx + dir * r * 0.3, hy - r * 0.5, r * 1.1, r * 0.3, pal.topDark); break;
    case 'skull': rect(ctx, hx - r, hy - r, r * 2, r * 2, '#e8e8d8'); rect(ctx, hx + dir * r * 0.3, hy - r * 0.2, r * 0.5, r * 0.5, '#000'); rect(ctx, hx - dir * r * 0.5, hy - r * 0.2, r * 0.5, r * 0.5, '#000'); break;
    case 'beast': rect(ctx, hx - r, hy - r, r * 2, r * 0.6, pal.topDark); break;
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, rig: RigDef, hx: number, hy: number, angle: number, dir: number, s: number): void {
  const pal = rig.palette;
  // the blade points along `angle` from the hand (0 = straight down)
  const ux = Math.sin(angle) * dir;
  const uy = Math.cos(angle);
  const t = Math.max(2, Math.round(2 * s));
  switch (rig.weapon) {
    case 'sword': seg(ctx, hx, hy, hx + ux * 18 * s, hy + uy * 18 * s, t, pal.weapon); seg(ctx, hx - uy * 3 * s * dir, hy + ux * 3 * s * dir, hx + uy * 3 * s * dir, hy - ux * 3 * s * dir, t, pal.weaponDark); break;
    case 'axe': { seg(ctx, hx, hy, hx + ux * 16 * s, hy + uy * 16 * s, t, pal.weaponDark); const bx = hx + ux * 12 * s; const by = hy + uy * 12 * s; rect(ctx, bx - 5 * s, by - 4 * s, 10 * s, 8 * s, pal.weapon); break; }
    case 'club': seg(ctx, hx, hy, hx + ux * 14 * s, hy + uy * 14 * s, t + 1, pal.weaponDark); rect(ctx, hx + ux * 12 * s - 3 * s, hy + uy * 12 * s - 3 * s, 6 * s, 6 * s, pal.weapon); break;
    case 'hammer': { seg(ctx, hx, hy, hx + ux * 20 * s, hy + uy * 20 * s, t, pal.weaponDark); const bx = hx + ux * 18 * s; const by = hy + uy * 18 * s; rect(ctx, bx - 7 * s, by - 5 * s, 14 * s, 10 * s, pal.weapon); break; }
    case 'staff': seg(ctx, hx - ux * 10 * s, hy - uy * 10 * s, hx + ux * 20 * s, hy + uy * 20 * s, t, pal.weapon); rect(ctx, hx + ux * 20 * s - 2 * s, hy + uy * 20 * s - 2 * s, 4 * s, 4 * s, '#a0e0ff'); break;
    case 'claws': for (let i = -1; i <= 1; i++) seg(ctx, hx, hy + i * 2 * s, hx + ux * 9 * s, hy + uy * 9 * s + i * 3 * s, t, pal.weapon); break;
    case 'knife': seg(ctx, hx, hy, hx + ux * 8 * s, hy + uy * 8 * s, t, pal.weapon); break;
    case 'pipe': seg(ctx, hx, hy, hx + ux * 16 * s, hy + uy * 16 * s, t, pal.weapon); break;
    case 'bat': seg(ctx, hx, hy, hx + ux * 16 * s, hy + uy * 16 * s, t + 1, pal.weapon); break;
    case 'whip': for (let i = 0; i < 6; i++) seg(ctx, hx + ux * i * 4 * s + Math.sin(i) * 2, hy + uy * i * 4 * s, hx + ux * (i + 1) * 4 * s + Math.sin(i + 1) * 2, hy + uy * (i + 1) * 4 * s, t, pal.weapon); break;
    case 'boomerang': rect(ctx, hx - 3 * s, hy - 3 * s, 6 * s, 6 * s, pal.weapon); break;
    case 'bottle': seg(ctx, hx, hy, hx + ux * 7 * s, hy + uy * 7 * s, t + 1, '#60c080'); break;
    case 'shaker': seg(ctx, hx, hy, hx + ux * 6 * s, hy + uy * 6 * s, t + 2, '#f0f0f0'); rect(ctx, hx + ux * 6 * s - 2 * s, hy + uy * 6 * s - 2 * s, 4 * s, 3 * s, '#808890'); break;
    case 'gun': { // sub-machine gun: barrel along the arm, stock behind, grip below
      seg(ctx, hx - ux * 6 * s, hy - uy * 6 * s, hx + ux * 14 * s, hy + uy * 14 * s, t + 1, pal.weaponDark);
      seg(ctx, hx + ux * 2 * s, hy + uy * 2 * s, hx + ux * 2 * s - uy * 5 * s * dir, hy + uy * 2 * s + ux * 5 * s * dir, t, pal.weaponDark);
      rect(ctx, hx + ux * 10 * s - s, hy + uy * 10 * s - s, 3 * s, 2 * s, pal.weapon);
      break;
    }
    case 'none': break;
  }
}

/** Mounts: a chicken-leg bizarrian or a dragon, with a saddle. */
function drawBeast(ctx: CanvasRenderingContext2D, rig: RigDef, pose: Pose, fx: number, fy: number, flip: boolean): void {
  const s = rig.scale;
  const pal = rig.palette;
  const dir = flip ? -1 : 1;
  const bob = Math.sin(pose.lHip * 4) * 2 * s;
  const bodyW = (rig.beast === 'dragon' ? 34 : 26) * s;
  const bodyH = (rig.beast === 'dragon' ? 16 : 14) * s;
  const by = fy - 16 * s - bodyH + bob;
  const bx = fx - bodyW / 2;
  // legs
  const legT = Math.max(2, Math.round(3 * s));
  const lx = fx - dir * 6 * s;
  seg(ctx, lx, by + bodyH, lx + Math.sin(pose.lHip) * 8 * s * dir, fy - 6 * s, legT, pal.legsDark);
  seg(ctx, lx + Math.sin(pose.lHip) * 8 * s * dir, fy - 6 * s, lx + Math.sin(pose.lHip) * 8 * s * dir + 4 * s * dir, fy, legT, pal.legsDark);
  const rx = fx + dir * 4 * s;
  seg(ctx, rx, by + bodyH, rx + Math.sin(pose.rHip) * 8 * s * dir, fy - 6 * s, legT, pal.legs);
  seg(ctx, rx + Math.sin(pose.rHip) * 8 * s * dir, fy - 6 * s, rx + Math.sin(pose.rHip) * 8 * s * dir + 4 * s * dir, fy, legT, pal.legs);
  // body and tail
  rect(ctx, bx, by, bodyW, bodyH, pal.top);
  rect(ctx, bx, by + bodyH * 0.6, bodyW, bodyH * 0.4, pal.topDark);
  seg(ctx, fx - dir * bodyW / 2, by + bodyH * 0.4, fx - dir * (bodyW / 2 + 14 * s), by + bodyH * 0.2 + Math.sin(pose.weapon) * 6 * s, legT, pal.topDark);
  // saddle
  rect(ctx, fx - 7 * s, by - 3 * s, 14 * s, 4 * s, pal.weapon);
  // neck and head
  const nx = fx + dir * bodyW / 2;
  seg(ctx, nx, by + 4 * s, nx + dir * 8 * s, by - 8 * s, legT + 1, pal.top);
  rect(ctx, nx + dir * 6 * s - 5 * s, by - 14 * s, 12 * s, 8 * s, pal.top);
  rect(ctx, nx + dir * 10 * s - (dir > 0 ? 0 : 6 * s), by - 11 * s, 6 * s, 3 * s, pal.topDark); // beak/snout
  rect(ctx, nx + dir * 5 * s, by - 12 * s, 2 * s, 2 * s, '#000');
  if (rig.beast === 'dragon') {
    rect(ctx, fx - 4 * s, by - 7 * s, 8 * s, 5 * s, pal.topDark); // spines
    rect(ctx, fx - 12 * s, by - 5 * s, 6 * s, 4 * s, pal.topDark);
  }
}
