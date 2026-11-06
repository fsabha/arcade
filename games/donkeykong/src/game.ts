import {
  W, MARIO_W, MARIO_H, WALK_SPEED, CLIMB_SPEED, JUMP_TIME, JUMP_H, JUMP_DX, FALL_SPEED, FATAL_FALL, HAMMER_TIME, HAMMER_SWING,
  START_LIVES, EXTRA_LIFE_AT, DEATH_TIME, WIN_TIME, INTRO_TIME, POINTS, StageKind, bonusStart, bonusTick, itemPoints, stageOrder,
  barrelInterval, fireballsFor, speedFactor,
} from './config';
import { Stage, Platform, Ladder, buildStage, yAt, platformUnder, platformBelow, rivetGapAt } from './stages';
import { Actors } from './actors';
import { Rng, Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Phase = 'intro' | 'play' | 'dead' | 'win';
export type Mode = 'walk' | 'jump' | 'climb' | 'fall';

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

export interface Rect { x: number; y: number; w: number; h: number }
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface Mario {
  x: number; // centre
  feet: number;
  facing: 1 | -1;
  mode: Mode;
  walking: boolean;
  phase: number;
  jumpT: number;
  jumpX0: number; jumpY0: number; jumpDir: number;
  ladder: Ladder | null;
  fallFrom: number;
  hammerT: number;
  swing: number;
  onCar: boolean;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'intro';
  level = 1;
  stageIndex = 0;
  stage: Stage = buildStage('barrels');
  actors = new Actors(this.stage, 1);
  mario: Mario = this.newMario();
  score = 0;
  lives = START_LIVES;
  bonus = 5000;
  lastPoints = { x: 0, y: 0, n: 0, t: 0 };
  kongPhase = 0;
  deathReason = '';
  private bonusAcc = 0;
  private throwT = 0;
  private fireT = 0;
  private blueThrown = false;
  private drumLit = false;
  private extraGiven = false;
  private rng = new Rng(1);
  private stepAcc = 0;

  time = 0;
  phaseTime = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onStop: () => this.audio.musicStop(),
      onMusic: (on) => this.audio.setMusicEnabled(on),
      onResume: () => this.audio.musicStart(),
      remote: { game: 'donkeykong', label: (e) => `NIVEL ${e.level}` },
      entry: (initials) => ({ initials, score: this.score, level: this.level, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.level, date: '' }),
    });
  }

  // the shell owns the screens around the game; these keep the renderer and tests simple
  get state(): State { return this.shell.state; }
  get stateTime(): number { return this.shell.stateTime; }
  get menuIndex(): number { return this.shell.menuIndex; }
  get pauseIndex(): number { return this.shell.pauseIndex; }
  get initials(): string[] { return this.shell.initials; }
  get initialsPos(): number { return this.shell.initialsPos; }
  get qualifiesForRank(): boolean { return this.shell.qualifiesForRank; }
  get settings(): Settings { return this.shell.settings; }
  get highScores(): HighScore[] { return this.shell.highScores; }

  private newMario(): Mario {
    const s = this.stage.mario;
    return { x: s.x, feet: s.y, facing: 1, mode: 'walk', walking: false, phase: 0, jumpT: 0, jumpX0: 0, jumpY0: 0, jumpDir: 0, ladder: null, fallFrom: 0, hammerT: 0, swing: 0, onCar: false };
  }

  get kind(): StageKind {
    return this.stage.kind;
  }

  get stages(): StageKind[] {
    return stageOrder(this.level);
  }

  get marioRect(): Rect {
    const m = this.mario;
    return { x: m.x - MARIO_W / 2 + 1, y: m.feet - MARIO_H + 2, w: MARIO_W - 2, h: MARIO_H - 2 };
  }

  get hammering(): boolean {
    return this.mario.hammerT > 0;
  }

  /** The hammer head's box, swinging between in front and overhead. */
  get hammerRect(): Rect | null {
    const m = this.mario;
    if (!this.hammering) return null;
    const up = Math.floor(m.swing / HAMMER_SWING) % 2 === 0;
    if (up) return { x: m.x - 6, y: m.feet - MARIO_H - 12, w: 12, h: 12 };
    return { x: m.facing > 0 ? m.x + 4 : m.x - 16, y: m.feet - 12, w: 12, h: 12 };
  }

  // ---------- state ----------

  startGame(): void {
    this.level = 1;
    this.stageIndex = 0;
    this.score = 0;
    this.lives = START_LIVES;
    this.extraGiven = false;
    this.rng = new Rng((Date.now() & 0xffff) + 1);
    this.startStage();
    this.shell.setState('playing');
    this.audio.setMusicEnabled(this.shell.settings.music !== false);
    this.audio.musicStart();
  }

  private startStage(): void {
    this.stage = buildStage(this.stages[this.stageIndex]);
    this.actors = new Actors(this.stage, (this.level * 7919 + this.stageIndex * 31 + Date.now()) >>> 0);
    this.mario = this.newMario();
    this.bonus = bonusStart(this.level);
    this.bonusAcc = 0;
    this.throwT = 1.2;
    this.fireT = 2;
    this.blueThrown = false;
    this.drumLit = false;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.audio.intro();
    if (this.kind !== 'barrels') {
      for (let i = 0; i < fireballsFor(this.kind, this.level); i++) {
        const drum = this.stage.oilDrum;
        if (drum) this.actors.spawnFireball(drum.x + 8, drum.y);
        else this.actors.spawnFireball(this.rng.pick([40, 180]), this.rng.pick([232, 184, 136]));
      }
    }
  }

  /** After a death: same stage, fresh enemies. */
  private restartStage(): void {
    const kind = this.kind;
    this.stage = buildStage(kind);
    this.actors = new Actors(this.stage, (this.level * 7919 + Date.now()) >>> 0);
    this.mario = this.newMario();
    this.bonus = bonusStart(this.level);
    this.bonusAcc = 0;
    this.throwT = 1.2;
    this.fireT = 2;
    this.blueThrown = false;
    this.drumLit = false;
    this.phase = 'intro';
    this.phaseTime = 0;
    if (kind !== 'barrels') {
      for (let i = 0; i < fireballsFor(kind, this.level); i++) {
        const drum = this.stage.oilDrum;
        if (drum) this.actors.spawnFireball(drum.x + 8, drum.y);
        else this.actors.spawnFireball(this.rng.pick([40, 180]), this.rng.pick([232, 184, 136]));
      }
    }
  }

  private endGame(): void {
    this.shell.endGame();
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    this.phaseTime += dt;
    this.kongPhase += dt;
    if (this.lastPoints.t > 0) this.lastPoints.t -= dt;

    switch (this.phase) {
      case 'intro':
        if (this.phaseTime >= INTRO_TIME) { this.phase = 'play'; this.phaseTime = 0; }
        return;
      case 'dead':
        if (this.phaseTime >= DEATH_TIME) this.respawn();
        return;
      case 'win':
        if (this.phaseTime >= WIN_TIME) this.nextStage();
        return;
    }

    // the bonus timer
    this.bonusAcc += dt;
    const tick = bonusTick(this.level);
    while (this.bonusAcc >= tick) {
      this.bonusAcc -= tick;
      this.bonus = Math.max(0, this.bonus - 100);
      if (this.bonus === 0) { this.die('tempo'); return; }
    }

    this.updateKong(dt);
    const k = speedFactor(this.level);
    const m = this.mario;
    const a = this.actors;
    a.updateBarrels(dt, k, m.x, m.feet);
    a.updateFireballs(dt, k, m.x, m.feet);
    if (this.kind === 'conveyors') a.updateConveyors(dt, k);
    if (this.kind === 'elevators') { a.updateElevators(dt); a.updateSprings(dt, k); }
    if (this.kind === 'barrels') this.oilDrum();

    this.updateMario(dt);
    if (this.phase !== 'play') return;
    this.pickups();
    this.hammerHits();
    this.jumpScores();
    this.enemyHits();
    if (this.phase !== 'play') return;
    this.checkGoal();
  }

  private updateKong(dt: number): void {
    const a = this.actors;
    switch (this.kind) {
      case 'barrels':
        this.throwT -= dt;
        if (this.throwT <= 0) {
          this.throwT = barrelInterval(this.level) * (0.7 + this.rng.next() * 0.6);
          // the first barrel of the stage is blue and heads straight for the oil drum
          const blue = !this.blueThrown || this.rng.chance(0.12);
          if (blue) this.blueThrown = true;
          a.throwBarrel(blue);
          this.audio.barrelThrow();
        }
        break;
      case 'conveyors':
        this.throwT -= dt;
        if (this.throwT <= 0 && a.pies.length < 4 + this.level) {
          this.throwT = Math.max(0.9, 2.2 - this.level * 0.2);
          a.dropPie();
        }
        break;
      case 'elevators':
        this.throwT -= dt;
        if (this.throwT <= 0) {
          this.throwT = Math.max(1.2, 2.8 - this.level * 0.2);
          a.throwSpring();
        }
        break;
      case 'rivets':
        break;
    }
  }

  /** Blue barrels that reach the drum light it and release fireballs. */
  private oilDrum(): void {
    const a = this.actors;
    const drum = this.stage.oilDrum!;
    this.fireT -= 1 / 60;
    const max = fireballsFor('barrels', this.level);
    const blueArrived = a.barrels.some((b) => b.blue && Math.abs(b.y - drum.y) < 3 && b.x < drum.x + 20);
    if (blueArrived) {
      this.drumLit = true;
      for (const b of a.barrels) if (b.blue && Math.abs(b.y - drum.y) < 3 && b.x < drum.x + 20) b.alive = false;
    }
    // every blue barrel lights a fireball; a lit drum also breathes one out now and then
    if ((blueArrived || (this.drumLit && this.fireT <= 0)) && a.fireballs.length < max) {
      a.spawnFireball(drum.x + 8, drum.y);
      this.fireT = 14;
    }
  }

  private updateMario(dt: number): void {
    const inp = this.input;
    const m = this.mario;
    const st = this.stage;
    m.phase += dt;
    if (m.hammerT > 0) {
      m.hammerT -= dt;
      m.swing += dt;
      if (m.hammerT <= 0) m.hammerT = 0;
    }
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);

    switch (m.mode) {
      case 'walk': {
        m.walking = dir !== 0;
        if (dir !== 0) {
          m.facing = dir as 1 | -1;
          m.x += dir * WALK_SPEED * dt;
          this.stepAcc += dt;
          if (this.stepAcc > 0.2) { this.stepAcc = 0; this.audio.walk(); }
        }
        // conveyors carry Mario along
        const under = platformUnder(st, m.x, m.feet, 6);
        if (under?.conveyor) m.x += this.actors.conveyorSpeed(under, m.x) * speedFactor(this.level) * dt;
        m.x = Math.max(6, Math.min(W - 6, m.x));
        const p = platformUnder(st, m.x, m.feet, 6);
        const car = this.actors.carUnder(m.x, m.feet);
        if (car) { m.feet = car.y; m.onCar = true; }
        else if (p && !rivetGapAt(st, m.x, m.feet)) { m.feet = yAt(p, m.x); m.onCar = false; }
        else { m.mode = 'fall'; m.fallFrom = m.feet; m.onCar = false; break; }
        if (m.onCar && (m.feet < 60 || m.feet > 252)) { this.die('elevador'); return; } // crushed at the ends of the shaft
        if (!this.hammering) {
          if (inp.justPressed('fire')) { this.startJump(dir); break; }
          if (inp.isDown('up')) { const l = this.ladderAt(m.x, m.feet, 'up'); if (l) { this.startClimb(l); break; } }
          if (inp.isDown('down')) { const l = this.ladderAt(m.x, m.feet, 'down'); if (l) { this.startClimb(l); break; } }
        }
        break;
      }
      case 'jump': {
        m.jumpT += dt;
        const kk = Math.min(1, m.jumpT / JUMP_TIME);
        m.x = Math.max(6, Math.min(W - 6, m.jumpX0 + m.jumpDir * JUMP_DX * kk));
        const want = m.jumpY0 - Math.sin(Math.PI * kk) * JUMP_H;
        m.feet = want;
        if (kk > 0.5) {
          // coming down: land on whatever is under the feet
          const p = platformUnder(st, m.x, m.feet, 3);
          const car = this.actors.carUnder(m.x, m.feet);
          if (car) { m.feet = car.y; m.mode = 'walk'; m.onCar = true; break; }
          if (p && !rivetGapAt(st, m.x, m.feet)) { m.feet = yAt(p, m.x); m.mode = 'walk'; break; }
        }
        if (kk >= 1) { m.mode = 'fall'; m.fallFrom = m.jumpY0; }
        break;
      }
      case 'fall': {
        m.feet += FALL_SPEED * dt;
        const p = platformUnder(st, m.x, m.feet, 6);
        const car = this.actors.carUnder(m.x, m.feet);
        if (car || (p && !rivetGapAt(st, m.x, m.feet))) {
          m.feet = car ? car.y : yAt(p!, m.x);
          m.onCar = !!car;
          if (m.feet - m.fallFrom > FATAL_FALL) { this.die('queda'); return; }
          m.mode = 'walk';
        } else if (m.feet > 270) { this.die('queda'); return; }
        break;
      }
      case 'climb': {
        const l = m.ladder!;
        m.walking = false;
        const up = inp.isDown('up') ? -1 : inp.isDown('down') ? 1 : 0;
        m.phase += Math.abs(up) * dt;
        const limit = l.broken !== undefined ? l.yBottom - l.broken : l.yTop;
        m.feet = Math.max(limit, Math.min(l.yBottom, m.feet + up * CLIMB_SPEED * dt));
        if (up < 0 && m.feet <= l.yTop + 0.01 && l.broken === undefined) { m.feet = l.yTop; m.mode = 'walk'; m.ladder = null; }
        else if (up > 0 && m.feet >= l.yBottom - 0.01) { m.feet = l.yBottom; m.mode = 'walk'; m.ladder = null; }
        break;
      }
    }
  }

  private startJump(dir: number): void {
    const m = this.mario;
    m.mode = 'jump';
    m.jumpT = 0;
    m.jumpX0 = m.x;
    m.jumpY0 = m.feet;
    m.jumpDir = dir;
    m.walking = false;
    m.onCar = false;
    this.audio.jump();
  }

  private ladderAt(x: number, feet: number, want: 'up' | 'down'): Ladder | null {
    for (const l of this.stage.ladders) {
      if (Math.abs(x - (l.x + 4)) > 5) continue;
      if (want === 'up' && Math.abs(feet - l.yBottom) <= 3) return l;
      if (want === 'down' && Math.abs(feet - l.yTop) <= 3 && l.broken === undefined) return l;
    }
    return null;
  }

  private startClimb(l: Ladder): void {
    const m = this.mario;
    m.mode = 'climb';
    m.ladder = l;
    m.x = l.x + 4;
    m.feet = Math.max(l.yTop, Math.min(l.yBottom, m.feet));
    m.walking = false;
    m.onCar = false;
  }

  // ---------- scoring ----------

  private points(n: number, x: number, y: number): void {
    this.lastPoints = { x, y, n, t: 1 };
    this.addScore(n);
  }

  private addScore(n: number): void {
    this.score += n;
    if (!this.extraGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraGiven = true;
      this.lives++;
      this.audio.extraLife();
    }
  }

  private pickups(): void {
    const m = this.mario;
    const me = this.marioRect;
    for (const h of this.stage.hammers) {
      if (h.taken || m.mode === 'climb') continue;
      if (overlaps(me, { x: h.x, y: h.y - 10, w: 8, h: 10 })) {
        h.taken = true;
        m.hammerT = HAMMER_TIME;
        m.swing = 0;
        this.audio.hammerLoop();
      }
    }
    for (const it of this.stage.items) {
      if (it.taken) continue;
      if (overlaps(me, { x: it.x, y: it.y - 10, w: 10, h: 10 })) {
        it.taken = true;
        this.points(itemPoints(this.level), it.x, it.y - 12);
        this.audio.item();
      }
    }
    if (this.kind === 'rivets' && m.mode === 'walk') {
      for (const r of this.stage.rivets) {
        if (r.taken || Math.abs(r.y - m.feet) > 2) continue;
        if (Math.abs(m.x - (r.x + 4)) <= 4) {
          r.taken = true;
          this.points(POINTS.rivet, r.x, r.y - 14);
          this.audio.rivet();
          if (this.stage.rivets.every((rr) => rr.taken)) this.win();
        }
      }
    }
  }

  private hammerHits(): void {
    const h = this.hammerRect;
    if (!h) return;
    const a = this.actors;
    for (const b of a.barrels) {
      if (b.alive && overlaps(h, { x: b.x - 6, y: b.y - 10, w: 12, h: 10 })) {
        b.alive = false;
        this.points(this.rng.pick(POINTS.hammerBarrel), b.x, b.y - 14);
        this.audio.hammerHit();
      }
    }
    for (const f of a.fireballs) {
      if (f.alive && overlaps(h, { x: f.x - 6, y: f.y - 12, w: 12, h: 12 })) {
        f.alive = false;
        this.points(POINTS.hammerFire, f.x, f.y - 14);
        this.audio.hammerHit();
      }
    }
    for (const p of a.pies) {
      if (p.alive && overlaps(h, { x: p.x - 8, y: p.y - 6, w: 16, h: 6 })) {
        p.alive = false;
        this.points(POINTS.hammerFire, p.x, p.y - 12);
        this.audio.hammerHit();
      }
    }
  }

  /** 100 for every barrel, pie or fireball that passes under Mario mid-jump. */
  private jumpScores(): void {
    const m = this.mario;
    if (m.mode !== 'jump') return;
    const a = this.actors;
    const under = (x: number, y: number) => Math.abs(x - m.x) < 8 && y > m.feet && y < m.feet + 20;
    for (const b of a.barrels) if (!b.jumped && !b.ladder && under(b.x, b.y)) { b.jumped = true; this.points(POINTS.jump, m.x, m.feet - 24); this.audio.score(); }
    for (const p of a.pies) if (!p.jumped && under(p.x, p.y)) { p.jumped = true; this.points(POINTS.jump, m.x, m.feet - 24); this.audio.score(); }
    for (const f of a.fireballs) if (!f.ladder && under(f.x, f.y)) { /* fireballs score only once per jump */ }
  }

  private enemyHits(): void {
    const me = this.marioRect;
    const a = this.actors;
    for (const b of a.barrels) if (b.alive && overlaps(me, { x: b.x - 5, y: b.y - 9, w: 10, h: 9 })) { this.die('barril'); return; }
    for (const f of a.fireballs) if (f.alive && overlaps(me, { x: f.x - 5, y: f.y - 11, w: 10, h: 11 })) { this.die('fogo'); return; }
    for (const p of a.pies) if (p.alive && overlaps(me, { x: p.x - 7, y: p.y - 5, w: 14, h: 5 })) { this.die('torta'); return; }
    for (const s of a.springs) if (s.alive && overlaps(me, { x: s.x - 5, y: s.y - 9, w: 10, h: 9 })) { this.die('mola'); return; }
    // Kong himself
    const k = this.stage.kong;
    if (overlaps(me, { x: k.x + 4, y: k.y - 30, w: 32, h: 30 }) && this.kind !== 'rivets') { this.die('kong'); return; }
  }

  private checkGoal(): void {
    const g = this.stage.goal;
    if (this.mario.mode === 'walk' && overlaps(this.marioRect, g)) this.win();
  }

  private win(): void {
    this.phase = 'win';
    this.phaseTime = 0;
    this.addScore(this.bonus);
    this.audio.win();
  }

  private nextStage(): void {
    this.stageIndex++;
    if (this.stageIndex >= this.stages.length) { this.stageIndex = 0; this.level++; }
    this.startStage();
  }

  die(reason: string): void {
    if (this.phase !== 'play') return;
    this.phase = 'dead';
    this.phaseTime = 0;
    this.deathReason = reason;
    this.mario.hammerT = 0;
    this.audio.die();
  }

  private respawn(): void {
    this.lives--;
    if (this.lives <= 0) { this.endGame(); return; }
    this.restartStage();
  }
}

export { platformBelow, yAt };
export type { Platform };
