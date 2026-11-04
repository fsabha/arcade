import {
  W, PLAYER_W, PLAYER_H, PLAYER_VX, PLAYER_VY, PLAYER_MIN_Y, PLAYER_MAX_Y, DIVE_Y, TORPEDO_V, TORPEDO_W, TORPEDO_H,
  OXYGEN_MAX, OXYGEN_TIME, OXYGEN_REFILL_TIME, OXYGEN_LOW, MAX_DIVERS, DYING_TIME, BANNER_TIME,
} from './config';
import { Sea, Enemy } from './sea';
import { aabb, shrink, Box } from './collision';
import { ScoreKeeper, enemyValue, rescueBonus } from './scoring';
import type { Input } from '@arcade/shared';
import type { SoundFx } from './audio';
import {
  loadHighScores, saveHighScores, qualifies, insertHighScore,
  loadSettings, saveSettings, HighScore, Settings,
} from './storage';

export type State = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'dying' | 'gameover' | 'initials';

export interface Explosion {
  x: number;
  y: number;
  t: number;
  dur: number;
  big: boolean;
}

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

export class Game {
  state: State = 'menu';
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
  stateTime = 0;
  private lowTimer = 0;
  private refillTimer = 0;

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
    this.setState('playing');
    this.audio.humStart();
  }

  private setState(s: State): void {
    this.state = s;
    this.stateTime = 0;
  }

  private showBanner(text: string): void {
    this.bannerText = text;
    this.bannerT = BANNER_TIME;
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

  private goMenu(): void {
    this.audio.humStop();
    this.setState('menu');
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
      case 'dying': this.updateDying(dt); break;
      case 'gameover': this.updateGameOver(); break;
      case 'initials': this.updateInitials(); break;
    }
  }

  private updateMenu(): void {
    const inp = this.input;
    const n = MENU_ITEMS.length;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; this.audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.audio.blip();
      switch (this.menuIndex) {
        case 0: this.startGame(); break;
        case 1: this.setState('howto'); break;
        case 2: this.highScores = loadHighScores(); this.setState('ranking'); break;
        case 3: this.toggleCrt(); break;
        case 4: this.toggleSound(); break;
      }
    }
  }

  private updatePaused(): void {
    const inp = this.input;
    const n = PAUSE_ITEMS.length;
    if (inp.justPressed('up')) { this.pauseIndex = (this.pauseIndex + n - 1) % n; this.audio.blip(); }
    if (inp.justPressed('down')) { this.pauseIndex = (this.pauseIndex + 1) % n; this.audio.blip(); }
    if (inp.justPressed('pause')) { this.resume(); return; }
    if (inp.justPressed('back')) { this.goMenu(); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.resume();
      else this.goMenu();
    }
  }

  private resume(): void {
    this.setState('playing');
    this.audio.humStart();
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.pauseIndex = 0;
      this.audio.humStop();
      this.setState('paused');
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

  private die(reason: string): void {
    this.deathReason = reason;
    this.explosions.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, t: 0, dur: 1.0, big: true });
    this.audio.explode(true);
    this.audio.humStop();
    this.torpedo = null;
    this.setState('dying');
  }

  private updateDying(dt: number): void {
    this.updateExplosions(dt);
    this.sea.update(dt, this.level, -1000);
    if (this.stateTime < DYING_TIME) return;
    this.score.lives--;
    if (this.score.lives <= 0) {
      this.audio.gameOver();
      this.highScores = loadHighScores();
      this.qualifiesForRank = qualifies(this.highScores, this.score.score);
      this.setState('gameover');
    } else {
      this.respawn();
    }
  }

  private updateGameOver(): void {
    const inp = this.input;
    if (this.stateTime < 1.5) return;
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
        const entry: HighScore = {
          initials: this.initials.join(''),
          score: this.score.score,
          level: this.level,
          date: new Date().toISOString(),
        };
        this.highScores = insertHighScore(this.highScores, entry);
        saveHighScores(this.highScores);
        this.setState('ranking');
      }
    }
  }
}
