export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabb(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Shrink a box on every side (for forgiving hit boxes). */
export function shrink(b: Box, px: number, py = px): Box {
  return { x: b.x + px, y: b.y + py, w: Math.max(0, b.w - px * 2), h: Math.max(0, b.h - py * 2) };
}
