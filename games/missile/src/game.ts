import {
  W, GROUND_Y, CITIES, ABMS_PER_WAVE, ABMS_LOADED, MAX_ABMS_FLYING, ABM_SPEED_A, ABM_SPEED_B, CURSOR_SLOW, CURSOR_FAST,
  CURSOR_MIN_Y, CURSOR_MAX_Y, POINTS, BONUS_CITY_EVERY, TALLY_TIME, WAVE_START_TIME, BASE_REARM_TIME, multiplier,
} from './config';
import { Field } from './field';
import { GameSpec, gameSpec, GAME_NUMBERS } from './games';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';
export type Phase = 'start' | 'wave' | 'tally';
export type Difficulty = 'A' | 'B';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export class Game {
  state: State = 'menu';
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
  stateTime = 0;
  phaseTime = 0;
  menuIndex = 0;
  pauseIndex = 0;
  initials = ['A', 'A', 'A'];
  initialsPos = 0;
  qualifiesForRank = false;

  settings: Settings = loadSettings();
  highScores: HighScore[] = loadHighScores();

  constructor(private input: Input, private audio: SoundFx) {
    this.audio.setMuted(!this.settings.sound);
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
    this.setState('playing');
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

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
  }

  toggleCrt(): void {
    this.settings = { ...this.settings, crt: !this.settings.crt };
    saveSettings(this.settings);
  }

  toggleSound(): void {
    this.settings = { ...this.settings, sound: !this.settings.sound };
    saveSettings(this.settings);
    this.audio.setMuted(!this.settings.sound);
  }

  private endGame(): void {
    this.highScores = loadHighScores();
    this.qualifiesForRank = qualifies(this.highScores, this.score);
    this.audio.gameOver();
    this.setState('gameover');
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    this.stateTime += dt;
    const inp = this.input;
    if (inp.justPressed('mute')) this.toggleSound();
    if (inp.justPressed('crt')) this.toggleCrt();
    switch (this.state) {
      case 'menu': this.updateMenu(); break;
      case 'howto':
      case 'ranking':
        if (inp.justPressed('confirm') || inp.justPressed('fire') || inp.justPressed('back') || inp.justPressed('pause')) {
          this.audio.blip();
          this.setState('menu');
        }
        break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused': this.updatePaused(); break;
      case 'gameover': this.updateGameOver(); break;
      case 'initials': this.updateInitials(); break;
    }
  }

  private cycleGame(d: number): void {
    const i = GAME_NUMBERS.indexOf(this.gameNumber);
    this.gameNumber = GAME_NUMBERS[(i + d + GAME_NUMBERS.length) % GAME_NUMBERS.length];
    this.spec = gameSpec(this.gameNumber);
  }

  private updateMenu(): void {
    const inp = this.input;
    const n = MENU_ITEMS.length;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; this.audio.blip(); }
    const item = MENU_ITEMS[this.menuIndex];
    const side = (inp.justPressed('right') ? 1 : 0) - (inp.justPressed('left') ? 1 : 0);
    if (side !== 0) {
      if (item === 'JOGO') { this.cycleGame(side); this.audio.blip(); }
      if (item === 'DIFICULDADE') { this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; this.audio.blip(); }
    }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (item) {
        case 'JOGAR': this.startGame(); break;
        case 'JOGO': this.cycleGame(1); break;
        case 'DIFICULDADE': this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; break;
        case 'COMO JOGAR': this.setState('howto'); break;
        case 'RANKING': this.highScores = loadHighScores(); this.setState('ranking'); break;
        case 'CRT': this.toggleCrt(); break;
        case 'SOM': this.toggleSound(); break;
      }
    }
  }

  private updatePaused(): void {
    const inp = this.input;
    const n = PAUSE_ITEMS.length;
    if (inp.justPressed('up')) { this.pauseIndex = (this.pauseIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.pauseIndex = (this.pauseIndex + 1) % n; this.audio.blip(); }
    if (inp.justPressed('pause')) { this.setState('playing'); return; }
    if (inp.justPressed('back')) { this.setState('menu'); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.setState('playing');
      else this.setState('menu');
    }
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.setState('paused');
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

  private updateGameOver(): void {
    const inp = this.input;
    if (this.stateTime < 2) return;
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      if (this.qualifiesForRank) {
        this.initials = ['A', 'A', 'A'];
        this.initialsPos = 0;
        this.setState('initials');
      } else {
        this.setState('menu');
      }
    }
  }

  private updateInitials(): void {
    const inp = this.input;
    const i = this.initialsPos;
    const cur = LETTERS.indexOf(this.initials[i]);
    if (inp.justPressed('up')) { this.initials[i] = LETTERS[(cur + 1) % LETTERS.length]; this.audio.blip(); }
    if (inp.justPressed('down')) { this.initials[i] = LETTERS[(cur + LETTERS.length - 1) % LETTERS.length]; this.audio.blip(); }
    if (inp.justPressed('left') || inp.justPressed('back')) { this.initialsPos = Math.max(0, i - 1); this.audio.blip(); }
    if (inp.justPressed('right')) { this.initialsPos = Math.min(2, i + 1); this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      if (i < 2) {
        this.initialsPos = i + 1;
      } else {
        const entry: HighScore = { initials: this.initials.join(''), score: this.score, wave: this.wave, date: new Date().toISOString() };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}

export { GROUND_Y };
