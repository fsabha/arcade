export interface Box {
  x: number;
  y: number; // top edge (screen coordinates, y grows down)
  w: number;
  h: number;
}

export function aabb(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
