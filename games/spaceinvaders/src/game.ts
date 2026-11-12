import {
  W, PLAY_TOP, PLAY_BOTTOM, PLAYER_W, PLAYER_H, PLAYER_Y, PLAYER_VX, PLAYER_MIN_X, PLAYER_MAX_X,
  BULLET_VY, BULLET_W, BULLET_H, SHOT_VY, SHOT_W, SHOT_H, MAX_SHOTS, INVASION_Y,
  UFO_W, UFO_H, UFO_Y, UFO_VX, UFO_INTERVAL_MIN, UFO_INTERVAL_MAX,
  DYING_TIME, WAVE_CLEAR_TIME, RESPAWN_GRACE,
} from './config';
import { Rng, Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import { Formation, Invader } from './formation';
import { Barricade, makeBarricades } from './barricade';
import { aabb, Box } from './collision';
import { ScoreKeeper, invaderPoints, ufoPoints } from './scoring';
import type { SoundFx } from './audio';
import { settings, HighScore, Settings } from './storage';

export type State = ShellState;
/** What happens inside `playing`: the fight, the cannon exploding, the pause between waves. */
export type Phase = 'play' | 'dying' | 'waveclear';

export interface Shot extends Box {
  frame: number;
  t: number;
}

export interface Explosion {
  x: number;
  y: number;
  t: number;
  dur: number;
  kind: 'invader' | 'ufo' | 'player';
  label?: string;
}

export interface Ufo extends Box {
  vx: number;
}

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'play';
  phaseTime = 0;
  rng = new Rng(1);
  formation = new Formation(1);
  barricades: Barricade[] = makeBarricades();
  player: Box = { x: W / 2 - PLAYER_W / 2, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };
  bullet: Box | null = null;
  shots: Shot[] = [];
  explosions: Explosion[] = [];
  ufo: Ufo | null = null;

  score = new ScoreKeeper();
  wave = 1;
  deathReason = '';
  time = 0;
  grace = 0;
  private tickTimer = 0;
  private shotTimer = 0;
  private ufoTimer = 0;
  private invaded = false;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      settings,
      // no game over jingle: the cannon explosion already played
      audio: { blip: () => audio.blip(), gameOver: () => undefined, setMuted: (m) => audio.setMuted(m) },
      onStart: () => this.startGame(),
      onStop: () => audio.ufoStop(),
      onResume: () => { if (this.ufo) audio.ufoStart(); },
      remote: { game: 'spaceinvaders', label: (e) => `ONDA ${e.section}` },
      entry: (initials) => ({ initials, score: this.score.score, section: this.wave, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score.score, section: this.wave, date: '' }),
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

  get hiScore(): number {
    return Math.max(this.shell.bestScore, this.score.score);
  }

  // ---------- transitions ----------

  startGame(): void {
    this.rng = new Rng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.score = new ScoreKeeper();
    this.wave = 1;
    this.barricades = makeBarricades();
    this.startWave();
  }

  private startWave(): void {
    this.formation = new Formation(this.wave);
    this.bullet = null;
    this.shots = [];
    this.explosions = [];
    this.stopUfo();
    this.invaded = false;
    this.tickTimer = 0;
    this.shotTimer = this.rng.range(1.0, 2.0);
    this.ufoTimer = this.rng.range(UFO_INTERVAL_MIN, UFO_INTERVAL_MAX);
    this.player.x = W / 2 - PLAYER_W / 2;
    this.grace = RESPAWN_GRACE;
    this.setPhase('play');
    this.shell.setState('playing');
  }

  private respawn(): void {
    this.bullet = null;
    this.shots = [];
    this.explosions = [];
    this.player.x = W / 2 - PLAYER_W / 2;
    this.grace = RESPAWN_GRACE;
    this.setPhase('play');
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private stopUfo(): void {
    if (this.ufo) this.audio.ufoStop();
    this.ufo = null;
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.phaseTime += dt;
    switch (this.phase) {
      case 'play': this.updatePlaying(dt); break;
      case 'dying': this.updateDying(dt); break;
      case 'waveclear': this.updateWaveClear(dt); break;
    }
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    this.grace = Math.max(0, this.grace - dt);

    // Player
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    this.player.x = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, this.player.x + dir * PLAYER_VX * dt));
    if (inp.isDown('fire') && !this.bullet && this.grace === 0) {
      this.bullet = { x: this.player.x + Math.floor(PLAYER_W / 2), y: this.player.y - BULLET_H, w: BULLET_W, h: BULLET_H };
      this.audio.shoot();
    }

    // Formation ticks
    this.tickTimer += dt;
    const interval = this.formation.interval();
    if (this.tickTimer >= interval) {
      this.tickTimer -= interval;
      this.formation.step();
      this.audio.march();
      this.carveBarricades();
      const b = this.formation.bounds();
      if (b && b.bottom >= INVASION_Y) {
        this.invaded = true;
        this.die('INVASAO!');
        return;
      }
    }

    // Invader shots
    this.shotTimer -= dt;
    if (this.shotTimer <= 0 && this.shots.length < MAX_SHOTS) {
      this.fireInvaderShot();
      const base = Math.max(0.35, 1.3 - this.wave * 0.1);
      this.shotTimer = this.rng.range(base * 0.5, base * 1.5);
    }

    // UFO
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      if (this.ufo.x < -UFO_W - 4 || this.ufo.x > W + 4) this.stopUfo();
    } else {
      this.ufoTimer -= dt;
      if (this.ufoTimer <= 0 && this.formation.aliveCount >= 8) {
        const dir = this.rng.chance(0.5) ? 1 : -1;
        this.ufo = { x: dir > 0 ? -UFO_W : W, y: UFO_Y, w: UFO_W, h: UFO_H, vx: dir * UFO_VX };
        this.audio.ufoStart();
        this.ufoTimer = this.rng.range(UFO_INTERVAL_MIN, UFO_INTERVAL_MAX);
      }
    }

    this.updateBullet(dt);
    this.updateShots(dt);
    this.updateExplosions(dt);

    // Invaders touching the player
    if (this.grace === 0 && this.formation.hitTest(this.player)) {
      this.die('ABATIDO');
      return;
    }

    if (this.formation.aliveCount === 0 && this.explosions.length === 0) {
      this.stopUfo();
      this.audio.waveClear();
      this.setPhase('waveclear');
    }
  }

  private carveBarricades(): void {
    const b = this.formation.bounds();
    if (!b || b.bottom < this.barricades[0].y) return;
    for (const inv of this.formation.invaders) {
      if (!inv.alive) continue;
      const r = this.formation.rect(inv);
      for (const bar of this.barricades) if (aabb(r, bar.box)) bar.carve(r);
    }
  }

  private fireInvaderShot(): void {
    const shooters = this.formation.shooters();
    if (shooters.length === 0) return;
    // Bias towards the column closest to the player one time in three.
    let inv: Invader;
    if (this.rng.chance(0.33)) {
      const px = this.player.x + PLAYER_W / 2;
      inv = shooters.reduce((best, s) => {
        const d = Math.abs(this.formation.rect(s).x + 6 - px);
        return d < Math.abs(this.formation.rect(best).x + 6 - px) ? s : best;
      }, shooters[0]);
    } else {
      inv = this.rng.pick(shooters);
    }
    const r = this.formation.rect(inv);
    this.shots.push({ x: r.x + Math.floor(r.w / 2) - 1, y: r.y + r.h, w: SHOT_W, h: SHOT_H, frame: 0, t: 0 });
  }

  private updateBullet(dt: number): void {
    const b = this.bullet;
    if (!b) return;
    b.y -= BULLET_VY * dt;
    if (b.y + b.h < PLAY_TOP) {
      this.bullet = null;
      return;
    }
    // vs UFO
    if (this.ufo && aabb(b, this.ufo)) {
      const pts = ufoPoints(this.rng);
      this.explosions.push({ x: this.ufo.x, y: this.ufo.y, t: 0, dur: 1.0, kind: 'ufo', label: String(pts) });
      this.stopUfo();
      this.audio.ufoHit();
      this.addPoints(pts);
      this.bullet = null;
      return;
    }
    // vs invaders
    const inv = this.formation.hitTest(b);
    if (inv) {
      const r = this.formation.rect(inv);
      inv.alive = false;
      this.explosions.push({ x: r.x + r.w / 2 - 6, y: r.y, t: 0, dur: 0.25, kind: 'invader' });
      this.audio.invaderHit();
      this.addPoints(invaderPoints(inv.row));
      this.bullet = null;
      return;
    }
    // vs invader shots (destroy both)
    for (let i = 0; i < this.shots.length; i++) {
      if (aabb(b, this.shots[i])) {
        this.shots.splice(i, 1);
        this.bullet = null;
        this.audio.shieldHit();
        return;
      }
    }
    // vs barricades
    for (const bar of this.barricades) {
      if (!aabb(b, bar.box)) continue;
      const hit = bar.firstHit(b, -1);
      if (hit) {
        bar.blast(hit.c, hit.r);
        this.audio.shieldHit();
        this.bullet = null;
        return;
      }
    }
  }

  private updateShots(dt: number): void {
    const keep: Shot[] = [];
    for (const s of this.shots) {
      s.y += SHOT_VY * dt;
      s.t += dt;
      s.frame = Math.floor(s.t * 12) % 2;
      if (s.y > PLAY_BOTTOM) continue;
      let consumed = false;
      for (const bar of this.barricades) {
        if (!aabb(s, bar.box)) continue;
        const hit = bar.firstHit(s, 1);
        if (hit) {
          bar.blast(hit.c, hit.r);
          this.audio.shieldHit();
          consumed = true;
          break;
        }
      }
      if (consumed) continue;
      if (this.grace === 0 && aabb(s, this.player)) {
        this.die('ABATIDO');
        return;
      }
      keep.push(s);
    }
    this.shots = keep;
  }

  private addPoints(pts: number): void {
    if (this.score.add(pts)) this.audio.extraLife();
  }

  private updateExplosions(dt: number): void {
    for (const ex of this.explosions) ex.t += dt;
    this.explosions = this.explosions.filter((ex) => ex.t < ex.dur);
  }

  private die(reason: string): void {
    this.deathReason = reason;
    this.explosions.push({ x: this.player.x - 2, y: this.player.y, t: 0, dur: DYING_TIME, kind: 'player' });
    this.audio.playerHit();
    this.stopUfo();
    this.shots = [];
    this.bullet = null;
    this.setPhase('dying');
  }

  private updateDying(dt: number): void {
    this.updateExplosions(dt);
    if (this.phaseTime < DYING_TIME) return;
    this.score.lives--;
    if (this.score.lives <= 0 || this.invaded) {
      this.score.lives = Math.max(0, this.score.lives);
      this.shell.endGame();
    } else {
      this.respawn();
    }
  }

  private updateWaveClear(dt: number): void {
    this.updateExplosions(dt);
    if (this.phaseTime < WAVE_CLEAR_TIME) return;
    this.wave++;
    this.startWave();
  }
}
