import {
  W, LANE_H, laneTop, CHICKEN_X, CHICKEN_W, CHICKEN_H, CHICKEN_SPEED, CHICKEN_START_Y, CHICKEN_GOAL_Y, KNOCK_TIME,
  MATCH_TIME, FLASH_TIME, ROAD_BOTTOM,
} from './config';
import { Traffic, Vehicle } from './traffic';
import { Difficulty, gameSpec } from './games';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

/** `gameover` is the "tempo esgotado" screen. */
export type State = ShellState;

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  gameNumber = 1;
  difficulty: Difficulty = 'B';
  traffic = new Traffic(1, 1);

  chickenY = CHICKEN_START_Y;
  walking = false;
  walkPhase = 0;
  knockT = 0; // > 0 while tumbling after a hit
  knockFrom = 0;
  knockTo = 0;
  score = 0;
  timeLeft = MATCH_TIME;
  crossings = 0;
  hits = 0;
  private stepTimer = 0;
  private lastSecond = -1;

  time = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio: { blip: () => audio.blip(), gameOver: () => audio.timeUp(), setMuted: (m) => audio.setMuted(m) },
      onStart: () => this.startGame(),
      onItem: (item, delta) => {
        if (item === 'JOGO') this.gameNumber = ((this.gameNumber - 1 + (delta || 1) + 8) % 8) + 1;
        if (item === 'DIFICULDADE') this.difficulty = this.difficulty === 'A' ? 'B' : 'A';
      },
      onStop: () => audio.humStop(),
      onResume: () => audio.humStart(),
      entry: (initials) => ({ initials, score: this.score, level: this.gameNumber, mode: this.mode, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.gameNumber, mode: this.mode, date: '' }),
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

  get spec() {
    return gameSpec(this.gameNumber);
  }

  /** The variation shown in the ranking, e.g. 'JOGO 4 A'. */
  get mode(): string {
    return `JOGO ${this.gameNumber} ${this.difficulty}`;
  }

  get chickenBox(): Box {
    return { x: CHICKEN_X, y: this.chickenY, w: CHICKEN_W, h: CHICKEN_H };
  }

  get flashing(): boolean {
    return this.state === 'playing' && this.timeLeft <= FLASH_TIME;
  }

  // ---------- state transitions ----------

  startGame(): void {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.traffic = new Traffic(this.gameNumber, seed);
    this.chickenY = CHICKEN_START_Y;
    this.score = 0;
    this.crossings = 0;
    this.hits = 0;
    this.timeLeft = MATCH_TIME;
    this.knockT = 0;
    this.lastSecond = -1;
    this.shell.setState('playing');
    this.audio.humStart();
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

    // Clock
    this.timeLeft -= dt;
    const sec = Math.ceil(this.timeLeft);
    if (this.timeLeft <= FLASH_TIME && sec !== this.lastSecond) {
      this.lastSecond = sec;
      this.audio.tick();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.traffic.frozen = true;
      this.shell.endGame();
      return;
    }

    this.traffic.update(dt);

    // Chicken
    if (this.knockT > 0) {
      this.knockT -= dt;
      const k = 1 - Math.max(0, this.knockT) / KNOCK_TIME;
      this.chickenY = this.knockFrom + (this.knockTo - this.knockFrom) * k;
      this.walking = false;
      if (this.knockT <= 0) this.chickenY = this.knockTo;
      return;
    }
    const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
    this.walking = dy !== 0;
    if (this.walking) {
      this.chickenY = Math.max(CHICKEN_GOAL_Y, Math.min(CHICKEN_START_Y, this.chickenY + dy * CHICKEN_SPEED * dt));
      this.walkPhase += dt * 8;
      this.stepTimer += dt;
      if (this.stepTimer >= 0.12) { this.stepTimer = 0; this.audio.step(); }
    }

    // Reached the far curb
    if (this.chickenY <= CHICKEN_GOAL_Y + 0.01) {
      this.score++;
      this.crossings++;
      this.audio.score();
      this.chickenY = CHICKEN_START_Y;
      return;
    }

    // Collisions
    const box = { x: CHICKEN_X + 2, y: this.chickenY + 2, w: CHICKEN_W - 4, h: CHICKEN_H - 4 };
    for (const v of this.traffic.vehicles) {
      if (overlaps(box, v)) { this.hit(v); break; }
    }
  }

  private hit(v: Vehicle): void {
    this.hits++;
    this.audio.hit();
    this.knockT = KNOCK_TIME;
    this.knockFrom = this.chickenY;
    if (this.difficulty === 'A') {
      this.knockTo = CHICKEN_START_Y;
    } else {
      // back one lane: land on the lane below the vehicle's (or the curb)
      const below = v.lane - 1;
      this.knockTo = below >= 1 ? laneTop(below) + (LANE_H - CHICKEN_H) / 2 : CHICKEN_START_Y;
      if (v.lane === 6) this.knockTo = laneTop(5) + (LANE_H - CHICKEN_H) / 2 + 2; // across the median
      this.knockTo = Math.min(CHICKEN_START_Y, Math.max(this.knockTo, ROAD_BOTTOM - 10 * LANE_H));
    }
  }
}

export { W };
