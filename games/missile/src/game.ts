import {
  W, GROUND_Y, CITIES, ABMS_PER_WAVE, ABMS_LOADED, MAX_ABMS_FLYING, ABM_SPEED_A, ABM_SPEED_B, CURSOR_SLOW, CURSOR_FAST,
  CURSOR_MIN_Y, CURSOR_MAX_Y, POINTS, BONUS_CITY_EVERY, TALLY_TIME, WAVE_START_TIME, BASE_REARM_TIME, multiplier,
} from './config';
import { Field } from './field';
import { GameSpec, gameSpec, GAME_NUMBERS } from './games';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Phase = 'start' | 'wave' | 'tally';
export type Difficulty = 'A' | 'B';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'start';
  gameNumber = 1;
  spec: GameSpec = gameSpec(1);
  difficulty: Difficulty = 'B';
  wave = 1;
  score = 0;
  cities: boolean[] = Array(CITIES).fill(true);
  field = new Field(1, false, false, 1);
  cursor = { x: W / 2, y: 110 };
  /** ABMs left this wave (30): the base holds 10, the dump the rest. */
  abms = ABMS_PER_WAVE;
  baseDown = 0;
  bonusCities = 0;
  bonusUsedThisWave = 0;
  /** tally animation */
  tallyAbms = 0;
  tallyCities = 0;
  private tallyAcc = 0;
  private nextBonus = BONUS_CITY_EVERY;
  private alarmT = 0;

  time = 0;
  phaseTime = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item, delta) => {
        if (item === 'JOGO') this.cycleGame(delta || 1);
        if (item === 'DIFICULDADE') this.difficulty = this.difficulty === 'A' ? 'B' : 'A';
      },
      entry: (initials) => ({ initials, score: this.score, wave: this.wave, mode: this.mode, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, wave: this.wave, mode: this.mode, date: '' }),
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

  /** The variation shown in the ranking, e.g. 'J17 B'. */
  get mode(): string {
    return `J${this.gameNumber} ${this.difficulty}`;
  }

  get loaded(): number {
    if (this.abms <= 0) return 0;
    const r = this.abms % ABMS_LOADED;
    return r === 0 ? ABMS_LOADED : r;
  }

  get dump(): number {
    return this.abms - this.loaded;
  }

  get multiplier(): number {
    return multiplier(this.wave);
  }

  get citiesAlive(): number {
    return this.cities.filter(Boolean).length;
  }

  // ---------- state ----------

  startGame(): void {
    this.spec = gameSpec(this.gameNumber);
    this.wave = this.spec.firstWave;
    this.score = 0;
    this.cities = Array(CITIES).fill(true);
    this.bonusCities = 0;
    this.nextBonus = BONUS_CITY_EVERY;
    this.startWave();
    this.shell.setState('playing');
  }

  private startWave(): void {
    this.field = new Field(this.wave, this.spec.children, this.spec.smartCruise, (this.wave * 7919 + Date.now()) >>> 0);
    this.abms = ABMS_PER_WAVE;
    this.baseDown = 0;
    this.bonusUsedThisWave = 0;
    this.cursor = { x: W / 2, y: 110 };
    this.phase = 'start';
    this.phaseTime = 0;
    this.audio.waveStart();
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

  private cycleGame(d: number): void {
    const i = GAME_NUMBERS.indexOf(this.gameNumber);
    this.gameNumber = GAME_NUMBERS[(i + d + GAME_NUMBERS.length) % GAME_NUMBERS.length];
    this.spec = gameSpec(this.gameNumber);
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    this.phaseTime += dt;
    switch (this.phase) {
      case 'start':
        if (this.phaseTime >= WAVE_START_TIME) { this.phase = 'wave'; this.phaseTime = 0; }
        break;
      case 'wave': this.updateWave(dt); break;
      case 'tally': this.updateTally(dt); break;
    }
  }

  private moveCursor(dt: number): void {
    const inp = this.input;
    const v = this.spec.fastCursor ? CURSOR_FAST : CURSOR_SLOW;
    const dx = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    const dy = (inp.isDown('down') ? 1 : 0) - (inp.isDown('up') ? 1 : 0);
    this.cursor.x = Math.max(4, Math.min(W - 4, this.cursor.x + dx * v * dt));
    this.cursor.y = Math.max(CURSOR_MIN_Y, Math.min(CURSOR_MAX_Y, this.cursor.y + dy * v * dt));
  }

  /** Fires an ABM at the cursor if the base can. */
  fire(): boolean {
    if (this.state !== 'playing' || this.phase !== 'wave') return false;
    if (this.abms <= 0 || this.baseDown > 0 || this.field.abmsFlying >= MAX_ABMS_FLYING) return false;
    this.field.fire(this.cursor.x, this.cursor.y, this.difficulty === 'A' ? ABM_SPEED_A : ABM_SPEED_B);
    this.abms--;
    this.audio.launch();
    return true;
  }

  /** Touch/mouse: move the cursor there and fire. */
  tap(x: number, y: number): void {
    if (this.state !== 'playing' || this.phase !== 'wave') return;
    this.cursor.x = Math.max(4, Math.min(W - 4, x));
    this.cursor.y = Math.max(CURSOR_MIN_Y, Math.min(CURSOR_MAX_Y, y));
    this.fire();
  }

  private updateWave(dt: number): void {
    this.moveCursor(dt);
    if (this.input.justPressed('fire')) this.fire();
    this.baseDown = Math.max(0, this.baseDown - dt);

    const ev = this.field.update(dt, this.cities);
    if (ev.icbmKilled) { this.addScore(ev.icbmKilled * POINTS.icbm * this.multiplier); this.audio.hit(); }
    if (ev.cruiseKilled) { this.addScore(ev.cruiseKilled * POINTS.cruise * this.multiplier); this.audio.hit(); }
    for (const c of ev.cityHit) {
      if (this.cities[c]) { this.cities[c] = false; this.audio.cityLost(); }
    }
    if (ev.baseHit) {
      // the loaded ABMs are destroyed; the dump survives
      this.abms = this.dump;
      this.baseDown = BASE_REARM_TIME;
      this.audio.cityLost();
    }
    this.alarmT -= dt;
    if (this.alarmT <= 0 && this.field.icbms.length > 0) { this.alarmT = 0.5; this.audio.alarm(); }

    if (this.citiesAlive === 0 && this.field.enemiesLeft > 0) this.field.abort();
    if (this.field.done) {
      this.phase = 'tally';
      this.phaseTime = 0;
      this.tallyAbms = 0;
      this.tallyCities = 0;
      this.tallyAcc = 0;
    }
  }

  private updateTally(dt: number): void {
    // count the unused ABMs first, then the saved cities, like the cartridge
    this.tallyAcc += dt;
    const tick = 0.06;
    while (this.tallyAcc >= tick) {
      this.tallyAcc -= tick;
      if (this.tallyAbms < this.abms) {
        this.tallyAbms++;
        this.addScore(POINTS.abm * this.multiplier);
        this.audio.tally();
      } else if (this.tallyCities < this.citiesAlive) {
        this.tallyCities++;
        this.addScore(POINTS.city * this.multiplier);
        this.audio.tally();
      }
    }
    const counted = this.tallyAbms >= this.abms && this.tallyCities >= this.citiesAlive;
    if (!counted || this.phaseTime < TALLY_TIME) return;

    // bonus cities rebuild ruins
    while (this.bonusCities > 0) {
      const dead = this.cities.indexOf(false);
      if (dead < 0) break;
      this.cities[dead] = true;
      this.bonusCities--;
      this.bonusUsedThisWave++;
      this.audio.bonusCity();
    }
    if (this.citiesAlive === 0) { this.endGame(); return; }
    this.wave++;
    this.startWave();
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextBonus) {
      this.nextBonus += BONUS_CITY_EVERY;
      this.bonusCities++;
    }
  }
}

export { GROUND_Y };
