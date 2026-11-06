import {
  PX, GROUND_Y, TUNNEL_Y, HARRY_W, HARRY_H, RUN_SPEED, JUMP_TIME, JUMP_PEAK, FALL_SPEED, CLIMB_SPEED, DROP_SPEED,
  X_MIN, X_MAX, RESPAWN_X, LOG_SPEED, LOG_W, LOG_DRAIN, SCORPION_SPEED, LADDER_X, LADDER_GRAB, WALL_LEFT_X,
  WALL_RIGHT_X, WALL_W, VINE_ANCHOR_X, VINE_ANCHOR_Y, VINE_LEN, VINE_MAX_ANGLE, VINE_PERIOD, TREASURE_X,
  START_SCORE, START_LIVES, GAME_TIME, FALL_PENALTY, TREASURE_VALUES, TOTAL_TREASURES, DEATH_TIME, START_ROOM,
  JUNGLE_TOP,
} from './config';
import { Room, decodeRoom, nextRoom, prevRoom, groundAt } from './world';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Mode = 'ground' | 'jump' | 'fall' | 'sink' | 'climb' | 'swing' | 'drop' | 'kneel' | 'dying';
export type EndReason = 'lives' | 'time' | 'finished';

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface Harry {
  x: number; // left edge, px
  feet: number; // y of the feet
  facing: 1 | -1;
  mode: Mode;
  under: boolean; // in the tunnel
  t: number; // time in current mode
  vx: number; // horizontal speed during a jump
  jumpLen: number;
  running: boolean;
  runPhase: number;
}

export interface LogState {
  x: number;
  rolling: boolean;
}

export class Game {
  shell: Shell<HighScore, Settings>;
  room: Room = decodeRoom(START_ROOM);
  harry: Harry = this.newHarry();
  logs: LogState[] = [];
  scorpionX = 152;
  score = START_SCORE;
  lives = START_LIVES;
  timeLeft = GAME_TIME;
  started = false; // timer runs after the first move
  collected = new Set<number>(); // room values whose treasure was taken
  endReason: EndReason = 'lives';
  roomsVisited = 1;
  deaths = 0;

  time = 0;
  roomTime = 0;
  private vineCooldown = 0;
  private lastTick = -1;
  private drain = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio: {
        blip: () => audio.blip(),
        setMuted: (m) => audio.setMuted(m),
        // finding every treasure gets the fanfare instead of the game over jingle
        gameOver: () => (this.endReason === 'finished' ? audio.finished() : audio.gameOver()),
      },
      onStart: () => this.startGame(),
      remote: { game: 'pitfall', label: (e) => `${e.level} TESOUROS` },
      entry: (initials) => ({ initials, score: this.score, level: this.treasures, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.treasures, date: '' }),
      onStop: () => audio.musicStop(),
      onResume: () => audio.musicStart(),
      onMusic: (on) => audio.setMusicEnabled(on),
    });
    this.audio.setMusicEnabled(this.shell.settings.music);
    this.enterRoom(START_ROOM);
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

  private newHarry(): Harry {
    return { x: RESPAWN_X, feet: GROUND_Y, facing: 1, mode: 'ground', under: false, t: 0, vx: 0, jumpLen: JUMP_TIME, running: false, runPhase: 0 };
  }

  get treasures(): number {
    return this.collected.size;
  }

  get harryBox(): Box {
    return { x: this.harry.x, y: this.harry.feet - HARRY_H, w: HARRY_W, h: HARRY_H };
  }

  /** Narrow box used against hazards (fire, snake, scorpion, treasure). */
  get hitBox(): Box {
    return { x: this.harry.x + 5, y: this.harry.feet - HARRY_H + 2, w: 6, h: HARRY_H - 2 };
  }

  get vineAngle(): number {
    return VINE_MAX_ANGLE * Math.sin((2 * Math.PI * this.time) / VINE_PERIOD);
  }

  get vineTip(): { x: number; y: number } {
    const a = this.vineAngle;
    return { x: VINE_ANCHOR_X + Math.sin(a) * VINE_LEN, y: VINE_ANCHOR_Y + Math.cos(a) * VINE_LEN };
  }

  get treasureHere(): number | null {
    if (this.room.treasure === null || this.collected.has(this.room.value)) return null;
    return this.room.treasure;
  }

  get wallX(): number | null {
    if (!this.room.hasLadder) return null;
    return this.room.wallRight ? WALL_RIGHT_X : WALL_LEFT_X;
  }

  // ---------- state transitions ----------

  startGame(): void {
    this.score = START_SCORE;
    this.lives = START_LIVES;
    this.timeLeft = GAME_TIME;
    this.started = false;
    this.collected = new Set();
    this.roomsVisited = 1;
    this.deaths = 0;
    this.harry = this.newHarry();
    this.enterRoom(START_ROOM);
    this.lastTick = -1;
    this.shell.setState('playing');
    this.audio.musicStart();
  }

  enterRoom(value: number): void {
    this.room = decodeRoom(value);
    this.roomTime = 0;
    this.logs = this.room.objects.filter((o) => o.kind === 'log').map((o) => ({ x: o.x, rolling: o.rolling }));
    this.scorpionX = 152;
  }

  private endGame(reason: EndReason): void {
    this.endReason = reason;
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
    this.roomTime += dt;
    if (this.vineCooldown > 0) this.vineCooldown -= dt;

    // Timer runs once the player moves.
    if (!this.started && (inp.isDown('left') || inp.isDown('right') || inp.isDown('up') || inp.isDown('down') || inp.justPressed('fire'))) {
      this.started = true;
    }
    if (this.started && this.harry.mode !== 'dying') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      const sec = Math.ceil(this.timeLeft);
      if (this.timeLeft <= 10 && sec !== this.lastTick) { this.lastTick = sec; this.audio.tick(); }
      if (this.timeLeft <= 0) { this.endGame('time'); return; }
    }

    this.updateLogs(dt);
    this.updateHarry(dt);
  }

  private updateLogs(dt: number): void {
    for (const l of this.logs) {
      if (!l.rolling) continue;
      l.x -= LOG_SPEED * dt;
      if (l.x < -LOG_W) l.x += 320 + LOG_W;
    }
    if (this.harry.under && !this.room.hasLadder && this.harry.mode !== 'dying') {
      const hc = this.harry.x + HARRY_W / 2;
      const sc = this.scorpionX + 8;
      if (Math.abs(hc - sc) > 1) this.scorpionX += Math.sign(hc - sc) * SCORPION_SPEED * dt;
    }
  }

  private updateHarry(dt: number): void {
    const h = this.harry;
    const inp = this.input;
    h.t += dt;
    const dir = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);

    switch (h.mode) {
      case 'ground': {
        h.running = dir !== 0;
        if (dir !== 0) {
          h.facing = dir as 1 | -1;
          h.x += dir * RUN_SPEED * dt;
          h.runPhase += dt * 10;
        }
        if (inp.justPressed('fire')) {
          this.startJump(dir * RUN_SPEED, JUMP_TIME);
          break;
        }
        if (!h.under && this.room.hasLadder && inp.isDown('down') && Math.abs(h.x - (LADDER_X - 4)) <= LADDER_GRAB) {
          this.startClimb();
          break;
        }
        if (h.under && this.room.hasLadder && inp.isDown('up') && Math.abs(h.x - (LADDER_X - 4)) <= LADDER_GRAB) {
          this.startClimb();
          break;
        }
        this.walls();
        this.edges();
        if (!h.under) this.checkGround();
        break;
      }
      case 'jump': {
        h.x += h.vx * dt;
        const base = h.under ? TUNNEL_Y : GROUND_Y;
        h.feet = base - JUMP_PEAK * Math.sin(Math.PI * Math.min(1, h.t / h.jumpLen));
        this.walls();
        this.edges();
        if (!h.under && this.room.hasVine && this.vineCooldown <= 0) this.tryGrabVine();
        if (h.mode === 'jump' && h.t >= h.jumpLen) {
          h.feet = base;
          h.mode = 'ground';
          h.t = 0;
          if (!h.under) this.checkGround();
        }
        break;
      }
      case 'fall': {
        h.feet += FALL_SPEED * dt;
        if (h.feet >= TUNNEL_Y) {
          h.feet = TUNNEL_Y;
          h.under = true;
          h.mode = 'ground';
          h.t = 0;
          this.scorpionX = 152;
        }
        break;
      }
      case 'sink': {
        h.feet += 18 * dt;
        if (h.t >= 0.5) this.die();
        break;
      }
      case 'climb': {
        const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
        if (dy !== 0) {
          h.feet += dy * CLIMB_SPEED * dt;
          h.runPhase += dt * 6;
          if (h.feet <= GROUND_Y) {
            h.feet = GROUND_Y;
            h.under = false;
            h.mode = 'ground';
            h.t = 0;
            h.x = LADDER_X - 4 - 8; // stand on the ladder top, left of the hole
          } else if (h.feet >= TUNNEL_Y) {
            h.feet = TUNNEL_Y;
            h.under = true;
            h.mode = 'ground';
            h.t = 0;
            this.scorpionX = 152;
          }
        }
        break;
      }
      case 'swing': {
        const tip = this.vineTip;
        h.x = tip.x - HARRY_W / 2;
        h.feet = tip.y + HARRY_H - 4;
        h.facing = this.vineVelocity() >= 0 ? 1 : -1;
        if (inp.justPressed('down') || inp.justPressed('fire')) {
          this.vineCooldown = 0.4;
          this.startJump(this.vineVelocity(), JUMP_TIME / 2);
          this.audio.jump();
        }
        break;
      }
      case 'drop': {
        h.feet += DROP_SPEED * dt;
        if (h.feet >= GROUND_Y) {
          h.feet = GROUND_Y;
          h.mode = 'ground';
          h.t = 0;
        }
        break;
      }
      case 'kneel': {
        if (!this.touchingLog(true)) { h.mode = 'ground'; h.t = 0; }
        break;
      }
      case 'dying': {
        if (h.t >= DEATH_TIME) this.respawn();
        return;
      }
    }

    if (h.mode === 'ground' || h.mode === 'kneel' || h.mode === 'jump') this.checkHazards(dt);
  }

  private vineVelocity(): number {
    // d/dt of VINE_LEN * sin(angle)
    const w = (2 * Math.PI) / VINE_PERIOD;
    const a = this.vineAngle;
    const da = VINE_MAX_ANGLE * w * Math.cos((2 * Math.PI * this.time) / VINE_PERIOD);
    return VINE_LEN * Math.cos(a) * da;
  }

  private startJump(vx: number, len: number): void {
    const h = this.harry;
    h.mode = 'jump';
    h.t = 0;
    h.vx = vx;
    h.jumpLen = len;
    h.running = false;
    this.audio.jump();
  }

  private startClimb(): void {
    const h = this.harry;
    h.mode = 'climb';
    h.t = 0;
    h.running = false;
    h.x = LADDER_X - 4;
  }

  private tryGrabVine(): void {
    const tip = this.vineTip;
    const h = this.harry;
    const hands = { x: h.x + 4, y: h.feet - HARRY_H, w: 8, h: 10 };
    const t = { x: tip.x - 4, y: tip.y - 4, w: 8, h: 8 };
    if (overlaps(hands, t)) {
      h.mode = 'swing';
      h.t = 0;
      this.audio.yell();
    }
  }

  private walls(): void {
    const h = this.harry;
    if (!h.under) return;
    const wx = this.wallX;
    if (wx === null) return;
    const box = { x: h.x + 2, w: HARRY_W - 4 };
    if (box.x < wx + WALL_W && box.x + box.w > wx) {
      const hc = h.x + HARRY_W / 2;
      if (hc < wx + WALL_W / 2) h.x = wx - HARRY_W + 2;
      else h.x = wx + WALL_W - 2;
    }
  }

  private edges(): void {
    const h = this.harry;
    const steps = h.under ? 3 : 1;
    if (h.x < X_MIN) {
      let v = this.room.value;
      for (let i = 0; i < steps; i++) v = prevRoom(v);
      this.enterRoom(v);
      this.roomsVisited++;
      h.x = X_MAX;
    } else if (h.x > X_MAX) {
      let v = this.room.value;
      for (let i = 0; i < steps; i++) v = nextRoom(v);
      this.enterRoom(v);
      this.roomsVisited++;
      h.x = X_MIN;
    }
    this.walls();
  }

  /** Harry is on the surface at ground level: hole, pit or crocodile? Checked under the centre of his feet. */
  private checkGround(): void {
    const h = this.harry;
    const g = groundAt(this.room, (h.x + HARRY_W / 2) / PX, this.roomTime);
    if (g === 'hole') {
      h.mode = 'fall';
      h.t = 0;
      h.running = false;
      this.score = Math.max(0, this.score - FALL_PENALTY);
      this.audio.fall();
    } else if (g === 'deadly') {
      h.mode = 'sink';
      h.t = 0;
      h.running = false;
      this.audio.sink();
    }
  }

  private touchingLog(rollingOnly: boolean): boolean {
    const h = this.harry;
    const a = h.x + 4;
    const b = h.x + HARRY_W - 4;
    return this.logs.some((l) => (!rollingOnly || l.rolling) && a < l.x + LOG_W && b > l.x);
  }

  private checkHazards(dt: number): void {
    const h = this.harry;
    const box = this.hitBox;
    if (!h.under) {
      // logs only hurt on the ground
      if (h.mode !== 'jump' && this.touchingLog(false)) {
        this.drain += LOG_DRAIN * dt;
        const pts = Math.floor(this.drain);
        if (pts > 0) { this.drain -= pts; this.score = Math.max(0, this.score - pts); }
        if (h.mode === 'ground' && this.touchingLog(true)) { h.mode = 'kneel'; h.t = 0; h.running = false; this.audio.hitLog(); }
      }
      for (const o of this.room.objects) {
        if (o.kind === 'log') continue;
        const ob = o.kind === 'fire' ? { x: o.x + 3, y: GROUND_Y - 8, w: 10, h: 8 } : { x: o.x + 2, y: GROUND_Y - 6, w: 12, h: 6 };
        if (overlaps(box, ob)) { this.die(); return; }
      }
      const tr = this.treasureHere;
      if (tr !== null && overlaps(box, { x: TREASURE_X, y: GROUND_Y - 12, w: 16, h: 12 })) {
        this.collected.add(this.room.value);
        this.score += TREASURE_VALUES[tr];
        this.audio.treasure();
        if (this.collected.size >= TOTAL_TREASURES) this.endGame('finished');
      }
    } else if (!this.room.hasLadder) {
      if (overlaps(box, { x: this.scorpionX + 2, y: TUNNEL_Y - 6, w: 12, h: 6 })) this.die();
    }
  }

  die(): void {
    const h = this.harry;
    if (h.mode === 'dying') return;
    h.mode = 'dying';
    h.t = 0;
    h.running = false;
    this.deaths++;
    this.audio.die();
  }

  private respawn(): void {
    this.lives--;
    if (this.lives <= 0) { this.endGame('lives'); return; }
    const h = this.harry;
    h.x = RESPAWN_X;
    h.facing = 1;
    h.running = false;
    h.t = 0;
    h.vx = 0;
    if (h.under) {
      h.feet = TUNNEL_Y;
      h.mode = 'ground';
      this.scorpionX = 152;
    } else {
      h.feet = JUNGLE_TOP + HARRY_H;
      h.mode = 'drop';
    }
  }
}
