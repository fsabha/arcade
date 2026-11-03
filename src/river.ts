import { Rng } from './rng';
import {
  W, KEY_STEP, SECTION_KEYS, SECTION_LEN, BANK_MARGIN, MIN_CHANNEL,
  BRIDGE_WIDTH, BRIDGE_H, BRIDGE_Y_FROM_END,
} from './config';

export interface RiverRow {
  left: number;
  right: number;
  island: [number, number] | null;
}

interface Keypoint {
  y: number;
  center: number;
  width: number;
  icenter: number; // island center (== center when no island)
  iwidth: number; // 0 => no island
}

export type SpawnKind = 'ship' | 'heli' | 'jet' | 'fuel' | 'bridge';

export interface SpawnDef {
  id: number;
  kind: SpawnKind;
  x: number; // world x (left edge)
  y: number; // world y (bottom edge)
  w: number;
  h: number;
  moving: boolean;
  dir: 1 | -1;
  section: number;
}

export interface Section {
  index: number;
  startY: number;
  endY: number;
  bridgeY: number;
  spawns: SpawnDef[]; // sorted by y ascending
}

export const SPAWN_SIZE: Record<SpawnKind, [number, number]> = {
  ship: [32, 8],
  heli: [16, 12],
  jet: [16, 8],
  fuel: [16, 24],
  bridge: [BRIDGE_WIDTH, BRIDGE_H],
};

export interface Difficulty {
  minWidth: number;
  maxWidth: number;
  islandChance: number;
  movingChance: number;
  enemies: number;
  fuels: number;
  jets: number;
  enemySpeed: number;
  jetSpeed: number;
}

export function difficulty(s: number): Difficulty {
  return {
    minWidth: Math.max(60, 120 - s * 6),
    maxWidth: Math.max(100, 180 - s * 5),
    islandChance: Math.min(0.5, 0.12 + s * 0.05),
    movingChance: Math.min(0.9, 0.15 + s * 0.08),
    enemies: Math.min(32, 10 + s * 2),
    fuels: Math.max(3, 6 - Math.floor(s / 3)),
    jets: Math.min(8, 1 + s),
    enemySpeed: Math.min(90, 30 + s * 6),
    jetSpeed: Math.min(260, 140 + s * 12),
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function channelsOf(row: RiverRow): { left: number; right: number }[] {
  if (!row.island) return [{ left: row.left, right: row.right }];
  return [
    { left: row.left, right: row.island[0] },
    { left: row.island[1], right: row.right },
  ];
}

/**
 * Procedural, infinite river. World y grows "north" (up the screen).
 * Keypoints lie on a uniform grid (y = k * KEY_STEP); rows are smooth-interpolated between them.
 * Each section ends with a narrow stretch and a bridge.
 */
export class River {
  readonly seed: number;
  readonly sections: Section[] = [];
  private readonly rng: Rng;
  private readonly keypoints: Keypoint[] = [];
  private nextId = 1;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
  }

  /** Generate sections until the river covers world y. Returns newly created sections. */
  ensure(y: number): Section[] {
    const added: Section[] = [];
    while (this.sections.length === 0 || this.sections[this.sections.length - 1].endY < y + KEY_STEP * 2) {
      added.push(this.generateSection(this.sections.length));
    }
    return added;
  }

  sectionAt(y: number): Section {
    const idx = Math.max(0, Math.floor(y / SECTION_LEN));
    this.ensure((idx + 1) * SECTION_LEN);
    return this.sections[idx];
  }

  rowAt(y: number): RiverRow {
    if (y < 0) y = 0;
    this.ensure(y);
    const i = Math.floor(y / KEY_STEP);
    const a = this.keypoints[i];
    const b = this.keypoints[i + 1] ?? a;
    const t = smooth((y - a.y) / KEY_STEP);
    const center = a.center + (b.center - a.center) * t;
    const width = a.width + (b.width - a.width) * t;
    const icenter = a.icenter + (b.icenter - a.icenter) * t;
    const iwidth = a.iwidth + (b.iwidth - a.iwidth) * t;
    const left = center - width / 2;
    const right = center + width / 2;
    const island: [number, number] | null = iwidth >= 2 ? [icenter - iwidth / 2, icenter + iwidth / 2] : null;
    return { left, right, island };
  }

  private generateSection(index: number): Section {
    const d = difficulty(index);
    const startY = index * SECTION_LEN;
    const endY = startY + SECTION_LEN;
    const rng = this.rng;

    // Keypoints k = 0..SECTION_KEYS-1. k=0,1 and k=28,29 are narrow (bridge approach).
    for (let k = 0; k < SECTION_KEYS; k++) {
      const y = startY + k * KEY_STEP;
      const narrow = k <= 1 || k >= SECTION_KEYS - 2;
      if (narrow) {
        this.keypoints.push({ y, center: W / 2, width: BRIDGE_WIDTH, icenter: W / 2, iwidth: 0 });
        continue;
      }
      const prev = this.keypoints[this.keypoints.length - 1];
      const width = clamp(prev.width + rng.range(-36, 36), d.minWidth, d.maxWidth);
      const center = clamp(prev.center + rng.range(-40, 40), BANK_MARGIN + width / 2, W - BANK_MARGIN - width / 2);
      const left = center - width / 2;
      const right = center + width / 2;
      const maxIsland = width - 2 * MIN_CHANNEL;
      let iwidth = 0;
      // No islands right after a bridge (k<=4) so the player has room to react, nor just before the next one.
      if (maxIsland >= 12 && k > 4 && k < SECTION_KEYS - 3) {
        if (prev.iwidth > 0) {
          iwidth = rng.chance(0.72) ? clamp(prev.iwidth + rng.range(-10, 10), 12, Math.min(44, maxIsland)) : 0;
        } else if (rng.chance(d.islandChance)) {
          iwidth = rng.range(12, Math.min(44, maxIsland));
        }
      }
      let icenter = center;
      if (iwidth > 0) {
        const base = prev.iwidth > 0 ? prev.icenter : center;
        icenter = clamp(base + rng.range(-16, 16), left + MIN_CHANNEL + iwidth / 2, right - MIN_CHANNEL - iwidth / 2);
      }
      this.keypoints.push({ y, center, width, icenter, iwidth });
    }
    const section: Section = { index, startY, endY, bridgeY: endY - BRIDGE_Y_FROM_END, spawns: [] };
    this.sections.push(section);
    this.populate(section, d);
    return section;
  }

  private populate(section: Section, d: Difficulty): void {
    const rng = this.rng;
    const { startY, endY, index } = section;
    const kinds: SpawnKind[] = [];
    for (let i = 0; i < d.enemies; i++) kinds.push(rng.chance(0.55) ? 'ship' : 'heli');
    for (let i = 0; i < d.fuels; i++) kinds.push('fuel');
    for (let i = 0; i < d.jets; i++) kinds.push('jet');
    rng.shuffle(kinds);

    const yMin = startY + (index === 0 ? 340 : 110);
    const yMax = endY - 130;
    const slot = (yMax - yMin) / kinds.length;

    for (let i = 0; i < kinds.length; i++) {
      let kind = kinds[i];
      const y = Math.floor(yMin + i * slot + rng.range(0, slot * 0.5));
      let [w, h] = SPAWN_SIZE[kind];
      const dir: 1 | -1 = rng.chance(0.5) ? 1 : -1;
      let x: number;
      if (kind === 'jet') {
        x = dir > 0 ? -w : W;
      } else {
        const row = this.rowAtKeypointsOnly(y + h / 2);
        let channels = channelsOf(row).filter((c) => c.right - c.left >= w + 8);
        if (channels.length === 0) {
          kind = 'heli';
          [w, h] = SPAWN_SIZE[kind];
          channels = channelsOf(row).filter((c) => c.right - c.left >= w + 8);
          if (channels.length === 0) continue;
        }
        const ch = channels[rng.int(0, channels.length - 1)];
        x = Math.floor(rng.range(ch.left + 4, ch.right - w - 4));
      }
      section.spawns.push({
        id: this.nextId++, kind, x, y, w, h,
        moving: kind !== 'fuel' && rng.chance(d.movingChance),
        dir, section: index,
      });
    }
    const [bw, bh] = SPAWN_SIZE.bridge;
    section.spawns.push({
      id: this.nextId++, kind: 'bridge', x: W / 2 - bw / 2, y: section.bridgeY, w: bw, h: bh,
      moving: false, dir: 1, section: index,
    });
    section.spawns.sort((a, b) => a.y - b.y);
  }

  /** rowAt without triggering generation (used while populating a section whose keypoints already exist). */
  private rowAtKeypointsOnly(y: number): RiverRow {
    const i = Math.floor(y / KEY_STEP);
    const a = this.keypoints[i];
    const b = this.keypoints[i + 1] ?? a;
    const t = smooth((y - a.y) / KEY_STEP);
    const center = a.center + (b.center - a.center) * t;
    const width = a.width + (b.width - a.width) * t;
    const icenter = a.icenter + (b.icenter - a.icenter) * t;
    const iwidth = a.iwidth + (b.iwidth - a.iwidth) * t;
    const island: [number, number] | null = iwidth >= 2 ? [icenter - iwidth / 2, icenter + iwidth / 2] : null;
    return { left: center - width / 2, right: center + width / 2, island };
  }
}
