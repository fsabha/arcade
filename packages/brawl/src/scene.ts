import { drawText } from '@arcade/shared';
import { drawRig, poseAt, POSES, REST } from './rig';
import type { Keyframe, RigDef, WeaponShape } from './rig';
import { moveOf } from './world';
import type { Actor, Brawl, Item, Projectile, Spark } from './world';

/** Pose for an actor's current state (the move's own track when attacking). */
export function actorPose(a: Actor): ReturnType<typeof poseAt> {
  let key: string = a.state;
  if (a.state === 'attack' || a.state === 'dashAttack' || a.state === 'jumpAttack') key = a.move ? moveOf(a, a.move)?.pose ?? a.move : a.state;
  if (a.state === 'knee') key = 'knee';
  if (a.state === 'throw') key = 'throw';
  if (a.state === 'flee') key = 'run';
  if (a.state === 'grabbed') key = 'grabbed';
  if (a.state === 'ride') key = 'ride';
  const track: Keyframe[] | undefined = POSES[key];
  if (!track) return { ...REST };
  // walking/running/idle loop; moves play once
  const loops = key === 'walk' || key === 'run' || key === 'idle';
  const len = track[track.length - 1].t || 1;
  const t = loops ? a.t % len : a.t;
  return poseAt(track, t);
}

export interface SceneOptions {
  /** screen y where the world's depth y=0 lands (the floor band is drawn from here) */
  floorOffset?: number;
  /** draw the hero in a tint while invulnerable */
  invulnTint?: string;
  /** custom item sprites: return false to fall back to the built-in drawing */
  item?(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number): boolean;
  /** custom projectile sprites (knives, boomerangs, flames); the default is a yellow dash */
  projectile?(ctx: CanvasRenderingContext2D, p: Projectile, x: number, y: number): boolean;
}

/** The actor's rig, holding whatever weapon it picked up (weapon ids are rig shapes: 'pipe', 'bat', 'knife'...). */
export function actorRig(a: Actor): RigDef {
  return a.weapon ? { ...a.def.rig, weapon: a.weapon as WeaponShape } : a.def.rig;
}

/** Draws shadows and every actor/item/projectile sorted by depth. */
export function drawScene(ctx: CanvasRenderingContext2D, b: Brawl, opts: SceneOptions = {}): void {
  const off = opts.floorOffset ?? 0;
  const sx = b.scrollX;
  type D = { y: number; draw: () => void };
  const list: D[] = [];
  for (const a of b.actors) {
    if (a.dead) continue;
    if (a.flicker && a.state === 'die' && Math.floor(a.t * 12) % 2 === 1) continue;
    const x = Math.round(a.x - sx);
    const y = Math.round(a.y + off);
    list.push({
      y: a.y + (a.mount ? 0.5 : 0),
      draw: () => {
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        const sw = a.def.width * a.def.rig.scale;
        ctx.fillRect(x - sw / 2, y - 2, sw, 3);
        const tint = a.team === 'hero' && a.invuln > 0 && Math.floor(a.t * 20) % 2 ? (opts.invulnTint ?? '#ffffff') : undefined;
        drawRig(ctx, actorRig(a), actorPose(a), x, y - Math.round(a.z), a.facing < 0, tint);
      },
    });
  }
  for (const it of b.items) {
    const x = Math.round(it.x - sx);
    const y = Math.round(it.y + off);
    const iy = y - Math.round(Math.sin(it.bounce * Math.PI) * 10);
    list.push({ y: it.y - 1, draw: () => { if (!opts.item?.(ctx, it, x, iy)) drawItem(ctx, it, x, iy); } });
  }
  for (const p of b.projectiles) {
    const x = Math.round(p.x - sx);
    const y = Math.round(p.y + off);
    list.push({ y: p.y, draw: () => { if (!opts.projectile?.(ctx, p, x, y)) { ctx.fillStyle = '#ffe060'; ctx.fillRect(x - 4, y - Math.round(p.z) - 2, 8, 3); } } });
  }
  list.sort((a, c) => a.y - c.y);
  for (const d of list) d.draw();
  for (const s of b.sparks) drawSpark(ctx, s, Math.round(s.x - sx), Math.round(s.y + off));
}

export function drawItem(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number): void {
  switch (it.kind) {
    case 'pot':
      ctx.fillStyle = '#58a8ff'; ctx.fillRect(x - 4, y - 9, 8, 8);
      ctx.fillStyle = '#2860c0'; ctx.fillRect(x - 3, y - 11, 6, 2); ctx.fillRect(x - 4, y - 3, 8, 2);
      ctx.fillStyle = '#c0e0ff'; ctx.fillRect(x - 2, y - 8, 2, 3);
      break;
    case 'food':
      ctx.fillStyle = '#e0a040'; ctx.fillRect(x - 6, y - 7, 12, 6);
      ctx.fillStyle = '#f8d890'; ctx.fillRect(x - 5, y - 6, 10, 2);
      ctx.fillStyle = '#c06020'; ctx.fillRect(x + 3, y - 10, 4, 4);
      break;
    case 'points':
      ctx.fillStyle = '#f0d040'; ctx.fillRect(x - 5, y - 6, 10, 6);
      ctx.fillStyle = '#c09020'; ctx.fillRect(x - 3, y - 4, 6, 2);
      break;
    case 'life':
      ctx.fillStyle = '#f04060'; ctx.fillRect(x - 5, y - 8, 4, 4); ctx.fillRect(x + 1, y - 8, 4, 4); ctx.fillRect(x - 5, y - 5, 10, 3); ctx.fillRect(x - 3, y - 2, 6, 2);
      break;
    case 'special':
      ctx.fillStyle = '#4060e0'; ctx.fillRect(x - 7, y - 6, 14, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 9, 8, 3);
      ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 1, y - 11, 2, 2);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 1, 3, 2); ctx.fillRect(x + 3, y - 1, 3, 2);
      break;
    case 'weapon': drawWeaponItem(ctx, it.weapon ?? 'pipe', x, y); break;
  }
}

/** A weapon lying on the floor, by shape id. */
export function drawWeaponItem(ctx: CanvasRenderingContext2D, weapon: string, x: number, y: number): void {
  switch (weapon) {
    case 'bat':
      ctx.fillStyle = '#c08040'; ctx.fillRect(x - 9, y - 4, 18, 3);
      ctx.fillStyle = '#805020'; ctx.fillRect(x - 9, y - 3, 5, 2); ctx.fillRect(x + 4, y - 5, 5, 5);
      break;
    case 'knife':
      ctx.fillStyle = '#d8e0e8'; ctx.fillRect(x - 6, y - 3, 9, 2);
      ctx.fillStyle = '#403020'; ctx.fillRect(x + 3, y - 4, 4, 3);
      break;
    case 'bottle':
      ctx.fillStyle = '#60c080'; ctx.fillRect(x - 6, y - 4, 9, 4);
      ctx.fillStyle = '#a0e0b0'; ctx.fillRect(x - 5, y - 3, 3, 1);
      ctx.fillStyle = '#306040'; ctx.fillRect(x + 3, y - 3, 4, 2);
      break;
    case 'shaker':
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 3, y - 8, 6, 7);
      ctx.fillStyle = '#808890'; ctx.fillRect(x - 3, y - 10, 6, 2);
      ctx.fillStyle = '#c04040'; ctx.fillRect(x - 2, y - 5, 4, 2);
      break;
    default: // pipe and anything else: a grey bar with a darker end
      ctx.fillStyle = '#b0b8c0'; ctx.fillRect(x - 8, y - 3, 16, 2);
      ctx.fillStyle = '#707880'; ctx.fillRect(x - 8, y - 3, 4, 2);
      break;
  }
}

function drawSpark(ctx: CanvasRenderingContext2D, s: Spark, x: number, y: number): void {
  const k = s.t / 0.35;
  const r = 2 + k * 8;
  const zy = y - Math.round(s.z);
  ctx.fillStyle = s.kind === 'pot' ? '#80c0ff' : k < 0.4 ? '#ffffff' : '#ffd040';
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    ctx.fillRect(Math.round(x + Math.cos(ang) * r) - 1, Math.round(zy + Math.sin(ang) * r * 0.6) - 1, 3, 3);
  }
}

/** Health bar in the 16-bit style: name, bar segments, and a count (lives, pots). */
export function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, hp: number, maxHp: number, color: string, w = 72): void {
  drawText(ctx, name, x, y, '#dfe6ee');
  ctx.fillStyle = '#202830';
  ctx.fillRect(x, y + 7, w, 6);
  const segs = Math.max(1, maxHp);
  const segW = (w - 2) / segs;
  for (let i = 0; i < hp; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + 1 + i * segW), y + 8, Math.max(1, Math.ceil(segW) - 1), 4);
  }
}

/** The "GO" arrow at the right edge when the way is open. */
export function drawGoArrow(ctx: CanvasRenderingContext2D, W: number, y: number): void {
  const x = W - 34;
  ctx.fillStyle = '#ffe14a';
  ctx.fillRect(x, y + 4, 14, 6);
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 14 + i, y + i + 1, 1, 12 - i * 2);
  drawText(ctx, 'GO', x, y - 6, '#ffe14a');
}

/** Parallax helper: each layer draws itself given the camera position scaled by its speed. */
export interface Layer { speed: number; draw(ctx: CanvasRenderingContext2D, scroll: number): void }

export function drawLayers(ctx: CanvasRenderingContext2D, layers: Layer[], scrollX: number): void {
  for (const l of layers) l.draw(ctx, scrollX * l.speed);
}
