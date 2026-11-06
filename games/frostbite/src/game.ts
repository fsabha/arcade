import {
  W, SHORE_Y, ROW_FEET, ROWS, BAILEY_W, BAILEY_SPEED, AIR_STEER, JUMP_TIME, LAND_TOLERANCE, IGLOO_BLOCKS, IGLOO_DOOR_X,
  TEMP_START, TEMP_RATE, START_RESERVE, MAX_RESERVE, EXTRA_LIFE_EVERY, DEATH_TIME, ENTER_TIME, BEAR_LEVEL, BEAR_SPEED,
  BEAR_SAFE_X, BEAR_W, blockPoints, iglooPoints, degreeBonus,
} from './config';
import { Sea, mod } from './sea';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Mode = 'stand' | 'jump' | 'splash' | 'freeze' | 'chased' | 'enter';
export type Variation = 'regular' | 'advanced';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export interface Bailey {
  x: number; // left edge
  feet: number;
  row: number; // -1 = shore, 0..3 = floe rows
  facing: 1 | -1;
  mode: Mode;
  t: number;
  fromRow: number;
  toRow: number;
  fromFeet: number;
  toFeet: number;
  walking: boolean;
  phase: number;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  variation: Variation = 'regular';
  level = 1;
  sea = new Sea(1, 1);
  bailey: Bailey = this.newBailey();
  score = 0;
  reserve = START_RESERVE;
  temperature = TEMP_START;
  blocks = 0;
  iglooDone = false;
  bearX = W - BEAR_W - 8;
  bearDir: 1 | -1 = -1;
  bearActive = false;
  igloosBuilt = 0;
  lastBonus = 0;
  private tempAcc = 0;
  private nextLife = EXTRA_LIFE_EVERY;

  time = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item) => { if (item === 'JOGO') this.variation = this.variation === 'regular' ? 'advanced' : 'regular'; },
      remote: { game: 'frostbite', label: (e) => `NIVEL ${e.level} ${e.mode}` },
      entry: (initials) => ({ initials, score: this.score, level: this.level, mode: this.variation === 'advanced' ? 'AVANCADO' : 'NORMAL', date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.level, mode: '', date: '' }),
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

  private newBailey(): Bailey {
    return { x: 40, feet: SHORE_Y, row: -1, facing: 1, mode: 'stand', t: 0, fromRow: -1, toRow: -1, fromFeet: SHORE_Y, toFeet: SHORE_Y, walking: false, phase: 0 };
  }

  get feetFor(): (row: number) => number {
    return (row) => (row < 0 ? SHORE_Y : ROW_FEET[row]);
  }

  get onShore(): boolean {
    return this.bailey.row < 0;
  }

  get hasBear(): boolean {
    return this.level >= BEAR_LEVEL;
  }

  // ---------- state ----------

  startGame(): void {
    this.level = this.variation === 'advanced' ? 5 : 1;
    this.score = 0;
    this.reserve = START_RESERVE;
    this.nextLife = EXTRA_LIFE_EVERY;
    this.igloosBuilt = 0;
    this.startLevel();
    this.shell.setState('playing');
  }

  private startLevel(): void {
    this.sea = new Sea(this.level, (this.level * 7919 + Date.now()) >>> 0);
    this.bailey = this.newBailey();
    this.temperature = TEMP_START;
    this.tempAcc = 0;
    this.blocks = 0;
    this.iglooDone = false;
    this.bearX = W - BEAR_W - 8;
    this.bearDir = -1;
    this.bearActive = this.hasBear;
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
    const b = this.bailey;
    b.t += dt;

    if (b.mode === 'enter') {
      if (b.t >= ENTER_TIME) {
        this.level++;
        this.startLevel();
      }
      return;
    }
    if (b.mode === 'splash' || b.mode === 'freeze') {
      if (b.mode === 'splash') b.feet += 14 * dt;
      if (b.t >= DEATH_TIME) this.respawn();
      return;
    }

    this.sea.update(dt);

    // temperature
    this.tempAcc += dt * TEMP_RATE;
    while (this.tempAcc >= 1) {
      this.tempAcc -= 1;
      this.temperature--;
      if (this.temperature <= 10 && this.temperature > 0) this.audio.cold();
      if (this.temperature <= 0) {
        this.temperature = 0;
        this.die('freeze');
        return;
      }
    }

    if (b.mode === 'chased') {
      b.x -= BEAR_SPEED * 2.2 * dt;
      b.facing = 1;
      if (b.x < -BAILEY_W) { this.die('splash'); b.feet = SHORE_Y; }
      this.updateBear(dt);
      return;
    }

    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    if (b.mode === 'stand') {
      b.walking = dir !== 0;
      if (dir !== 0) {
        b.facing = dir as 1 | -1;
        b.x += dir * BAILEY_SPEED * dt;
        b.phase += dt * 10;
      }
      if (b.row >= 0) {
        // carried by the floe
        const row = this.sea.rows[b.row];
        b.x = mod(b.x + row.dir * this.sea.speed * dt, W);
        if (inp.justPressed('fire')) {
          this.sea.reverse(b.row);
          if (!this.iglooDone && this.blocks > 0) this.blocks--;
          this.audio.reverse();
        }
      } else {
        b.x = Math.max(0, Math.min(W - BAILEY_W, b.x));
      }
      if (inp.justPressed('up') && b.row >= 0) this.startJump(b.row - 1);
      else if (inp.justPressed('down') && b.row < ROWS - 1) this.startJump(b.row + 1);

      if (b.mode === 'stand') {
        if (b.row >= 0) this.rideHazards(dt);
        else this.shore();
      }
    } else if (b.mode === 'jump') {
      if (dir !== 0) { b.facing = dir as 1 | -1; b.x = mod(b.x + dir * AIR_STEER * dt, W); }
      const k = Math.min(1, b.t / JUMP_TIME);
      b.feet = b.fromFeet + (b.toFeet - b.fromFeet) * k;
      if (k >= 1) this.land();
    }
    this.updateBear(dt);
  }

  private startJump(toRow: number): void {
    const b = this.bailey;
    b.mode = 'jump';
    b.t = 0;
    b.fromRow = b.row;
    b.toRow = toRow;
    b.fromFeet = this.feetFor(b.row);
    b.toFeet = this.feetFor(toRow);
    b.walking = false;
    this.audio.jump();
  }

  private land(): void {
    const b = this.bailey;
    b.row = b.toRow;
    b.feet = b.toFeet;
    b.mode = 'stand';
    b.t = 0;
    if (b.row < 0) {
      b.x = Math.max(0, Math.min(W - BAILEY_W, b.x));
      return;
    }
    if (!this.sea.hasIce(b.row, b.x + LAND_TOLERANCE, b.x + BAILEY_W - LAND_TOLERANCE)) {
      this.die('splash');
      return;
    }
    const row = this.sea.rows[b.row];
    if (row.white) {
      row.white = false;
      if (!this.iglooDone) {
        this.blocks++;
        this.addScore(blockPoints(this.level));
        this.audio.block();
        if (this.blocks >= IGLOO_BLOCKS) this.iglooDone = true;
      }
      if (this.sea.allBlue) this.sea.resetWhite();
    }
  }

  /** Standing on a floe: creatures push, fish feed. */
  private rideHazards(dt: number): void {
    const b = this.bailey;
    const i = this.sea.creatureAt(b.row, b.x + 2, b.x + BAILEY_W - 2);
    if (i < 0) return;
    const g = this.sea.rows[b.row].group!;
    if (g.kind === 'fish') {
      this.addScore(this.sea.eatFish(b.row, i));
      this.audio.fish();
      return;
    }
    b.x = mod(b.x + g.dir * g.speed * dt, W);
    if (!this.sea.hasIce(b.row, b.x + LAND_TOLERANCE, b.x + BAILEY_W - LAND_TOLERANCE)) this.die('splash');
  }

  /** Standing on the shore: the igloo door and the bear. */
  private shore(): void {
    const b = this.bailey;
    if (this.iglooDone && Math.abs(b.x + BAILEY_W / 2 - IGLOO_DOOR_X) <= 8) {
      this.enterIgloo();
      return;
    }
    if (this.bearActive && b.x >= BEAR_SAFE_X && b.x < this.bearX + BEAR_W - 4 && b.x + BAILEY_W > this.bearX + 4) {
      b.mode = 'chased';
      b.t = 0;
      this.audio.bear();
    }
  }

  private updateBear(dt: number): void {
    if (!this.bearActive) return;
    const b = this.bailey;
    const minX = BEAR_SAFE_X + 8;
    const maxX = W - BEAR_W;
    // the bear wanders the shore and heads for Bailey when he is up there
    if (b.row < 0 && b.mode !== 'chased') this.bearDir = b.x + BAILEY_W / 2 < this.bearX + BEAR_W / 2 ? -1 : 1;
    this.bearX += this.bearDir * BEAR_SPEED * dt;
    if (this.bearX <= minX) { this.bearX = minX; this.bearDir = 1; }
    if (this.bearX >= maxX) { this.bearX = maxX; this.bearDir = -1; }
  }

  private enterIgloo(): void {
    const b = this.bailey;
    b.mode = 'enter';
    b.t = 0;
    const bonus = iglooPoints(this.level) + degreeBonus(this.level, this.temperature);
    this.lastBonus = bonus;
    this.addScore(bonus);
    this.igloosBuilt++;
    this.audio.igloo();
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextLife) {
      this.nextLife += EXTRA_LIFE_EVERY;
      if (this.reserve < MAX_RESERVE) { this.reserve++; this.audio.extraLife(); }
    }
  }

  die(how: 'splash' | 'freeze'): void {
    const b = this.bailey;
    if (b.mode === 'splash' || b.mode === 'freeze') return;
    b.mode = how;
    b.t = 0;
    b.walking = false;
    if (how === 'splash') this.audio.splash();
    else this.audio.freeze();
  }

  private respawn(): void {
    if (this.reserve <= 0) { this.endGame(); return; }
    this.reserve--;
    this.bailey = this.newBailey();
    this.temperature = TEMP_START;
    this.tempAcc = 0;
    this.bearX = W - BEAR_W - 8;
  }

}
