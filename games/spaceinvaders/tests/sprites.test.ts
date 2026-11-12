import { describe, it, expect } from 'vitest';
import { spriteMaps } from '../src/sprites';
import { KIND_SIZE } from '../src/formation';
import { PLAYER_W, PLAYER_H, UFO_W, UFO_H, SHOT_W, SHOT_H } from '../src/config';

describe('sprite maps', () => {
  it('are rectangular and match the sizes used by the game logic', () => {
    const maps = spriteMaps();
    for (const [name, rows] of Object.entries(maps)) {
      const w = rows[0].length;
      for (const r of rows) expect(r.length, `${name}`).toBe(w);
    }
    for (const kind of ['squid', 'crab', 'octopus'] as const) {
      for (const f of [0, 1]) {
        const m = maps[`${kind}${f}`];
        expect([m[0].length, m.length], `${kind}${f}`).toEqual(KIND_SIZE[kind]);
      }
    }
    expect([maps.player[0].length, maps.player.length]).toEqual([PLAYER_W, PLAYER_H]);
    expect([maps.ufo[0].length, maps.ufo.length]).toEqual([UFO_W, UFO_H]);
    expect([maps.shot0[0].length, maps.shot0.length]).toEqual([SHOT_W, SHOT_H]);
  });
});
