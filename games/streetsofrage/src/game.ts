import {
  W, HUD_H, START_LIVES, CONTINUES, HERO_HP, SPECIALS_PER_LIFE, MAX_SPECIALS, SPECIAL_DAMAGE, HERO_IDS, HERO_NAMES, HERO_FULL_NAMES,
  ROUND_INTRO_TIME, DEATH_TIME, CLEAR_TIME, POLICE_TIME, POLICE_BLAST_AT, POINTS, APPLE_HEAL, enemyScale, difficultyName, HeroId, Difficulty,
} from './config';
import { DEFS } from './defs';
import { STAGES } from './stages';
import { Brawl, NO_CONTROLS } from '@arcade/brawl';
import type { Actor, Controls, Item, StageDef } from '@arcade/brawl';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Phase = 'intro' | 'play' | 'dead' | 'continue' | 'clear' | 'ending';

export const MENU_ITEMS = ['JOGAR', 'HEROI', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

/** The police special: the car drives in, the napalm lands at POLICE_BLAST_AT. */
export interface PoliceFx { t: number; blasted: boolean }

export class Game {
  shell: Shell<HighScore, Settings>;
  heroId: HeroId = 'axel';
  difficulty: Difficulty = 'normal';
  phase: Phase = 'intro';
  phaseTime = 0;
  roundIndex = 0;
  brawl: Brawl;
  hero: Actor;
  score = 0;
  lives = START_LIVES;
  continues = CONTINUES;
  /** police calls carried between rounds */
  specials = SPECIALS_PER_LIFE;
  policeFx: PoliceFx | null = null;
  /** last enemy hit, for the HUD bar */
  focus: Actor | null = null;
  focusT = 0;
  continueT = 0;
  shake = 0;
  time = 0;
  /** short HUD notice ("CANO", "1-UP") */
  notice = '';
  noticeT = 0;
  private lastHp = HERO_HP;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item, delta) => {
        if (item === 'HEROI') { const i = HERO_IDS.indexOf(this.heroId); this.heroId = HERO_IDS[(i + (delta || 1) + HERO_IDS.length) % HERO_IDS.length]; }
        if (item === 'DIFICULDADE') { const d: Difficulty[] = ['easy', 'normal', 'hard']; const i = d.indexOf(this.difficulty); this.difficulty = d[(i + (delta || 1) + 3) % 3]; }
      },
      onMusic: (on) => this.audio.setMusicEnabled(on),
      onStop: () => this.audio.musicStop(),
      onResume: () => this.audio.musicStart(),
      remote: { game: 'streetsofrage', label: (e) => `ROUND ${e.round} ${e.mode}` },
      entry: (initials) => ({ initials, score: this.score, round: this.roundIndex + 1, mode: this.modeName, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, round: this.roundIndex + 1, mode: this.modeName, date: '' }),
    });
    this.brawl = this.makeBrawl(STAGES[0]);
    this.hero = this.brawl.addHero(this.heroId, 60, 185);
  }

  get state(): State { return this.shell.state; }
  get stateTime(): number { return this.shell.stateTime; }
  get menuIndex(): number { return this.shell.menuIndex; }
  get pauseIndex(): number { return this.shell.pauseIndex; }
  get initials(): string[] { return this.shell.initials; }
  get initialsPos(): number { return this.shell.initialsPos; }
  get qualifiesForRank(): boolean { return this.shell.qualifiesForRank; }
  get settings(): Settings { return this.shell.settings; }
  get highScores(): HighScore[] { return this.shell.highScores; }

  get stage(): StageDef { return STAGES[this.roundIndex]; }
  get heroName(): string { return HERO_NAMES[this.heroId]; }
  get heroFullName(): string { return HERO_FULL_NAMES[this.heroId]; }
  get difficultyName(): string { return difficultyName(this.difficulty); }
  get modeName(): string { return `${this.heroName} ${this.difficultyName}`; }

  // ---------- flow ----------

  private makeBrawl(stage: StageDef): Brawl {
    return new Brawl(stage, DEFS, W, (this.roundIndex * 7919 + Date.now()) >>> 0, {
      onHit: (from, t, dmg, knock) => {
        if (t.team === 'enemy') { this.focus = t; this.focusT = 2.5; }
        if (from.team === 'hero' && from.weapon) this.audio.swing();
        if (dmg >= 3 || knock !== 'hit') this.audio.kick(); else this.audio.punch();
        if (t.team === 'hero') this.audio.grunt();
      },
      onKill: (a) => { if (a.team === 'enemy') this.addScore(a.def.points); },
      onItem: (_h, item) => this.pickUp(item),
      onSpecial: () => this.callPolice(),
      onHeroDown: () => this.heroDown(),
      onStageClear: () => this.roundClear(),
      onJump: () => this.audio.jump(),
      onSwing: (a, mv) => {
        if (mv === 'ranged') { const k = a.def.ai?.ranged?.kind; if (k === 'bullet') this.audio.gun(); else if (k === 'flame') this.audio.flame(); else this.audio.shot(); }
        else if (a.def.rig.weapon === 'whip') this.audio.whip();
        else if (a.team === 'hero') this.audio.swing();
      },
      onThrow: () => this.audio.kick(),
    }, enemyScale(this.difficulty));
  }

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.continues = CONTINUES;
    this.specials = SPECIALS_PER_LIFE;
    this.lastHp = HERO_HP;
    this.roundIndex = 0;
    this.startRound();
    this.shell.setState('playing');
    this.audio.setMusicEnabled(this.shell.settings.music !== false);
    this.audio.musicStart();
  }

  /** Builds the current round (public so tests and the debug console can jump to any round). */
  startRound(): void {
    this.brawl = this.makeBrawl(this.stage);
    this.hero = this.brawl.addHero(this.heroId, 60, 185);
    this.hero.hp = this.hero.maxHp = HERO_HP;
    this.hero.hp = Math.max(1, Math.min(HERO_HP, this.lastHp));
    this.hero.magic = this.specials;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.policeFx = null;
    this.focus = null;
    this.notice = '';
  }

  private respawn(): void {
    const b = this.brawl;
    const h = b.addHero(this.heroId, b.scrollX + 40, 185);
    h.hp = h.maxHp = HERO_HP;
    h.magic = SPECIALS_PER_LIFE;
    h.invuln = 2;
    this.hero = h;
    this.policeFx = null;
    this.phase = 'play';
    this.phaseTime = 0;
  }

  private heroDown(): void {
    this.audio.heroDown();
    this.lives--;
    this.phase = 'dead';
    this.phaseTime = 0;
  }

  private roundClear(): void {
    if (this.phase !== 'play') return;
    this.addScore(POINTS.roundClear);
    this.audio.roundClear();
    this.lastHp = this.hero.hp;
    this.specials = this.hero.magic;
    this.phase = 'clear';
    this.phaseTime = 0;
  }

  private nextRound(): void {
    if (this.roundIndex >= STAGES.length - 1) { this.phase = 'ending'; this.phaseTime = 0; return; }
    this.roundIndex++;
    this.startRound();
  }

  private pickUp(item: Item): void {
    switch (item.kind) {
      case 'food':
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + (item.value || APPLE_HEAL));
        this.audio.food();
        this.showNotice(item.value >= HERO_HP ? 'FRANGO' : 'MACA');
        break;
      case 'points':
        this.addScore(item.value || POINTS.moneyBag);
        this.audio.money();
        this.showNotice(`${item.value || POINTS.moneyBag} PONTOS`);
        break;
      case 'life':
        this.lives++;
        this.audio.oneUp();
        this.showNotice('1-UP');
        break;
      case 'special':
        if (this.hero.magic < MAX_SPECIALS) this.hero.magic++;
        else this.addScore(POINTS.moneyBag);
        this.audio.pickup();
        this.showNotice('POLICIA +1');
        break;
      case 'weapon':
        this.audio.weapon();
        break;
      default: break;
    }
  }

  private showNotice(text: string): void {
    this.notice = text;
    this.noticeT = 1.6;
  }

  /** The police special: one call per use; the napalm lands a moment after the car drives in. */
  private callPolice(): boolean {
    if (this.hero.magic <= 0 || this.policeFx) return false;
    this.hero.magic--;
    this.policeFx = { t: 0, blasted: false };
    this.hero.invuln = POLICE_TIME + 0.4;
    this.audio.siren();
    return true;
  }

  private addScore(n: number): void {
    this.score += n;
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private controls(): Controls {
    const inp = this.input;
    return {
      left: inp.isDown('left'), right: inp.isDown('right'), up: inp.isDown('up'), down: inp.isDown('down'),
      attack: inp.justPressed('fire'), jump: inp.justPressed('jump') || inp.justPressed('confirm'), special: inp.justPressed('special'),
    };
  }

  private updatePolice(dt: number): void {
    const fx = this.policeFx;
    if (!fx) return;
    fx.t += dt;
    if (!fx.blasted && fx.t >= POLICE_BLAST_AT) {
      fx.blasted = true;
      this.brawl.blast(this.hero, SPECIAL_DAMAGE, 'launch');
      this.shake = 0.7;
      this.audio.napalm();
    }
    if (fx.t >= POLICE_TIME) this.policeFx = null;
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) { this.shell.pause(); return; }
    this.phaseTime += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.focusT = Math.max(0, this.focusT - dt);
    this.noticeT = Math.max(0, this.noticeT - dt);

    switch (this.phase) {
      case 'intro':
        if (this.phaseTime >= ROUND_INTRO_TIME || inp.justPressed('fire')) { this.phase = 'play'; this.phaseTime = 0; }
        break;
      case 'play':
        this.brawl.update(dt, new Map([[this.hero.id, this.controls()]]));
        this.updatePolice(dt);
        break;
      case 'dead':
        this.brawl.update(dt, new Map([[this.hero.id, NO_CONTROLS]]));
        this.updatePolice(dt);
        if (this.phaseTime >= DEATH_TIME) {
          if (this.lives > 0) this.respawn();
          else if (this.continues > 0) { this.phase = 'continue'; this.phaseTime = 0; this.continueT = 10; }
          else this.shell.endGame();
        }
        break;
      case 'continue':
        this.continueT -= dt;
        if (inp.justPressed('fire') || inp.justPressed('confirm') || inp.justPressed('jump')) {
          this.continues--;
          this.lives = START_LIVES;
          this.respawn();
          this.audio.blip();
        } else if (this.continueT <= 0) {
          this.shell.endGame();
        }
        break;
      case 'clear':
        this.brawl.update(dt, new Map([[this.hero.id, NO_CONTROLS]]));
        if (this.phaseTime >= CLEAR_TIME) this.nextRound();
        break;
      case 'ending':
        if (this.phaseTime >= 6 && (inp.justPressed('fire') || inp.justPressed('confirm'))) this.shell.endGame();
        break;
    }
  }

  /** For tests and debugging: force the hero to zero health. */
  killHero(): void {
    this.brawl.damage(null, this.hero, this.hero.hp, 'down', 60);
  }
}

export { HUD_H };
