import {
  W, GROUND_Y, BUGGY_X, BUGGY_W, BUGGY_H, SPEED_CRUISE, SPEED_FAST, SPEED_SLOW, ACCEL, SHIFT_RANGE, JUMP_TIME, JUMP_H,
  SHOT_SPEED, SHOT_LIFE, FIRE_GAP, LETTERS, LETTER_LEN, COURSE_LEN, CHECKPOINTS, PAR_TIME, CHECKPOINT_BONUS, CHECKPOINT_BONUS_SLOW,
  COURSE_BONUS, POINTS, START_LIVES, EXTRA_LIVES_AT, DEATH_TIME, UFO_W, BOMB_SPEED, TANK_SHOT_SPEED, HUD_H, Course, letterOf,
} from './config';
import { buildCourse, GroundObject, UfoWave, UfoKind } from './course';
import { Rng } from '@arcade/shared';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore, loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';
export type Death = 'crater' | 'crash' | 'shot' | null;

export const MENU_ITEMS = ['JOGAR', 'PERCURSO', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS_IN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export interface Shot { x: number; y: number; vx: number; vy: number; t: number; alive: boolean }
export interface Ufo { kind: UfoKind; x: number; y: number; t: number; bombT: number; alive: boolean; dir: 1 | -1 }
export interface Bomb { x: number; y: number; alive: boolean }

export class Game {
  state: State = 'menu';
  course: Course = 'beginner';
  score = 0;
  lives = START_LIVES;
  /** world distance of the screen's left edge */
  distance = 0;
  speed = SPEED_CRUISE;
  buggy = { shift: 0, jumpT: -1, alive: true, phase: 0 };
  ground: GroundObject[] = [];
  ufoWaves: UfoWave[] = [];
  ufos: Ufo[] = [];
  bombs: Bomb[] = [];
  shots: Shot[] = [];
  enemyShots: Shot[] = [];
  sectionTime = 0;
  checkpointIndex = 0; // next checkpoint to reach
  lastBonus = 0;
  bonusShown = 0;
  death: Death = null;
  deathT = 0;
  coursesDone = 0;
  private fireT = 0;
  private extraGiven = 0;
  private rng = new Rng(1);
  private spawnedWaves = new Set<number>();

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

  get letter(): number {
    return letterOf(this.buggyWorldX);
  }

  /** world x of the buggy's left edge */
  get buggyWorldX(): number {
    return this.distance + BUGGY_X + this.buggy.shift;
  }

  get buggyScreenX(): number {
    return BUGGY_X + this.buggy.shift;
  }

  get lift(): number {
    const j = this.buggy.jumpT;
    return j < 0 ? 0 : Math.sin(Math.PI * Math.min(1, j / JUMP_TIME)) * JUMP_H;
  }

  // ---------- state ----------

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.extraGiven = 0;
    this.coursesDone = 0;
    this.rng = new Rng((Date.now() & 0xffff) + 1);
    this.startCourse();
    this.setState('playing');
  }

  private startCourse(): void {
    const built = buildCourse(this.course, (this.coursesDone * 7919 + Date.now()) >>> 0);
    this.ground = built.ground;
    this.ufoWaves = built.ufos;
    this.spawnedWaves.clear();
    this.checkpointIndex = 0;
    this.restartAt(0);
  }

  /** Puts the buggy at the start of a section. */
  private restartAt(distance: number): void {
    this.distance = distance;
    this.speed = SPEED_CRUISE;
    this.buggy = { shift: 0, jumpT: -1, alive: true, phase: 0 };
    this.ufos = [];
    this.bombs = [];
    this.shots = [];
    this.enemyShots = [];
    this.sectionTime = 0;
    this.death = null;
    this.bonusShown = 0;
    // craters dug by bombs on the way vanish with the restart; the course objects come back
    for (const o of this.ground) if (o.kind !== 'crater' || o.hp > 0) o.alive = true;
    this.ground = this.ground.filter((o) => o.hp > 0);
    for (const l of [...this.spawnedWaves]) if (l * LETTER_LEN >= distance) this.spawnedWaves.delete(l);
  }

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
    if (s !== 'playing') this.audio.setEngine(false, 0);
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
    if (side && item === 'PERCURSO') { this.course = this.course === 'beginner' ? 'champion' : 'beginner'; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (item) {
        case 'JOGAR': this.startGame(); break;
        case 'PERCURSO': this.course = this.course === 'beginner' ? 'champion' : 'beginner'; break;
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
    const b = this.buggy;
    if (!b.alive) {
      this.deathT += dt;
      if (this.deathT >= DEATH_TIME) this.respawn();
      return;
    }
    this.sectionTime += dt;
    if (this.bonusShown > 0) this.bonusShown -= dt;

    // throttle: right = accelerate, left = brake; the buggy creeps across the screen with it
    const want = inp.isDown('right') ? SPEED_FAST : inp.isDown('left') ? SPEED_SLOW : SPEED_CRUISE;
    this.speed += Math.sign(want - this.speed) * Math.min(Math.abs(want - this.speed), ACCEL * dt);
    const shiftWant = ((this.speed - SPEED_CRUISE) / (SPEED_FAST - SPEED_CRUISE)) * SHIFT_RANGE;
    b.shift += (shiftWant - b.shift) * Math.min(1, dt * 3);
    this.distance += this.speed * dt;
    b.phase += dt * this.speed / 8;
    this.audio.setEngine(true, this.speed);

    if (b.jumpT >= 0) {
      b.jumpT += dt;
      if (b.jumpT >= JUMP_TIME) b.jumpT = -1;
    } else if (inp.justPressed('up') || inp.justPressed('confirm')) {
      b.jumpT = 0;
      this.audio.jump();
    }

    this.fireT -= dt;
    if (inp.isDown('fire') && this.fireT <= 0) {
      this.fireT = FIRE_GAP;
      // one button, two guns: straight up and straight ahead
      const bx = this.buggyWorldX;
      const by = GROUND_Y - BUGGY_H - this.lift;
      this.shots.push({ x: bx + BUGGY_W / 2, y: by, vx: 0, vy: -SHOT_SPEED, t: 0, alive: true });
      this.shots.push({ x: bx + BUGGY_W, y: by + BUGGY_H - 5, vx: SHOT_SPEED, vy: 0, t: 0, alive: true });
      this.audio.shot();
    }

    this.updateShots(dt);
    this.updateGround(dt);
    this.updateUfos(dt);
    if (!b.alive) return;
    this.checkpoints();
  }

  private updateShots(dt: number): void {
    for (const s of this.shots) {
      if (!s.alive) continue;
      s.t += dt;
      s.x += (s.vx + this.speed) * dt; // both guns travel with the buggy's frame
      s.y += s.vy * dt;
      if (s.t > SHOT_LIFE || s.y < HUD_H) { s.alive = false; continue; }
      if (s.vy < 0) {
        for (const u of this.ufos) {
          if (u.alive && Math.abs(u.x - s.x) < UFO_W / 2 + 2 && Math.abs(u.y - s.y) < 8) {
            u.alive = false; s.alive = false;
            this.addScore(u.kind === 'small' ? POINTS.ufoSmall : u.kind === 'big' ? POINTS.ufoBig : POINTS.ufoFast);
            this.audio.hit();
            break;
          }
        }
        for (const bo of this.bombs) {
          if (bo.alive && Math.abs(bo.x - s.x) < 5 && Math.abs(bo.y - s.y) < 6) { bo.alive = false; s.alive = false; this.audio.hit(); break; }
        }
      } else {
        for (const o of this.ground) {
          if (!o.alive || o.kind === 'crater' || o.kind === 'bigCrater') continue;
          if (s.x >= o.x && s.x <= o.x + o.w) {
            s.alive = false;
            o.hp--;
            if (o.hp <= 0) {
              o.alive = false;
              this.addScore(o.kind === 'rock' ? POINTS.rock : o.kind === 'bigRock' ? POINTS.bigRock : o.kind === 'mine' ? POINTS.mine : POINTS.tank);
              this.audio.hit();
            }
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.alive);

    for (const s of this.enemyShots) {
      if (!s.alive) continue;
      s.t += dt;
      s.x += s.vx * dt;
      if (s.t > 3) { s.alive = false; continue; }
      if (this.hitsBuggy(s.x, s.y, 4, 2)) { s.alive = false; this.die('shot'); }
    }
    this.enemyShots = this.enemyShots.filter((s) => s.alive);
  }

  private hitsBuggy(x: number, y: number, w: number, h: number): boolean {
    const bx = this.buggyWorldX + 2;
    const by = GROUND_Y - BUGGY_H - this.lift;
    return x < bx + BUGGY_W - 4 && x + w > bx && y < by + BUGGY_H && y + h > by;
  }

  private updateGround(dt: number): void {
    const bx = this.buggyWorldX;
    const onGround = this.buggy.jumpT < 0;
    for (const o of this.ground) {
      if (!o.alive) continue;
      if (o.x > this.distance + W + 40 || o.x + o.w < this.distance - 60) continue;
      if (o.kind === 'tank') {
        o.fireT -= dt;
        if (o.fireT <= 0 && o.x > bx + 20) {
          o.fireT = 1.6 + this.rng.next();
          this.enemyShots.push({ x: o.x, y: GROUND_Y - 8, vx: -TANK_SHOT_SPEED, vy: 0, t: 0, alive: true });
        }
      }
      if (!onGround) continue;
      const crater = o.kind === 'crater' || o.kind === 'bigCrater';
      if (crater) {
        // both wheels over the hole: the buggy drops in
        const front = bx + BUGGY_W - 3;
        const rear = bx + 3;
        if (rear > o.x && front < o.x + o.w + 6) { this.die('crater'); return; }
      } else if (bx + BUGGY_W - 3 > o.x && bx + 3 < o.x + o.w) {
        this.die('crash');
        return;
      }
    }
  }

  private updateUfos(dt: number): void {
    // waves show up when the buggy enters their letter
    const l = this.letter;
    for (const w of this.ufoWaves) {
      if (w.letter !== l || this.spawnedWaves.has(w.letter)) continue;
      this.spawnedWaves.add(w.letter);
      for (let i = 0; i < w.count; i++) {
        this.ufos.push({ kind: w.kind, x: this.distance + W + 20 + i * 40, y: HUD_H + 16 + i * 14, t: i * 0.7, bombT: 1 + i, alive: true, dir: -1 });
      }
      this.audio.ufo();
    }
    const speedK = this.course === 'champion' ? 1.3 : 1;
    for (const u of this.ufos) {
      if (!u.alive) continue;
      u.t += dt;
      const v = (u.kind === 'fast' ? 110 : u.kind === 'big' ? 70 : 55) * speedK;
      // hover around the buggy, weaving
      const target = this.buggyWorldX + 60 + Math.sin(u.t * 1.3) * 70;
      u.x += Math.sign(target - u.x) * Math.min(Math.abs(target - u.x), v * dt) + this.speed * dt * 0.9;
      u.y = HUD_H + 22 + Math.sin(u.t * 2.1) * 14 + (u.kind === 'big' ? 10 : 0);
      u.bombT -= dt;
      if (u.bombT <= 0) {
        u.bombT = (u.kind === 'fast' ? 1.2 : 2.0) / speedK + this.rng.next();
        this.bombs.push({ x: u.x, y: u.y + 6, alive: true });
        this.audio.bomb();
      }
      if (u.x < this.distance - 40) u.alive = false; // left behind
      if (this.hitsBuggy(u.x - UFO_W / 2, u.y - 4, UFO_W, 8)) { u.alive = false; this.die('crash'); }
    }
    for (const bo of this.bombs) {
      if (!bo.alive) continue;
      bo.y += BOMB_SPEED * dt;
      if (this.hitsBuggy(bo.x - 2, bo.y, 4, 6)) { bo.alive = false; this.die('shot'); continue; }
      if (bo.y >= GROUND_Y) {
        bo.alive = false;
        // a bomb on the ground digs a fresh crater, unless the ground there is busy
        const busy = this.ground.some((o) => o.alive && bo.x + 12 > o.x && bo.x - 12 < o.x + o.w);
        if (!busy && bo.x > this.buggyWorldX + BUGGY_W) {
          this.ground.push({ kind: 'crater', x: bo.x - 12, w: 24, hp: 0, alive: true, fireT: 0 });
        }
      }
    }
    this.ufos = this.ufos.filter((u) => u.alive);
    this.bombs = this.bombs.filter((b) => b.alive);
  }

  private checkpoints(): void {
    const next = CHECKPOINTS[this.checkpointIndex];
    if (next === undefined) return;
    if (this.buggyWorldX < next * LETTER_LEN) return;
    this.checkpointIndex++;
    const bonus = this.sectionTime <= PAR_TIME ? CHECKPOINT_BONUS : CHECKPOINT_BONUS_SLOW;
    this.lastBonus = bonus;
    this.bonusShown = 2;
    this.addScore(bonus);
    this.sectionTime = 0;
    this.audio.checkpoint();
    if (next >= LETTERS - 1 || this.buggyWorldX >= COURSE_LEN - LETTER_LEN) {
      // course complete: champion course next, faster and meaner
      this.addScore(COURSE_BONUS);
      this.lastBonus += COURSE_BONUS;
      this.coursesDone++;
      this.course = 'champion';
      this.audio.course();
      this.startCourse();
    }
  }

  private addScore(n: number): void {
    this.score += n;
    while (this.extraGiven < EXTRA_LIVES_AT.length && this.score >= EXTRA_LIVES_AT[this.extraGiven]) {
      this.extraGiven++;
      this.lives++;
      this.audio.extraLife();
    }
  }

  die(how: Exclude<Death, null>): void {
    if (!this.buggy.alive) return;
    this.buggy.alive = false;
    this.death = how;
    this.deathT = 0;
    this.audio.setEngine(false, 0);
    this.audio.crash();
  }

  private respawn(): void {
    this.lives--;
    if (this.lives <= 0) { this.endGame(); return; }
    // back to the start of the current five-letter section
    const sectionStart = this.checkpointIndex === 0 ? 0 : CHECKPOINTS[this.checkpointIndex - 1] * LETTER_LEN;
    this.restartAt(sectionStart);
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
    const cur = LETTERS_IN.indexOf(this.initials[i]);
    if (inp.justPressed('up')) { this.initials[i] = LETTERS_IN[(cur + 1) % LETTERS_IN.length]; this.audio.blip(); }
    if (inp.justPressed('down')) { this.initials[i] = LETTERS_IN[(cur + LETTERS_IN.length - 1) % LETTERS_IN.length]; this.audio.blip(); }
    if (inp.justPressed('left') || inp.justPressed('back')) { this.initialsPos = Math.max(0, i - 1); this.audio.blip(); }
    if (inp.justPressed('right')) { this.initialsPos = Math.min(2, i + 1); this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      if (i < 2) {
        this.initialsPos = i + 1;
      } else {
        const entry: HighScore = { initials: this.initials.join(''), score: this.score, course: this.coursesDone * LETTERS + this.letter + 1, date: new Date().toISOString() };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}
