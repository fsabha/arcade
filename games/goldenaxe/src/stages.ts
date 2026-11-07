import type { StageDef, Spawn } from '@arcade/brawl';
import { FLOOR_TOP, FLOOR_BOTTOM } from './config';

const Y1 = 165;
const Y2 = 185;
const Y3 = 200;

const s = (def: string, side: -1 | 1, y: number, delay = 0, variant = 0): Spawn => ({ def, side, y, delay, variant });

/**
 * The eight stages of the Mega Drive cartridge. Enemy counts and placements follow the
 * original's rhythm (pairs of soldiers, then amazons, then a giant), not a frame-exact copy.
 */
export const STAGES: StageDef[] = [
  {
    id: 'wilderness', name: 'WILDERNESS', theme: 'wilderness', length: 1600, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM, camp: true,
    items: [{ kind: 'pot', x: 420, y: Y2 }],
    mounts: [{ def: 'chickenleg', x: 700, y: Y2 }],
    waves: [
      { at: 560, spawns: [s('heninger0', 1, Y1), s('heninger0', 1, Y3, 0.8)] },
      { at: 960, spawns: [s('longmoan0', 1, Y2), s('heninger1', -1, Y1, 1.0), s('amazon0', 1, Y3, 1.6)] },
      { at: 1600, boss: true, spawns: [s('badbrother', 1, Y1), s('badbrother', 1, Y3, 1.5)] },
    ],
  },
  {
    id: 'turtlevillage', name: 'TURTLE VILLAGE', theme: 'village', length: 1800, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM, camp: true,
    items: [{ kind: 'food', x: 300, y: Y3, value: 4 }, { kind: 'pot', x: 1100, y: Y1 }],
    mounts: [{ def: 'dragonBlue', x: 850, y: Y2 }],
    waves: [
      { at: 520, spawns: [s('heninger1', 1, Y1), s('longmoan0', -1, Y3, 0.6)] },
      { at: 980, spawns: [s('amazon0', 1, Y2), s('amazon1', 1, Y1, 0.7), s('heninger1', -1, Y3, 1.2)] },
      { at: 1400, spawns: [s('longmoan1', 1, Y1), s('longmoan1', 1, Y3, 0.5), s('heninger2', -1, Y2, 1.5)] },
      { at: 1800, boss: true, spawns: [s('bitter', 1, Y2), s('heninger1', -1, Y3, 2)] },
    ],
  },
  {
    id: 'turtleback', name: 'ON THE TURTLE', theme: 'turtle', length: 1400, floorTop: FLOOR_TOP + 4, floorBottom: FLOOR_BOTTOM - 6,
    items: [{ kind: 'pot', x: 600, y: Y2 }],
    mounts: [],
    waves: [
      { at: 480, spawns: [s('heninger1', 1, Y1), s('heninger1', 1, Y3, 0.5), s('amazon1', -1, Y2, 1.4)] },
      { at: 940, spawns: [s('longmoan1', 1, Y2), s('longmoan2', -1, Y1, 0.8), s('amazon1', 1, Y3, 1.6)] },
      { at: 1400, boss: true, spawns: [s('sgtmalt', 1, Y2), s('amazon1', -1, Y1, 2.5)] },
    ],
  },
  {
    id: 'eagleshead', name: "EAGLE'S HEAD", theme: 'eagle', length: 1500, floorTop: FLOOR_TOP + 6, floorBottom: FLOOR_BOTTOM - 8, camp: true,
    items: [{ kind: 'food', x: 700, y: Y2, value: 4 }],
    mounts: [{ def: 'dragonRed', x: 400, y: Y2 }],
    waves: [
      { at: 500, spawns: [s('heninger2', 1, Y1), s('heninger2', -1, Y3, 0.6), s('longmoan2', 1, Y2, 1.5)] },
      { at: 1000, spawns: [s('amazon2', 1, Y1), s('amazon2', 1, Y3, 0.5), s('amazon1', -1, Y2, 1.2)] },
      { at: 1500, boss: true, spawns: [s('badbrother', 1, Y1), s('badbrother', -1, Y3, 1.0)] },
    ],
  },
  {
    id: 'fiendspath', name: "FIEND'S PATH", theme: 'path', length: 1900, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM, camp: true,
    items: [{ kind: 'pot', x: 350, y: Y1 }, { kind: 'pot', x: 1300, y: Y3 }, { kind: 'food', x: 900, y: Y2, value: 4 }],
    mounts: [{ def: 'chickenleg', x: 1100, y: Y3 }],
    waves: [
      { at: 540, spawns: [s('skeleton', 1, Y2), s('heninger2', -1, Y1, 0.8)] },
      { at: 1000, spawns: [s('longmoan2', 1, Y1), s('longmoan2', 1, Y3, 0.6), s('skeleton', -1, Y2, 1.8)] },
      { at: 1450, spawns: [s('amazon2', 1, Y2), s('heninger3', -1, Y1, 0.8), s('heninger3', 1, Y3, 1.6)] },
      { at: 1900, boss: true, spawns: [s('scrooge', 1, Y2), s('bitter', -1, Y1, 1.5)] },
    ],
  },
  {
    id: 'castlegate', name: 'CASTLE GATE', theme: 'gate', length: 1500, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [{ kind: 'food', x: 500, y: Y3, value: 4 }, { kind: 'pot', x: 1000, y: Y1 }],
    mounts: [{ def: 'dragonBlue', x: 300, y: Y2 }],
    waves: [
      { at: 520, spawns: [s('heninger3', 1, Y1), s('heninger3', 1, Y3, 0.5), s('longmoan3', -1, Y2, 1.2)] },
      { at: 1000, spawns: [s('skeleton', 1, Y1), s('skeleton', 1, Y3, 0.6), s('amazon2', -1, Y2, 1.5)] },
      { at: 1500, boss: true, spawns: [s('heartland', 1, Y2), s('skeleton', -1, Y1, 2.5)] },
    ],
  },
  {
    id: 'castle', name: "DEATH ADDER'S CASTLE", theme: 'castle', length: 1700, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM, camp: true,
    items: [{ kind: 'pot', x: 400, y: Y2 }, { kind: 'pot', x: 800, y: Y3 }, { kind: 'food', x: 1200, y: Y1, value: 4 }],
    mounts: [],
    waves: [
      { at: 520, spawns: [s('skeleton', 1, Y1), s('skeleton', -1, Y3, 0.6), s('heninger3', 1, Y2, 1.4)] },
      { at: 1000, spawns: [s('bitter', 1, Y2), s('longmoan3', -1, Y1, 1.0), s('amazon2', 1, Y3, 2.0)] },
      { at: 1700, boss: true, spawns: [s('deathadder', 1, Y2), s('skeleton', -1, Y1, 3), s('skeleton', -1, Y3, 6)] },
    ],
  },
  {
    id: 'dungeon', name: 'DEATH BRINGER', theme: 'dungeon', length: 1200, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [{ kind: 'pot', x: 300, y: Y2 }, { kind: 'pot', x: 600, y: Y1 }],
    mounts: [],
    waves: [
      { at: 500, spawns: [s('skeleton', 1, Y1), s('skeleton', 1, Y3, 0.5), s('skeleton', -1, Y2, 1.5)] },
      { at: 1200, boss: true, spawns: [s('deathbringer', 1, Y2), s('heartland', -1, Y1, 4)] },
    ],
  },
];
