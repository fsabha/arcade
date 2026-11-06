import {
  W, H, FIELD_TOP, FIELD_H, SHIP_R, ROT_STEPS, ROT_RATE, THRUST, MAX_SPEED, DRAG, MAX_SHOTS, FIRE_COOLDOWN, POINTS,
  START_ASTEROIDS, ASTEROIDS_PER_WAVE, MAX_ASTEROIDS_START, SATELLITE_POINTS, UFO_POINTS, SAUCER_GAP_MIN, SAUCER_GAP_MAX,
  UFO_SOMETIMES_AT, UFO_ALWAYS_AT, START_SHIPS, SHIELD_MAX, HYPERSPACE_TIME, RESPAWN_WAIT, SAFE_RADIUS, WAVE_PAUSE,
  DEATH_TIME,
} from './config';
import { Field, wrapX, wrapY } from './field';
import { GameSpec, gameSpec, GAME_NUMBERS } from './games';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';
export type ShipMode = 'alive' | 'dead' | 'waiting' | 'hyper';
export type Difficulty = 'A' | 'B';

export const MENU_ITEMS = ['JOGAR', 'JOGO', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: number; // 0..15, 0 = up, clockwise
  thrusting: boolean;
  mode: ShipMode;
  t: number;
  shieldT: number; // seconds the shield has been up
  shieldOn: boolean;
}

export class Game {
  state: State = 'menu';
  gameIndex = 0; // into GAME_NUMBERS
  difficulty: Difficulty = 'B';
  spec: GameSpec = gameSpec(1);
  field = new Field(1, false);
  ship: Ship = this.newShip();
  score = 0;
  ships = START_SHIPS; // including the one in play
  wave = 1;
  waveT = 0; // > 0 while waiting for the next wave
  saucerT = 10;
  private fireT = 0;
  private nextBonus = 0;
  private rotAcc = 0;

  time = 0;
  stateTime = 0;
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

  private newShip(): Ship {
    return { x: W / 2, y: FIELD_TOP + FIELD_H / 2, vx: 0, vy: 0, dir: 0, thrusting: false, mode: 'alive', t: 0, shieldT: 0, shieldOn: false };
  }

  get gameNumber(): number {
    return GAME_NUMBERS[this.gameIndex];
  }

  get angle(): number {
    return (this.ship.dir / ROT_STEPS) * Math.PI * 2 - Math.PI / 2;
  }

  // ---------- state ----------

  startGame(): void {
    this.spec = gameSpec(this.gameNumber);
    this.field = new Field((Date.now() ^ (this.gameNumber * 2654435761)) >>> 0, this.spec.fast);
    this.score = 0;
    this.ships = START_SHIPS;
    this.wave = 1;
    this.nextBonus = this.spec.bonus ?? Infinity;
    this.ship = this.newShip();
    this.saucerT = this.field.rng.range(SAUCER_GAP_MIN, SAUCER_GAP_MAX);
    this.field.spawnWave(this.waveSize());
    this.waveT = 0;
    this.setState('playing');
  }

  private waveSize(): number {
    const n = START_ASTEROIDS + (this.wave - 1) * ASTEROIDS_PER_WAVE;
    return Math.min(this.spec.kids ? 4 + this.wave - 1 : n, MAX_ASTEROIDS_START);
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
    this.audio.thrustStop();
    this.audio.saucerStop();
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
    const delta = (inp.justPressed('right') ? 1 : 0) - (inp.justPressed('left') ? 1 : 0);
    if (delta !== 0 && item === 'JOGO') { this.gameIndex = (this.gameIndex + delta + GAME_NUMBERS.length) % GAME_NUMBERS.length; this.audio.blip(); }
    if (delta !== 0 && item === 'DIFICULDADE') { this.difficulty = this.difficulty === 'A' ? 'B' : 'A'; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (item) {
        case 'JOGAR': this.startGame(); break;
        case 'JOGO': this.gameIndex = (this.gameIndex + 1) % GAME_NUMBERS.length; break;
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
    if (inp.justPressed('back')) { this.audio.saucerStop(); this.setState('menu'); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.setState('playing');
      else { this.audio.saucerStop(); this.setState('menu'); }
    }
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.audio.thrustStop();
      this.audio.saucerStop();
      this.setState('paused');
      return;
    }
    const s = this.ship;
    s.t += dt;
    this.field.update(dt, s.mode === 'alive' ? { x: s.x, y: s.y, alive: true } : null);
    this.updateSaucers(dt);

    // next wave
    if (this.field.asteroids.length === 0 && !this.field.saucer) {
      this.waveT += dt;
      if (this.waveT >= WAVE_PAUSE) {
        this.wave++;
        this.waveT = 0;
        this.field.spawnWave(this.waveSize());
      }
    }

    switch (s.mode) {
      case 'dead':
        if (s.t >= DEATH_TIME) {
          if (this.ships <= 0) { this.endGame(); return; }
          s.mode = 'waiting';
          s.t = 0;
        }
        break;
      case 'waiting':
        if (s.t >= RESPAWN_WAIT && this.field.clearNear(W / 2, FIELD_TOP + FIELD_H / 2, SAFE_RADIUS)) {
          const keepDir = s.dir;
          this.ship = this.newShip();
          this.ship.dir = keepDir;
        }
        break;
      case 'hyper':
        if (s.t >= HYPERSPACE_TIME) {
          s.x = this.field.rng.range(16, W - 16);
          s.y = this.field.rng.range(FIELD_TOP + 16, H - 16);
          s.vx = 0;
          s.vy = 0;
          s.mode = 'alive';
          s.t = 0;
        }
        break;
      case 'alive':
        this.controlShip(dt);
        if (this.ship.mode === 'alive') this.collide();
        break;
    }
  }

  private controlShip(dt: number): void {
    const inp = this.input;
    const s = this.ship;
    // rotation in 16 steps
    const rot = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0);
    if (rot !== 0) {
      this.rotAcc += dt * ROT_RATE;
      while (this.rotAcc >= 1) { this.rotAcc -= 1; s.dir = (s.dir + rot + ROT_STEPS) % ROT_STEPS; }
    } else {
      this.rotAcc = 1; // first tap turns at once
    }
    // thrust
    s.thrusting = inp.isDown('up');
    if (s.thrusting) {
      s.vx += Math.cos(this.angle) * THRUST * dt;
      s.vy += Math.sin(this.angle) * THRUST * dt;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > MAX_SPEED) { s.vx *= MAX_SPEED / sp; s.vy *= MAX_SPEED / sp; }
      this.audio.thrustStart();
    } else {
      this.audio.thrustStop();
    }
    const k = Math.max(0, 1 - DRAG * dt);
    s.vx *= k;
    s.vy *= k;
    s.x = wrapX(s.x + s.vx * dt);
    s.y = wrapY(s.y + s.vy * dt);

    // special: hyperspace / shields / flip
    const down = inp.isDown('down');
    s.shieldOn = false;
    switch (this.spec.special) {
      case 'hyperspace':
        if (inp.justPressed('down')) { s.mode = 'hyper'; s.t = 0; this.audio.hyperspace(); return; }
        break;
      case 'shields':
        if (down) {
          s.shieldOn = true;
          s.shieldT += dt;
          if (s.shieldT > SHIELD_MAX) { this.die(); return; }
        } else {
          s.shieldT = 0;
        }
        break;
      case 'flip':
        if (inp.justPressed('down')) { s.dir = (s.dir + ROT_STEPS / 2) % ROT_STEPS; this.audio.blip(); }
        break;
      case 'none': break;
    }

    // fire
    this.fireT -= dt;
    if (inp.justPressed('fire') && this.fireT <= 0 && this.field.shots.filter((sh) => !sh.enemy).length < MAX_SHOTS) {
      this.fireT = FIRE_COOLDOWN;
      const a = this.angle;
      this.field.fire(s.x + Math.cos(a) * SHIP_R, s.y + Math.sin(a) * SHIP_R, a, false, s.vx * 0.3, s.vy * 0.3);
      this.audio.fire();
    }
  }

  private updateSaucers(dt: number): void {
    const f = this.field;
    if (f.saucer) {
      this.audio.saucerStart(f.saucer.kind);
      return;
    }
    this.audio.saucerStop();
    if (this.difficulty !== 'A' || this.field.asteroids.length === 0) return;
    this.saucerT -= dt;
    if (this.saucerT <= 0) {
      this.saucerT = f.rng.range(SAUCER_GAP_MIN, SAUCER_GAP_MAX);
      let kind: 'satellite' | 'ufo' = 'satellite';
      if (this.score >= UFO_ALWAYS_AT) kind = 'ufo';
      else if (this.score >= UFO_SOMETIMES_AT && f.rng.chance(0.5)) kind = 'ufo';
      f.spawnSaucer(kind);
    }
  }

  private collide(): void {
    const f = this.field;
    const s = this.ship;
    // player shots
    for (const sh of f.shots) {
      if (sh.enemy) continue;
      const a = f.asteroidAt(sh.x, sh.y, 1);
      if (a) {
        sh.life = 0;
        this.addScore(POINTS[a.size]);
        f.split(a, this.spec.kids);
        this.audio.explode(a.size);
        continue;
      }
      if (f.saucerAt(sh.x, sh.y, 1)) {
        sh.life = 0;
        const u = f.saucer!;
        this.addScore(u.kind === 'satellite' ? SATELLITE_POINTS : UFO_POINTS);
        f.burst(u.x, u.y, 10, '#ffe14a');
        f.saucer = null;
        this.audio.explode('medium');
      }
    }
    f.shots = f.shots.filter((sh) => sh.life > 0);
    if (s.shieldOn) return;
    // the ship
    const a = f.asteroidAt(s.x, s.y, SHIP_R - 2);
    if (a) { f.split(a, this.spec.kids); this.die(); return; }
    if (f.saucerAt(s.x, s.y, SHIP_R - 2)) { this.die(); return; }
    for (const sh of f.shots) {
      if (sh.enemy && (sh.x - s.x) ** 2 + (sh.y - s.y) ** 2 <= (SHIP_R - 1) ** 2) { sh.life = 0; this.die(); return; }
    }
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextBonus) {
      this.nextBonus += this.spec.bonus ?? Infinity;
      this.ships++;
      this.audio.extraShip();
    }
  }

  die(): void {
    const s = this.ship;
    if (s.mode !== 'alive') return;
    s.mode = 'dead';
    s.t = 0;
    s.thrusting = false;
    s.shieldOn = false;
    this.ships--;
    this.field.burst(s.x, s.y, 10, '#ffffff');
    this.audio.thrustStop();
    this.audio.shipExplode();
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
        const entry: HighScore = { initials: this.initials.join(''), score: this.score, level: this.wave, date: new Date().toISOString() };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}

export { H };
