import { describe, it, expect } from 'vitest';
import { Field, dist2, wrapX, wrapY } from '../src/field';
import { W, FIELD_TOP, H } from '../src/config';

describe('field', () => {
  it('wraps positions on the torus', () => {
    expect(wrapX(-5)).toBe(W - 5);
    expect(wrapY(H + 3)).toBe(FIELD_TOP + 3);
    expect(dist2(2, FIELD_TOP + 2, W - 2, H - 2)).toBe(32);
  });
  it('spawns a wave away from the centre and splits large -> medium -> small -> nothing', () => {
    const f = new Field(3, false);
    f.spawnWave(6);
    expect(f.asteroids).toHaveLength(6);
    for (const a of f.asteroids) expect(dist2(a.x, a.y, W / 2, FIELD_TOP + (H - FIELD_TOP) / 2)).toBeGreaterThanOrEqual(70 * 70);
    const big = f.asteroids[0];
    f.split(big, false);
    expect(f.asteroids).toHaveLength(7);
    expect(f.asteroids.filter((a) => a.size === 'medium')).toHaveLength(2);
    const med = f.asteroids.find((a) => a.size === 'medium')!;
    f.split(med, false);
    expect(f.asteroids.filter((a) => a.size === 'small')).toHaveLength(2);
    const small = f.asteroids.find((a) => a.size === 'small')!;
    f.split(small, false);
    expect(f.asteroids).toHaveLength(7);
    expect(f.debris.length).toBeGreaterThan(0);
  });
  it('kids game: medium asteroids are pulverised instead of splitting', () => {
    const f = new Field(3, false);
    f.spawnWave(1);
    f.split(f.asteroids[0], true);
    expect(f.asteroids).toHaveLength(2);
    f.split(f.asteroids[0], true);
    expect(f.asteroids).toHaveLength(1);
  });
  it('fast games move asteroids faster', () => {
    const slow = new Field(9, false); slow.spawnWave(5);
    const fast = new Field(9, true); fast.spawnWave(5);
    const avg = (f: Field) => f.asteroids.reduce((s, a) => s + Math.hypot(a.vx, a.vy), 0) / f.asteroids.length;
    expect(avg(fast)).toBeGreaterThan(avg(slow) * 1.4);
  });
  it('saucers cross the screen, shoot at the ship and leave', () => {
    const f = new Field(4, false);
    f.spawnSaucer('ufo');
    const ship = { x: W / 2, y: FIELD_TOP + 100, alive: true };
    for (let i = 0; i < 60 * 2; i++) f.update(1 / 60, ship);
    expect(f.shots.some((s) => s.enemy)).toBe(true);
    for (let i = 0; i < 60 * 8 && f.saucer; i++) f.update(1 / 60, ship);
    expect(f.saucer).toBeNull();
  });
});
