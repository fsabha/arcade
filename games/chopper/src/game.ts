import {
  W, WORLD_W, CHOPPER_W, CHOPPER_SPEED_X, CHOPPER_SPEED_Y, CHOPPER_MIN_Y, CHOPPER_MAX_Y, CHOPPER_SCREEN_LEAD, FIRE_GAP_FAST,
  FIRE_GAP_SLOW, TRUCK_BONUS, START_CHOPPERS, MAX_CHOPPERS, EXTRA_EVERY, DEATH_TIME, WAVE_PAUSE, Level, wrapX, deltaX,
} from './config';
import { Field } from './field';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Phase = 'ready' | 'wave' | 'bonus' | 'dead';
export type Difficulty = 'A' | 'B';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'ready';
  /** the ready phase after losing a chopper waits for a fresh press instead of any held direction */
  afterLoss = false;
  level: Level = 'cadet';
  difficulty: Difficulty = 'B';
  wave = 1;
  score = 0;
  reserve = START_CHOPPERS - 1;
  chopper = { x: 100, y: 90, facing: 1 as 1 | -1, alive: true, moving: false };
  field = new Field(1, 'cadet', 1, 100);
  /** world x shown at the left edge of the screen */
  camera = 0;
  lastBonus = 0;
  private fireCooldown = 0;
  private nextExtra = EXTRA_EVERY;

  time = 0;
  phaseTime = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item) => {
        if (item === 'JOGO') this.level = this.level === 'cadet' ? 'commander' : 'cadet';
        if (item === 'DIFICULDADE') this.difficulty = this.difficulty === 'A' ? 'B' : 'A';
      },
      entry: (initials) => ({ initials, score: this.score, wave: this.wave, mode: this.modeName, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, wave: this.wave, mode: this.modeName, date: '' }),
      onStop: () => this.audio.setRotor(false),
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

  /** 'CADETE B', 'COMANDANTE A'... the variation shown in the ranking */
  get modeName(): string {
    return `${this.level === 'cadet' ? 'CADETE' : 'COMANDANTE'} ${this.difficulty}`;
  }

  // ---------- state ----------

  startGame(): void {
    this.wave = 1;
    this.score = 0;
    this.reserve = START_CHOPPERS - 1;
    this.nextExtra = EXTRA_EVERY;
    this.startWave();
    this.shell.setState('playing');
  }

  private startWave(): void {
    this.chopper = { x: 100, y: 90, facing: 1, alive: true, moving: false };
    this.field = new Field(this.wave, this.level, (this.wave * 7919 + Date.now()) >>> 0, this.chopper.x);
    this.camera = 0;
    this.phase = 'ready';
    this.phaseTime = 0;
    this.afterLoss = false;
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
    const c = this.chopper;

    if (this.phase === 'ready') {
      // "action begins as soon as you move the joystick or push the red button";
      // after losing a chopper the player gets a breather: a fresh press is needed to go on
      const go = this.afterLoss
        ? inp.justPressed('fire') || inp.justPressed('confirm') || inp.justPressed('left') || inp.justPressed('right') || inp.justPressed('up') || inp.justPressed('down')
        : inp.isDown('left') || inp.isDown('right') || inp.isDown('up') || inp.isDown('down') || inp.justPressed('fire');
      if (go) {
        this.phase = 'wave';
        this.phaseTime = 0;
        this.afterLoss = false;
      } else {
        this.audio.setRotor(true);
        return;
      }
    }
    if (this.phase === 'bonus') {
      if (this.phaseTime >= WAVE_PAUSE) { this.wave++; this.startWave(); }
      return;
    }
    if (this.phase === 'dead') {
      if (this.phaseTime >= DEATH_TIME) this.respawn();
      return;
    }

    // flying
    const dx = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
    if (dx !== 0) c.facing = dx as 1 | -1;
    c.x = wrapX(c.x + dx * CHOPPER_SPEED_X * dt);
    c.y = Math.max(CHOPPER_MIN_Y, Math.min(CHOPPER_MAX_Y, c.y + dy * CHOPPER_SPEED_Y * dt));
    c.moving = dx !== 0;
    this.audio.setRotor(true);

    this.fireCooldown -= dt;
    if (inp.isDown('fire') && this.fireCooldown <= 0) {
      this.fireCooldown = this.difficulty === 'B' ? FIRE_GAP_FAST : FIRE_GAP_SLOW;
      this.field.fire(c.x, c.y, c.facing);
      this.audio.shot();
    }

    // the camera keeps the chopper a lead's distance from the edge it faces, scrolling both ways
    const want = c.facing > 0 ? c.x - CHOPPER_SCREEN_LEAD : c.x - (W - CHOPPER_SCREEN_LEAD - CHOPPER_W);
    const d = deltaX(this.camera, want);
    this.camera = wrapX(this.camera + d * Math.min(1, dt * 4));

    const before = this.field.trucksAlive;
    const ev = this.field.update(dt, c);
    if (ev.points) { this.addScore(ev.points); this.audio.hit(); }
    if (ev.truckLost || this.field.trucksAlive < before) this.audio.truck();
    if (ev.chopperHit) { this.die(); return; }

    if (this.field.enemiesAlive === 0) {
      // manual: trucks remaining x wave number x 100
      this.lastBonus = this.field.trucksAlive * Math.min(10, this.wave) * TRUCK_BONUS;
      this.addScore(this.lastBonus);
      this.phase = 'bonus';
      this.phaseTime = 0;
      this.audio.bonus();
    }
  }

  die(): void {
    if (!this.chopper.alive) return;
    this.chopper.alive = false;
    this.phase = 'dead';
    this.phaseTime = 0;
    this.audio.setRotor(false);
    this.audio.crash();
  }

  private respawn(): void {
    if (this.reserve <= 0) { this.endGame(); return; }
    this.reserve--;
    // same wave, same convoy, same enemies left: the chopper comes back on the left
    this.chopper = { x: wrapX(this.camera + 40), y: 90, facing: 1, alive: true, moving: false };
    this.field.missiles = [];
    this.field.bullets = [];
    this.phase = 'ready';
    this.phaseTime = 0;
    this.afterLoss = true;
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextExtra) {
      this.nextExtra += EXTRA_EVERY;
      if (this.reserve < MAX_CHOPPERS - 1) { this.reserve++; this.audio.extraChopper(); }
    }
  }
}

export { WORLD_W };
