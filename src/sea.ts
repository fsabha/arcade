import { Rng } from './rng';
import { W, LANES, ENEMY_W, ENEMY_H, DIVER_W, DIVER_H, PATROL_W, PATROL_H, SURFACE_Y, ENEMY_TORPEDO_V } from './config';
import { difficulty } from './scoring';
import type { Box } from './collision';

export type EnemyKind = 'shark' | 'sub';

export interface Enemy extends Box {
  id: number;
  kind: EnemyKind;
  lane: number;
  dir: 1 | -1;
  vx: number;
  fireCd: number; // subs only
  dead: boolean;
}

export interface Diver extends Box {
  id: number;
  lane: number;
  dir: 1 | -1;
  vx: number;
  dead: boolean;
}

export interface Torpedo extends Box {
  vx: number;
}

export interface Patrol extends Box {
  dir: 1 | -1;
  vx: number;
  active: boolean;
  cd: number;
}

interface LaneState {
  spawnCd: number;
  diverCd: number;
}

/** Lanes of sharks, enemy subs and divers plus the surface patrol sub. Pure logic, no DOM. */
export class Sea {
  enemies: Enemy[] = [];
  divers: Diver[] = [];
  torpedoes: Torpedo[] = [];
  patrol: Patrol = { x: -PATROL_W, y: SURFACE_Y - 6, w: PATROL_W, h: PATROL_H, dir: 1, vx: 0, active: false, cd: 1.5 };
  patrolEnabled = false;
  private lanes: LaneState[] = [];
  private nextId = 1;
  private rng: Rng;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.reset();
  }

  /** Clear the sea (new life / new game). Keeps the RNG stream. */
  reset(): void {
    this.enemies = [];
    this.divers = [];
    this.torpedoes = [];
    this.patrol = { ...this.patrol, active: false, cd: this.rng.range(1, 2.5) };
    this.lanes = LANES.map((_, i) => ({ spawnCd: 0.6 + i * 0.5 + this.rng.range(0, 1.2), diverCd: this.rng.range(2, 6) }));
  }

  update(dt: number, level: number, playerX: number): void {
    const d = difficulty(level);

    for (let i = 0; i < this.lanes.length; i++) {
      const lane = this.lanes[i];
      const busy = this.enemies.some((e) => e.lane === i);
      if (!busy) {
        lane.spawnCd -= dt;
        if (lane.spawnCd <= 0) {
          this.spawnGroup(i, level);
          lane.spawnCd = this.rng.range(d.spawnDelay[0], d.spawnDelay[1]);
        }
      }
      const hasDiver = this.divers.some((dv) => dv.lane === i);
      if (!hasDiver) {
        lane.diverCd -= dt;
        if (lane.diverCd <= 0) {
          this.spawnDiver(i, level);
          lane.diverCd = this.rng.range(4, 9);
        }
      }
    }

    for (const e of this.enemies) {
      e.x += e.vx * dt;
      if (e.kind === 'sub') {
        e.fireCd -= dt;
        const ahead = e.dir === 1 ? playerX > e.x : playerX < e.x;
        if (e.fireCd <= 0 && e.x > 8 && e.x + e.w < W - 8 && ahead) {
          e.fireCd = this.rng.range(d.fireDelay[0], d.fireDelay[1]);
          const tx = e.dir === 1 ? e.x + e.w : e.x - 6;
          this.torpedoes.push({ x: tx, y: e.y + 4, w: 6, h: 2, vx: e.dir * (ENEMY_TORPEDO_V + level * 8) });
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead && (e.dir === 1 ? e.x < W + 4 : e.x > -e.w - 4));

    for (const dv of this.divers) dv.x += dv.vx * dt;
    this.divers = this.divers.filter((dv) => !dv.dead && dv.x > -DIVER_W - 2 && dv.x < W + 2);

    for (const t of this.torpedoes) t.x += t.vx * dt;
    this.torpedoes = this.torpedoes.filter((t) => t.x > -10 && t.x < W + 10);

    // Surface patrol
    const p = this.patrol;
    if (this.patrolEnabled) {
      if (p.active) {
        p.x += p.vx * dt;
        if ((p.dir === 1 && p.x > W + 4) || (p.dir === -1 && p.x < -p.w - 4)) {
          p.active = false;
          p.cd = this.rng.range(0.8, 2.5);
        }
      } else {
        p.cd -= dt;
        if (p.cd <= 0) {
          p.dir = this.rng.chance(0.5) ? 1 : -1;
          p.vx = p.dir * d.patrolSpeed;
          p.x = p.dir === 1 ? -p.w : W;
          p.active = true;
        }
      }
    }
  }

  private spawnGroup(lane: number, level: number): void {
    const d = difficulty(level);
    const dir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
    const y = LANES[lane] - ENEMY_H / 2;
    const vx = dir * d.enemySpeed * this.rng.range(0.9, 1.1);
    if (this.rng.chance(d.subChance)) {
      this.enemies.push({
        id: this.nextId++, kind: 'sub', lane, dir, vx, dead: false,
        x: dir === 1 ? -ENEMY_W : W, y, w: ENEMY_W, h: ENEMY_H,
        fireCd: this.rng.range(0.6, 1.6),
      });
      return;
    }
    const n = this.rng.int(1, d.maxSharks);
    for (let i = 0; i < n; i++) {
      const off = i * (ENEMY_W + 6);
      this.enemies.push({
        id: this.nextId++, kind: 'shark', lane, dir, vx, dead: false,
        x: dir === 1 ? -ENEMY_W - off : W + off, y, w: ENEMY_W, h: ENEMY_H, fireCd: 0,
      });
    }
  }

  private spawnDiver(lane: number, level: number): void {
    const d = difficulty(level);
    const dir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
    this.divers.push({
      id: this.nextId++, lane, dir, vx: dir * d.diverSpeed, dead: false,
      x: dir === 1 ? -DIVER_W : W, y: LANES[lane] - DIVER_H / 2, w: DIVER_W, h: DIVER_H,
    });
  }
}
