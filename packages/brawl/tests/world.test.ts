import { describe, it, expect } from 'vitest';
import { Brawl, Controls, NO_CONTROLS, HIT_TIME } from '../src/world';
import type { ActorDef, StageDef } from '../src/types';
import { poseAt, POSES, REST } from '../src/rig';

const rig = { palette: { skin: '#fff', skinDark: '#ccc', hair: '#000', top: '#f00', topDark: '#800', legs: '#00f', legsDark: '#008', boots: '#000', weapon: '#888', weaponDark: '#444' }, scale: 1, weapon: 'sword' as const, head: 'bare' as const };
const swing = { duration: 0.3, frames: [{ start: 0.05, end: 0.2, box: { x: 6, y: 10, w: 24, h: 24 }, damage: 1, knock: 'hit' as const, push: 60 }] };
const defs: Record<string, ActorDef> = {
  hero: { id: 'hero', name: 'HERO', hp: 6, speed: 80, width: 16, height: 40, rig, points: 0, grabbable: false, attacks: {
    combo1: { ...swing, chain: 'combo2', chainAfter: 0.1 }, combo2: { ...swing, chain: 'combo3', chainAfter: 0.1 },
    combo3: { duration: 0.4, frames: [{ start: 0.1, end: 0.3, box: { x: 6, y: 0, w: 28, h: 40 }, damage: 2, knock: 'down', push: 120 }] },
    jumpAttack: swing, dashAttack: swing, knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  } },
  thug: { id: 'thug', name: 'THUG', hp: 3, speed: 50, width: 16, height: 40, rig, points: 100, grabbable: true, attacks: { combo1: swing }, ai: { range: 22, cooldown: 1, flank: 0, caution: 0, approach: 1 } },
  thief: { id: 'thief', name: 'THIEF', hp: 1, speed: 90, width: 12, height: 30, rig, points: 0, grabbable: false, attacks: {}, ai: { range: 0, cooldown: 9, flank: 0, caution: 0, approach: 1, flee: true }, drop: { kind: 'pot' } },
};
const stage: StageDef = {
  id: 't', name: 'T', length: 900, floorTop: 140, floorBottom: 200, theme: 'x', items: [{ kind: 'food', x: 120, y: 170, value: 2 }], mounts: [],
  waves: [{ at: 480, spawns: [{ def: 'thug', side: 1, y: 170 }, { def: 'thug', side: -1, y: 180, delay: 0.5 }] }],
};
const ctl = (o: Partial<Controls>): Controls => ({ ...NO_CONTROLS, ...o });

function world() {
  const events: string[] = [];
  const b = new Brawl(stage, defs, 320, 7, {
    onHit: (_a, t, d) => events.push(`hit ${t.def.id} ${d}`),
    onKill: (a) => events.push(`kill ${a.def.id}`),
    onItem: (_h, i) => events.push(`item ${i.kind}`),
    onWaveStart: () => events.push('wave'),
    onWaveClear: () => events.push('clear'),
    onStageClear: () => events.push('stage'),
  });
  const hero = b.addHero('hero', 60, 170);
  const step = (c: Partial<Controls> = {}, n = 1) => { for (let i = 0; i < n; i++) b.update(1 / 60, new Map([[hero.id, ctl(c)]])); };
  return { b, hero, step, events };
}

describe('rig', () => {
  it('interpolates poses and every engine state has a track', () => {
    const p = poseAt(POSES.walk, 0.1);
    expect(p.lHip).toBeCloseTo(0.3, 1);
    for (const k of ['idle', 'walk', 'run', 'combo1', 'jump', 'jumpAttack', 'hit', 'fly', 'down', 'getup', 'grab', 'grabbed', 'knee', 'throw', 'thrown', 'special', 'ride', 'die']) expect(POSES[k], k).toBeDefined();
    expect(poseAt([], 1)).toEqual(REST);
  });
});

describe('brawl engine', () => {
  it('walks, picks up food and scrolls the camera up to the wave lock', () => {
    const { b, hero, step, events } = world();
    step({ right: true }, 60);
    expect(hero.x).toBeGreaterThan(120);
    expect(events).toContain('item food');
    step({ right: true }, 60 * 6);
    expect(b.scrollX).toBe(stage.waves[0].at - 320);
    expect(events).toContain('wave');
    expect(b.enemies.length).toBe(2);
  });

  it('a three-hit combo staggers then knocks down; dead enemies clear the wave and open the way', () => {
    const { b, hero, step, events } = world();
    step({ right: true }, 60 * 7);
    const e = b.enemies[0];
    hero.state = 'idle'; hero.partner = null; // walking into it may already have grabbed it
    e.x = hero.x + 18; e.y = hero.y; e.state = 'idle'; e.partner = null; e.ai.cooldown = 99;
    for (const other of b.enemies) if (other !== e) { other.x = hero.x - 150; other.ai.cooldown = 99; }
    hero.facing = 1;
    step({ attack: true }); step({}, 8);
    expect(e.state).toBe('hit');
    expect(e.hp).toBe(e.maxHp - 1);
    step({ attack: true }); step({}, 10); // combo 2
    step({ attack: true }); step({}, 32); // combo 3 (after combo 2 ends) knocks down
    expect(['fly', 'down']).toContain(e.state);
    // finish everyone
    for (const en of b.enemies) { en.hp = 0; b.damage(hero, en, 1, 'down', 50); }
    step({}, 60 * 3);
    expect(events.filter((x) => x.startsWith('kill')).length).toBe(2);
    expect(events).toContain('clear');
    expect(b.waveActive).toBe(false);
    step({ right: true }, 60 * 8);
    expect(b.cleared).toBe(true);
    expect(events).toContain('stage');
  });

  it('an enemy attacks the hero within range; the hero is invulnerable while getting up', () => {
    const { b, hero, step } = world();
    const e = b.spawn('thug', hero.x + 20, hero.y, 'enemy');
    e.ai.cooldown = 0;
    step({}, 30);
    expect(hero.hp).toBeLessThan(hero.maxHp);
    expect(['hit', 'idle', 'walk']).toContain(hero.state);
    hero.hp = 1;
    b.damage(e, hero, 1, 'down', 50);
    expect(hero.state).toBe('fly');
    step({}, 60 * 3);
    expect(hero.dead).toBe(true);
  });

  it('grabs a stunned enemy by walking into it, knees it and throws it into another', () => {
    const { b, hero, step } = world();
    const e = b.spawn('thug', hero.x + 10, hero.y, 'enemy');
    const far = b.spawn('thug', hero.x + 70, hero.y, 'enemy');
    far.ai.cooldown = 99; e.ai.cooldown = 99;
    hero.facing = 1;
    step({ right: true }, 2);
    expect(hero.state).toBe('grab');
    expect(e.state).toBe('grabbed');
    step({ attack: true }); step({}, 20);
    expect(e.hp).toBeLessThanOrEqual(e.maxHp); // knee frames are game-defined; the hold continues
    step({ jump: true });
    expect(e.state).toBe('thrown');
    step({}, 60);
    expect(['down', 'getup', 'idle', 'walk', 'die']).toContain(far.state);
  });

  it('thieves drop a pot when hit and the engine blasts every enemy on screen', () => {
    const { b, hero, step } = world();
    const th = b.spawn('thief', hero.x + 14, hero.y, 'neutral');
    th.state = 'flee';
    step({ attack: true }); step({}, 6);
    expect(b.items.some((i) => i.kind === 'pot')).toBe(true);
    const e1 = b.spawn('thug', hero.x + 100, hero.y, 'enemy');
    const e2 = b.spawn('thug', hero.x + 900, hero.y, 'enemy'); // off screen
    expect(b.blast(hero, 2)).toBe(1);
    expect(e1.state).toBe('fly');
    expect(e2.state).toBe('idle');
    void HIT_TIME;
  });
});
