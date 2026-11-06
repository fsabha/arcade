import {
  W, PLAYER_W, PLAYER_H, PLAYER_VX, PLAYER_VY, PLAYER_MIN_Y, PLAYER_MAX_Y, DIVE_Y, TORPEDO_V, TORPEDO_W, TORPEDO_H,
  OXYGEN_MAX, OXYGEN_TIME, OXYGEN_REFILL_TIME, OXYGEN_LOW, MAX_DIVERS, DYING_TIME, BANNER_TIME, CONTINUE_TIME,
} from './config';
import { Sea, Enemy } from './sea';
import { aabb, shrink, Box } from './collision';
import { ScoreKeeper, enemyValue, rescueBonus } from './scoring';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
/** Inside `playing`: the sub is alive, exploding, or waiting for the player before the next life. */
export type Phase = 'alive' | 'dying' | 'continue';

export interface Explosion {
  x: number;
  y: number;
  t: number;
  dur: number;
  big: boolean;
}

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'alive';
  phaseTime = 0;
  sea = new Sea(1);
  player: Box = { x: W / 2 - PLAYER_W / 2, y: PLAYER_MIN_Y, w: PLAYER_W, h: PLAYER_H };
  facing: 1 | -1 = 1;
  torpedo: (Box & { vx: number }) | null = null;
  explosions: Explosion[] = [];

  score = new ScoreKeeper();
  level = 1;
  oxygen = OXYGEN_MAX;
  divers = 0;
  dived = false; // has the sub gone under since it last surfaced?
  atSurface = true;
  refilling = false;
  moving = false;
  deathReason = '';

  bannerT = 0;
  bannerText = '';
  time = 0;
  private lowTimer = 0;
  private refillTimer = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onStop: () => audio.humStop(),
      onResume: () => audio.humStart(),
      remote: { game: 'seaquest', label: (e) => `NIVEL ${e.level}` },
      entry: (initials) => ({ initials, score: this.score.score, level: this.level, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score.score, level: this.level, date: '' }),
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

  // ---------- state transitions ----------

  startGame(): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.sea = new Sea(seed);
    this.score = new ScoreKeeper();
    this.level = 1;
    this.respawn();
  }

  private respawn(): void {
    this.sea.reset();
    this.player.x = W / 2 - PLAYER_W / 2;
    this.player.y = PLAYER_MIN_Y;
    this.facing = 1;
    this.torpedo = null;
    this.explosions = [];
    this.oxygen = OXYGEN_MAX;
    this.divers = 0;
    this.dived = false;
    this.atSurface = true;
    this.refilling = false;
    this.lowTimer = 0;
    this.phase = 'alive';
    this.phaseTime = 0;
    this.shell.setState('playing');
    this.audio.humStart();
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.bannerT = BANNER_TIME;
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private updatePlaying(dt: number): void {
    this.phaseTime += dt;
    if (this.phase === 'dying') { this.updateDying(dt); return; }
    if (this.phase === 'continue') { this.updateContinue(dt); return; }
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    const p = this.player;

    // Movement (locked while refilling at the surface, as on the 2600)
    const dx = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
    this.moving = !this.refilling && (dx !== 0 || dy !== 0);
    if (!this.refilling) {
      if (dx !== 0) this.facing = dx as 1 | -1;
      p.x = Math.max(0, Math.min(W - p.w, p.x + dx * PLAYER_VX * dt));
      p.y = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, p.y + dy * PLAYER_VY * dt));
    }
    this.audio.humSet(this.moving);

    // Surface / dive bookkeeping
    const wasAtSurface = this.atSurface;
    this.atSurface = p.y <= PLAYER_MIN_Y + 1;
    if (p.y >= DIVE_Y) this.dived = true;
    if (this.atSurface && !wasAtSurface && this.dived) {
      this.dived = false;
      if (!this.onSurfaced()) return;
    }

    // Oxygen
    if (this.atSurface) {
      if (this.oxygen < OXYGEN_MAX) {
        this.oxygen = Math.min(OXYGEN_MAX, this.oxygen + (OXYGEN_MAX / OXYGEN_REFILL_TIME) * dt);
        this.refillTimer += dt;
        if (this.refillTimer >= 0.1) { this.refillTimer = 0; this.audio.refillTick(); }
      } else {
        this.refilling = false;
      }
    } else {
      this.oxygen -= (OXYGEN_MAX / OXYGEN_TIME) * dt;
      if (this.oxygen <= 0) { this.oxygen = 0; this.die('SEM OXIGENIO'); return; }
      if (this.oxygen < OXYGEN_LOW) {
        this.lowTimer += dt;
        if (this.lowTimer >= 0.5) { this.lowTimer = 0; this.audio.oxygenLow(); }
      }
    }

    // Torpedo (one at a time, not from the surface)
    if (inp.justPressed('fire') && !this.torpedo && !this.atSurface) {
      this.torpedo = {
        x: this.facing === 1 ? p.x + p.w : p.x - TORPEDO_W, y: p.y + 4, w: TORPEDO_W, h: TORPEDO_H,
        vx: this.facing * TORPEDO_V,
      };
      this.audio.torpedo();
    }
    if (this.torpedo) {
      this.torpedo.x += this.torpedo.vx * dt;
      if (this.torpedo.x < -TORPEDO_W || this.torpedo.x > W) this.torpedo = null;
    }

    // World
    this.sea.update(dt, this.level, p.x + p.w / 2);

    // Torpedo hits
    if (this.torpedo) {
      for (const e of this.sea.enemies) {
        if (!e.dead && aabb(this.torpedo, e)) { this.killEnemy(e); this.torpedo = null; break; }
      }
    }
    if (this.torpedo) {
      for (const dv of this.sea.divers) {
        if (!dv.dead && aabb(this.torpedo, dv)) {
          dv.dead = true;
          this.torpedo = null;
          this.explosions.push({ x: dv.x + dv.w / 2, y: dv.y + dv.h / 2, t: 0, dur: 0.4, big: false });
          this.audio.diverLost();
          break;
        }
      }
    }

    // Player contacts
    const pBox = shrink(p, 2, 1);
    for (const e of this.sea.enemies) {
      if (!e.dead && aabb(pBox, e)) { this.die(e.kind === 'shark' ? 'TUBARAO' : 'SUBMARINO INIMIGO'); return; }
    }
    for (const t of this.sea.torpedoes) {
      if (aabb(pBox, t)) { this.die('TORPEDO INIMIGO'); return; }
    }
    if (this.sea.patrol.active && aabb(pBox, this.sea.patrol)) { this.die('PATRULHA DE SUPERFICIE'); return; }
    for (const dv of this.sea.divers) {
      if (!dv.dead && this.divers < MAX_DIVERS && aabb(pBox, dv)) {
        dv.dead = true;
        this.divers++;
        this.audio.diver();
      }
    }

    this.updateExplosions(dt);
    this.bannerT -= dt;
  }

  /** Called once each time the sub comes up after a dive. Returns false if the player died. */
  private onSurfaced(): boolean {
    this.sea.patrolEnabled = true;
    if (this.divers === 0) {
      this.die('SUBIU SEM MERGULHADORES');
      return false;
    }
    this.refilling = true;
    if (this.divers >= MAX_DIVERS) {
      const b = rescueBonus(this.level, this.oxygen);
      if (this.score.add(b.total)) this.audio.extraLife();
      this.audio.bonus();
      this.divers = 0;
      this.level++;
      this.showBanner(`BONUS ${b.total}  NIVEL ${this.level}`);
    } else {
      this.divers--; // one diver goes ashore
      this.audio.diverLost();
    }
    return true;
  }

  private killEnemy(e: Enemy): void {
    e.dead = true;
    this.explosions.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0, dur: 0.5, big: false });
    this.audio.explode(false);
    if (this.score.add(enemyValue(this.level))) this.audio.extraLife();
  }

  private updateExplosions(dt: number): void {
    for (const ex of this.explosions) ex.t += dt;
    this.explosions = this.explosions.filter((ex) => ex.t < ex.dur);
  }

  die(reason: string): void {
    if (this.phase !== 'alive') return;
    this.deathReason = reason;
    this.explosions.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, t: 0, dur: 1.0, big: true });
    this.audio.explode(true);
    this.audio.humStop();
    this.torpedo = null;
    this.phase = 'dying';
    this.phaseTime = 0;
  }

  private updateDying(dt: number): void {
    this.updateExplosions(dt);
    this.sea.update(dt, this.level, -1000);
    if (this.phaseTime < DYING_TIME) return;
    this.score.lives--;
    if (this.score.lives <= 0) {
      this.shell.endGame();
    } else {
      // a breather: the next sub only launches when the player is ready
      this.phase = 'continue';
      this.phaseTime = 0;
    }
  }

  private updateContinue(dt: number): void {
    this.updateExplosions(dt);
    const inp = this.input;
    if (inp.justPressed('fire') || inp.justPressed('confirm') || this.phaseTime >= CONTINUE_TIME) {
      this.audio.blip();
      this.respawn();
    }
  }
}
