import { PX, SHIFT_TABLE, SHIFT_STEP, CROC_PERIOD, PIT_CENTER } from './config';

/** Next room when walking right: shift left, new bit0 = b3^b4^b5^b7. */
export function nextRoom(v: number): number {
  const bit = ((v >> 3) ^ (v >> 4) ^ (v >> 5) ^ (v >> 7)) & 1;
  return ((v << 1) | bit) & 0xff;
}

/** Previous room when walking left: exact inverse of nextRoom. */
export function prevRoom(v: number): number {
  const bit = (v ^ (v >> 4) ^ (v >> 5) ^ (v >> 6)) & 1;
  return (v >> 1) | (bit << 7);
}

export type Scene = 'hole1' | 'hole3' | 'tar' | 'water' | 'croc' | 'treasure' | 'shiftTar' | 'shiftWater';
export const SCENES: Scene[] = ['hole1', 'hole3', 'tar', 'water', 'croc', 'treasure', 'shiftTar', 'shiftWater'];
export const TREASURE_NAMES = ['money', 'silver', 'gold', 'ring'] as const;

export interface RoomObject {
  kind: 'log' | 'fire' | 'snake';
  x: number; // px
  rolling: boolean;
}

export interface Room {
  value: number;
  object: number; // bits 0-2
  scene: Scene; // bits 3-5
  trees: number; // bits 6-7
  wallRight: boolean; // bit 7, underground wall side on ladder rooms
  hasLadder: boolean;
  hasVine: boolean;
  treasure: number | null; // 0..3
  objects: RoomObject[];
}

// Ranges in u: [start, end) where the ground is missing.
export const HOLE_SINGLE: [number, number][] = [[72, 80]];
export const HOLE_TRIPLE: [number, number][] = [[44, 56], [72, 80], [96, 108]];
export const PIT_ZONE: [number, number] = [44, 108];
// Crocodile water, by jaw state (closed / open).
export const CROC_CLOSED: [number, number][] = [[44, 56], [64, 72], [80, 88], [96, 108]];
export const CROC_OPEN: [number, number][] = [[44, 62], [64, 78], [80, 94], [96, 108]];
export const CROC_X = [56, 72, 88]; // u, left edge of each crocodile

const LOG_LAYOUTS: number[][] = [[100], [96, 112], [80, 128], [80, 104, 128], [100], [80, 104, 128]];

export function decodeRoom(value: number): Room {
  const object = value & 7;
  const sceneIdx = (value >> 3) & 7;
  const scene = SCENES[sceneIdx];
  const hasLadder = sceneIdx <= 1;
  let hasVine = false;
  if (scene === 'tar' || scene === 'water' || scene === 'shiftTar') hasVine = true;
  if (scene === 'croc') hasVine = (object & 2) !== 0;
  const treasure = scene === 'treasure' ? object & 3 : null;
  const objects: RoomObject[] = [];
  if (scene !== 'treasure' && scene !== 'croc') {
    if (object <= 5) {
      for (const x of LOG_LAYOUTS[object]) objects.push({ kind: 'log', x: x * PX, rolling: object < 4 });
    } else {
      objects.push({ kind: object === 6 ? 'fire' : 'snake', x: 124 * PX, rolling: false });
    }
  }
  return {
    value, object, scene, trees: (value >> 6) & 3, wallRight: (value & 0x80) !== 0,
    hasLadder, hasVine, treasure, objects,
  };
}

export function crocOpen(t: number): boolean {
  return Math.floor(t / CROC_PERIOD) % 2 === 0;
}

/** Half width (u) of a shifting pit at time t; 0 means closed. */
export function shiftHalf(t: number): number {
  return SHIFT_TABLE[Math.floor(t / SHIFT_STEP) % SHIFT_TABLE.length];
}

export type Ground = 'solid' | 'hole' | 'deadly';

/** What is under a point x (u) on the surface of this room at time t. */
export function groundAt(room: Room, xu: number, t: number): Ground {
  const inside = (r: [number, number]) => xu >= r[0] && xu < r[1];
  switch (room.scene) {
    case 'hole1': return HOLE_SINGLE.some(inside) ? 'hole' : 'solid';
    case 'hole3': return HOLE_TRIPLE.some(inside) ? 'hole' : 'solid';
    case 'tar':
    case 'water': return inside(PIT_ZONE) ? 'deadly' : 'solid';
    case 'croc': return (crocOpen(t) ? CROC_OPEN : CROC_CLOSED).some(inside) ? 'deadly' : 'solid';
    case 'treasure':
    case 'shiftTar':
    case 'shiftWater': {
      const h = shiftHalf(t);
      if (h === 0) return 'solid';
      const c = PIT_CENTER / PX;
      return xu >= c - h && xu < c + h ? 'deadly' : 'solid';
    }
  }
}

/** Walk the whole cycle starting at `start`; returns the sequence of room values. */
export function roomCycle(start: number): number[] {
  const out = [start];
  let v = nextRoom(start);
  while (v !== start && out.length <= 256) { out.push(v); v = nextRoom(v); }
  return out;
}
