import {
  W, WORLD_W, CHOPPER_W, CHOPPER_SPEED_X, CHOPPER_SPEED_Y, CHOPPER_MIN_Y, CHOPPER_MAX_Y, CHOPPER_SCREEN_LEAD, FIRE_GAP_FAST,
  FIRE_GAP_SLOW, TRUCK_BONUS, START_CHOPPERS, MAX_CHOPPERS, EXTRA_EVERY, DEATH_TIME, WAVE_PAUSE, Level, wrapX, deltaX,
} from './config';
import { Field } from './field';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';
export type Phase = 'ready' | 'wave' | 'bonus' | 'dead';
export type Difficulty = 'A' | 'B';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export class Game {
  state: State = 'menu';
  phase: Phase = 'ready';
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

  // ---------- state ----------

  startGame(): void {
    this.wave = 1;
    this.score = 0;
    this.reserve = START_CHOPPERS - 1;
    this.nextExtra = EXTRA_EVERY;
    this.startWave();
    this.setState('playing');
  }

  private startWave(): void {
    this.chopper = { x: 100, y: 90, facing: 1, alive: true, moving: false };
    this.field = new Field(this.wave, this.level, (this.wave * 7919 + Date.now()) >>> 0, this.chopper.x);
    this.camera = 0;
    this.phase = 'ready';
    this.phaseTime = 0;
  }

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
    if (s !== 'playing') this.audio.setRotor(false);
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

  private updateMenu(): void {
    const inp = this.input;
    const n = MENU_ITEMS.length;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; this.audio.blip(); }
    const item = MENU_ITEMS[this.menuIndex];
    const side = inp.justPressed('left') || inp.justPressed('right');
    if (side && item === 'JOGO') { this.level = this.level === 'cadet' ? 'commander' : 'cadet'; this.audio.blip(); }
    if (side && item === 'DIFICULDADE') { this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (item) {
        case 'JOGAR': this.startGame(); break;
        case 'JOGO': this.level = this.level === 'cadet' ? 'commander' : 'cadet'; break;
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
    const c = this.chopper;

    if (this.phase === 'ready') {
      // "action begins as soon as you move the joystick or push the red button"
      if (inp.isDown('left') || inp.isDown('right') || inp.isDown('up') || inp.isDown('down') || inp.justPressed('fire')) {
        this.phase = 'wave';
        this.phaseTime = 0;
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
    this.phase = 'ready';
    this.phaseTime = 0;
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextExtra) {
      this.nextExtra += EXTRA_EVERY;
      if (this.reserve < MAX_CHOPPERS - 1) { this.reserve++; this.audio.extraChopper(); }
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

export { WORLD_W };
