import type { RiverRow } from './river';

export interface Box {
  x: number;
  y: number; // bottom edge (world)
  w: number;
  h: number;
}

export function aabb(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when any sampled row of the box overlaps land (bank or island). */
export function hitsBank(box: Box, rowAt: (y: number) => RiverRow): boolean {
  const ys = [box.y, box.y + box.h / 2, box.y + box.h - 1];
  for (const sy of ys) {
    const row = rowAt(Math.floor(sy));
    if (box.x < row.left || box.x + box.w > row.right) return true;
    if (row.island && box.x < row.island[1] && box.x + box.w > row.island[0]) return true;
  }
  return false;
}

/** Keep a horizontally moving box inside the water channel that contains its center; flips vx at the edges. */
export function bounceInChannel(
  box: Box,
  vx: number,
  row: RiverRow,
): { x: number; vx: number } {
  const cx = box.x + box.w / 2;
  let left = row.left;
  let right = row.right;
  if (row.island) {
    if (cx < row.island[0]) right = row.island[0];
    else if (cx > row.island[1]) left = row.island[1];
  }
  let x = box.x;
  if (x < left + 1) {
    x = left + 1;
    vx = Math.abs(vx);
  } else if (x + box.w > right - 1) {
    x = right - 1 - box.w;
    vx = -Math.abs(vx);
  }
  return { x, vx };
}
