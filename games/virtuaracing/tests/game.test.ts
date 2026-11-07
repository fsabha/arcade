import { describe, it, expect } from 'vitest';
import { installFakeDocument, FakeInput, fakeAudio, fakeCanvas } from '@arcade/shared/testing';
installFakeDocument();
const { Game } = await import('../src/game');
const { Renderer } = await import('../src/render');
const cfg = await import('../src/config');
const { buildTrack, at, world } = await import('../src/track');
const { Race } = await import('../src/race');
const { Painter, box } = await import('../src/render3d');

const dt = 1 / 60;
function playing(mode: 'arcade' | 'gp' | 'free' = 'arcade') {
  const input = new FakeInput();
  const game = new Game(input as never, fakeAudio());
  game.mode = mode;
  game.startGame();
  const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); input.endFrame(); } };
  step(Math.ceil(cfg.COUNTDOWN * 60) + 2);
  return { game, input, step };
}

describe('tracks', () => {
  it('builds three closed courses with evenly spaced samples and two checkpoints', () => {
    for (const c of cfg.COURSES) {
      const t = buildTrack(c);
      expect(t.length).toBeGreaterThan(2000);
      expect(t.samples.length).toBeGreaterThan(200);
      for (let i = 1; i < t.samples.length; i++) {
        const a = t.samples[i - 1], b = t.samples[i];
        expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(cfg.SAMPLE * 1.6);
        expect(Math.hypot(a.fx, a.fz)).toBeCloseTo(1, 1);
      }
      expect(t.checkpoints[0]).toBeLessThan(t.checkpoints[1]);
      expect(t.scenery.length).toBeGreaterThan(20);
    }
    const t = buildTrack('bigforest');
    const p = at(t, t.length + 10);
    expect(p.s).toBeCloseTo(10, 0);
    const w = world(t, 0, cfg.TRACK_W / 2);
    expect(Math.hypot(w.x - t.samples[0].x, w.z - t.samples[0].z)).toBeCloseTo(cfg.TRACK_W / 2, 0);
  });
});

describe('3d', () => {
  it('projects, clips at the near plane and sorts back to front', () => {
    const cam = { x: 0, y: 2, z: 0, yaw: 0, horizon: 96 };
    const painter = new Painter(cam);
    painter.add({ pts: [{ x: -5, y: 0, z: 10 }, { x: 5, y: 0, z: 10 }, { x: 5, y: 0, z: 20 }, { x: -5, y: 0, z: 20 }], color: '#fff' });
    painter.add({ pts: [{ x: -5, y: 0, z: -5 }, { x: 5, y: 0, z: -5 }, { x: 5, y: 0, z: 5 }, { x: -5, y: 0, z: 5 }], color: '#000' }); // crosses the near plane
    painter.add({ pts: [{ x: -5, y: 0, z: -20 }, { x: 5, y: 0, z: -20 }, { x: 5, y: 0, z: -10 }, { x: -5, y: 0, z: -10 }], color: '#000' }); // behind
    expect(painter.count).toBe(2);
    expect(box(0, 0, 0, 2, 1, 4, 0, '#ff0000').length).toBe(5);
  });
});

describe('race', () => {
  it('cars accelerate, count laps and checkpoints, and the AI stays on the road', () => {
    const t = buildTrack('bigforest');
    const r = new Race(t, 3, 5, 2);
    r.running = true;
    const events: string[] = [];
    r.player.s = -5; // right before the line
    let vmax = 0;
    for (let i = 0; i < 60 * 60; i++) { r.update(dt, { gas: true, brake: false, left: false, right: false }, (c, e) => { if (c.player) events.push(e); }); vmax = Math.max(vmax, r.player.speed); }
    expect(vmax).toBeGreaterThan(50); // the straight; without steering the curves put it on the grass
    expect(events).toContain('checkpoint');
    for (const c of r.cars) if (!c.player) expect(Math.abs(c.d)).toBeLessThanOrEqual(cfg.TRACK_W / 2);
  });
  it('the wall stops the car and the grass slows it', () => {
    const t = buildTrack('bigforest');
    const r = new Race(t, 3, 0, 5);
    r.running = true;
    for (let i = 0; i < 60 * 6; i++) r.update(dt, { gas: true, brake: false, left: false, right: true });
    expect(Math.abs(r.player.d)).toBeLessThanOrEqual(cfg.WALL);
    expect(r.player.speed).toBeLessThan(cfg.MAX_SPEED * 0.8);
  });
});

describe('virtua racing', () => {
  it('starts with a countdown, then the clock runs in arcade mode', () => {
    const { game, step } = playing();
    expect(game.phase).toBe('race');
    const t0 = game.timeLeft;
    step(60);
    expect(game.timeLeft).toBeLessThan(t0);
    expect(game.race.cars.length).toBe(cfg.CARS);
  });
  it('a checkpoint adds time; time up ends the race with points for laps', () => {
    const { game, step } = playing();
    game.race.player.s = game.track.checkpoints[0] - 2;
    game.race.player.speed = 50;
    const before = game.timeLeft;
    step(10);
    expect(game.timeLeft).toBeGreaterThan(before);
    game.timeLeft = 0.01;
    game.race.player.lap = 2;
    step(2);
    expect(game.phase).toBe('timeup');
    expect(game.score).toBe(2000);
    step(Math.ceil(cfg.FINISH_TIME * 60) + 2);
    expect(game.state).toBe('gameover');
  });
  it('finishing the laps in grand prix mode scores position and time', () => {
    const { game, step } = playing('gp');
    const p = game.race.player;
    p.s = cfg.LAPS * game.track.length - 3;
    p.lap = cfg.LAPS - 1;
    p.speed = 60;
    step(10);
    expect(game.phase).toBe('finish');
    expect(game.score).toBeGreaterThan(cfg.LAPS * 1000);
  });
  it('free run has no opponents and VR cycles the four cameras', () => {
    const { game, input, step } = playing('free');
    expect(game.race.cars.length).toBe(1);
    input.tap('special'); step(1);
    expect(game.view).toBe(2);
    for (let i = 0; i < 3; i++) { input.tap('special'); step(1); }
    expect(game.view).toBe(1);
  });
  it('renders every phase and screen without throwing', () => {
    const input = new FakeInput();
    const game = new Game(input as never, fakeAudio());
    const r = new Renderer(fakeCanvas());
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.update(dt); r.draw(game); input.endFrame(); } };
    step(10);
    input.tap('down'); step(); input.tap('right'); step(); // mode: gp
    input.tap('down'); step(); input.tap('right'); step(); // course: bay bridge
    expect(game.course).toBe('baybridge');
    input.tap('up'); step(); input.tap('up'); step(); input.tap('confirm'); step();
    expect(game.state).toBe('playing');
    input.held.add('fire');
    for (let i = 0; i < 60 * 30 && game.state === 'playing'; i++) {
      if (i % 90 === 0) { input.held.delete('left'); input.held.delete('right'); input.held.add(i % 180 ? 'left' : 'right'); }
      if (i % 300 === 0) input.tap('special');
      if (i === 400) { input.tap('pause'); step(); expect(game.state).toBe('paused'); input.tap('pause'); }
      step();
    }
    game.race.player.s = cfg.LAPS * game.track.length - 1; game.race.player.lap = cfg.LAPS - 1; game.race.player.speed = 50;
    step(10);
    expect(game.phase).toBe('finish');
    step(Math.ceil(cfg.FINISH_TIME * 60) + 130);
    expect(game.state).toBe('gameover');
    input.tap('confirm'); step();
    if (game.state === 'initials') { for (let i = 0; i < 3; i++) { input.tap('confirm'); step(); } expect(game.state).toBe('ranking'); }
  }, 20000); // thirty seconds of racing rendered on a fake canvas: slow under Node, under 1 ms a frame in the browser
});
