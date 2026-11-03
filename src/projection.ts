import { W, PLAY_H, HORIZON, CAM_H, CAM_D } from './config';

export interface Projected {
  x: number; // screen x of the point
  y: number; // screen y
  scale: number; // CAM_D / camera z
}

/**
 * Project a point at lateral offset `dx` (world, relative to the camera) and
 * depth `cz` (world, in front of the camera) onto the screen.
 * The road is flat, so y depends only on depth.
 */
export function project(dx: number, cz: number): Projected {
  const scale = CAM_D / cz;
  return {
    x: W / 2 + scale * dx * (W / 2),
    y: HORIZON + scale * CAM_H * (PLAY_H - HORIZON),
    scale,
  };
}

/** Screen width of something `worldW` wide at the given projected scale. */
export function screenWidth(worldW: number, scale: number): number {
  return scale * worldW * (W / 2);
}
