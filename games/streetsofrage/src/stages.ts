import type { StageDef, Spawn, ItemDef } from '@arcade/brawl';
import { W, FLOOR_TOP, FLOOR_BOTTOM, APPLE_HEAL, CHICKEN_HEAL, POINTS } from './config';

const Y1 = 165;
const Y2 = 185;
const Y3 = 200;

const s = (def: string, side: -1 | 1, y: number, delay = 0): Spawn => ({ def, side, y, delay });
const apple = (x: number, y: number): ItemDef => ({ kind: 'food', x, y, value: APPLE_HEAL });
const chicken = (x: number, y: number): ItemDef => ({ kind: 'food', x, y, value: CHICKEN_HEAL });
const money = (x: number, y: number): ItemDef => ({ kind: 'points', x, y, value: POINTS.moneyBag });
const gold = (x: number, y: number): ItemDef => ({ kind: 'points', x, y, value: POINTS.goldBar });
const life = (x: number, y: number): ItemDef => ({ kind: 'life', x, y });
const police = (x: number, y: number): ItemDef => ({ kind: 'special', x, y });
const weapon = (w: string, x: number, y: number): ItemDef => ({ kind: 'weapon', x, y, weapon: w });

/**
 * The eight rounds of the Mega Drive cartridge. Enemy mixes and placements follow the original's
 * rhythm (punks first, whip women and the knife thrower later, a boss at the end), not a frame-exact copy.
 */
export const STAGES: StageDef[] = [
  {
    id: 'street', name: 'CITY STREET', theme: 'street', length: 1900, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [weapon('pipe', 300, Y2), apple(700, Y3), money(1100, Y1), police(1500, Y2)],
    mounts: [],
    waves: [
      { at: 560, spawns: [s('galsia0', 1, Y1), s('galsia0', 1, Y3, 0.8)] },
      { at: 980, spawns: [s('galsia0', 1, Y2), s('donovan0', -1, Y1, 1.0), s('nora', 1, Y3, 1.8)] },
      { at: 1420, spawns: [s('signal0', 1, Y1), s('galsia0', -1, Y3, 0.6), s('donovan0', 1, Y2, 1.6)] },
      { at: 1900, boss: true, spawns: [s('antonio', 1, Y2), s('galsia0', -1, Y1, 2.0), s('galsia0', 1, Y3, 4.0)] },
    ],
  },
  {
    id: 'innercity', name: 'INNER CITY', theme: 'alley', length: 1800, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [weapon('bat', 280, Y3), apple(800, Y2), weapon('bottle', 1200, Y1), chicken(1500, Y3)],
    mounts: [],
    waves: [
      { at: 540, spawns: [s('galsia1', 1, Y1), s('jack0', 1, Y3, 0.6)] },
      { at: 980, spawns: [s('nora', 1, Y2), s('electra', -1, Y1, 0.8), s('galsia0', 1, Y3, 1.6)] },
      { at: 1400, spawns: [s('signal0', 1, Y1), s('signal0', -1, Y3, 0.5), s('donovan0', 1, Y2, 1.4)] },
      { at: 1800, boss: true, spawns: [s('souther', 1, Y2), s('galsia0', -1, Y3, 2.5)] },
    ],
  },
  {
    id: 'beach', name: 'BEACH', theme: 'beach', length: 1900, floorTop: FLOOR_TOP + 4, floorBottom: FLOOR_BOTTOM,
    items: [weapon('knife', 300, Y1), money(700, Y3), life(1000, Y2), apple(1200, Y1), police(1600, Y3)],
    mounts: [],
    waves: [
      { at: 520, spawns: [s('hakuyo0', 1, Y2), s('galsia1', -1, Y3, 0.8)] },
      { at: 960, spawns: [s('donovan1', 1, Y1), s('nora', 1, Y3, 0.6), s('signal0', -1, Y2, 1.5)] },
      { at: 1420, spawns: [s('jack0', 1, Y1), s('jack0', -1, Y3, 0.8), s('galsia1', 1, Y2, 1.8)] },
      { at: 1900, boss: true, spawns: [s('abadede', 1, Y2), s('donovan0', -1, Y1, 3.0)] },
    ],
  },
  {
    id: 'bridge', name: 'BRIDGE', theme: 'bridge', length: 1700, floorTop: FLOOR_TOP + 6, floorBottom: FLOOR_BOTTOM - 6,
    items: [weapon('pipe', 350, Y2), chicken(900, Y1), weapon('shaker', 1250, Y3)],
    mounts: [],
    waves: [
      { at: 540, spawns: [s('galsia1', 1, Y1), s('donovan1', -1, Y3, 0.6), s('signal1', 1, Y2, 1.6)] },
      { at: 1000, spawns: [s('hakuyo0', 1, Y2), s('electra', -1, Y1, 1.0)] },
      { at: 1380, spawns: [s('jack1', 1, Y3), s('galsia2', -1, Y1, 0.8), s('galsia1', 1, Y2, 2.0)] },
      { at: 1700, boss: true, spawns: [s('bongo', 1, Y2), s('galsia1', -1, Y1, 2.0), s('galsia1', -1, Y3, 5.0)] },
    ],
  },
  {
    id: 'ship', name: 'SHIP', theme: 'ship', length: 1800, floorTop: FLOOR_TOP + 4, floorBottom: FLOOR_BOTTOM - 4,
    items: [weapon('bat', 300, Y1), apple(700, Y3), gold(1100, Y2), police(1400, Y1)],
    mounts: [],
    waves: [
      { at: 540, spawns: [s('nora', 1, Y1), s('electra', -1, Y3, 0.6), s('hakuyo0', 1, Y2, 1.8)] },
      { at: 980, spawns: [s('donovan2', 1, Y2), s('signal1', -1, Y1, 0.8), s('galsia2', 1, Y3, 1.6)] },
      { at: 1400, spawns: [s('jack1', 1, Y1), s('hakuyo1', -1, Y2, 1.0), s('nora', 1, Y3, 2.2)] },
      { at: 1800, boss: true, spawns: [s('mona', 1, Y1), s('lisa', -1, Y3, 1.0)] },
    ],
  },
  {
    id: 'factory', name: 'FACTORY', theme: 'factory', length: 1900, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [weapon('pipe', 300, Y3), weapon('bottle', 800, Y1), chicken(1200, Y2), life(1500, Y3)],
    mounts: [],
    waves: [
      { at: 540, spawns: [s('hakuyo1', 1, Y2), s('donovan2', -1, Y1, 0.8), s('galsia2', 1, Y3, 1.6)] },
      { at: 1000, spawns: [s('signal1', 1, Y1), s('signal1', -1, Y3, 0.5), s('electra', 1, Y2, 1.5)] },
      { at: 1440, spawns: [s('jack1', 1, Y1), s('jack1', -1, Y3, 0.8), s('donovan2', 1, Y2, 1.6), s('galsia2', -1, Y2, 3.0)] },
      { at: 1900, boss: true, spawns: [s('souther', 1, Y1), s('abadede', -1, Y3, 2.0)] },
    ],
  },
  {
    // the elevator: no scrolling, the waves ride up with the heroes
    id: 'elevator', name: 'ELEVATOR', theme: 'elevator', length: W, floorTop: FLOOR_TOP + 10, floorBottom: FLOOR_BOTTOM - 8,
    items: [chicken(60, Y3)],
    mounts: [],
    waves: [
      { at: W, spawns: [s('galsia2', 1, Y1), s('donovan2', -1, Y3, 0.6)] },
      { at: W, spawns: [s('signal1', 1, Y2), s('hakuyo1', -1, Y1, 0.8), s('nora', 1, Y3, 2.0)] },
      { at: W, spawns: [s('jack1', -1, Y2), s('electra', 1, Y1, 0.8), s('galsia2', 1, Y3, 2.0)] },
      { at: W, boss: true, spawns: [s('bongo', 1, Y2), s('antonio', -1, Y1, 1.5)] },
    ],
  },
  {
    // Syndicate HQ: every boss again, then Mr. X and his machine gun
    id: 'hq', name: 'SYNDICATE HQ', theme: 'hq', length: 2600, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM,
    items: [chicken(700, Y2), police(1100, Y3), chicken(1500, Y1), life(1900, Y2), police(2300, Y3)],
    mounts: [],
    waves: [
      { at: 520, spawns: [s('galsia2', 1, Y1), s('donovan2', -1, Y3, 0.6), s('hakuyo1', 1, Y2, 1.6)] },
      { at: 900, boss: true, spawns: [s('antonio', 1, Y2), s('jack1', -1, Y3, 2.0)] },
      { at: 1300, boss: true, spawns: [s('souther', 1, Y1), s('galsia2', -1, Y3, 2.0)] },
      { at: 1700, boss: true, spawns: [s('abadede', 1, Y2), s('donovan2', -1, Y1, 2.0)] },
      { at: 2100, boss: true, spawns: [s('bongo', 1, Y2), s('signal1', -1, Y3, 2.0)] },
      { at: 2400, boss: true, spawns: [s('mona', 1, Y1), s('lisa', -1, Y3, 1.0)] },
      { at: 2600, boss: true, spawns: [s('mrx', 1, Y2), s('galsia2', -1, Y1, 3.0), s('galsia2', -1, Y3, 6.0)] },
    ],
  },
];
