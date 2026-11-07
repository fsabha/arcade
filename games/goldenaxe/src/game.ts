import {
  W, HUD_H, FLOOR_TOP, FLOOR_BOTTOM, START_LIVES, CONTINUES, BAR, HERO_IDS, HERO_NAMES, MAX_POTS, MAGIC_DAMAGE, STAGE_INTRO_TIME,
  CAMP_TIME, DEATH_TIME, CLEAR_TIME, POINTS, healthFor, enemyScale, HeroId, Difficulty,
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
export type Phase = 'intro' | 'play' | 'camp' | 'dead' | 'continue' | 'clear' | 'ending';

export const MENU_ITEMS = ['JOGAR', 'HEROI', 'DIFICULDADE', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

export interface MagicFx { kind: HeroId; level: number; t: number }

const CAMP_STAGE: StageDef = { id: 'camp', name: 'ACAMPAMENTO', theme: 'camp', length: W, floorTop: FLOOR_TOP, floorBottom: FLOOR_BOTTOM, waves: [], items: [], mounts: [] };

export class Game {
  shell: Shell<HighScore, Settings>;
  heroId: HeroId = 'ax';
  difficulty: Difficulty = 'normal';
  phase: Phase = 'intro';
  phaseTime = 0;
  stageIndex = 0;
  brawl: Brawl;
  hero: Actor;
  score = 0;
  lives = START_LIVES;
  continues = CONTINUES;
  pots = 1;
  magicFx: MagicFx | null = null;
  /** last enemy hit, for the HUD bar */
  focus: Actor | null = null;
  focusT = 0;
  continueT = 0;
  campThieves = 0;
  shake = 0;
  time = 0;

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
      remote: { game: 'goldenaxe', label: (e) => `FASE ${e.stage} ${e.mode}` },
      entry: (initials) => ({ initials, score: this.score, stage: this.stageIndex + 1, mode: this.modeName, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, stage: this.stageIndex + 1, mode: this.modeName, date: '' }),
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

  get stage(): StageDef { return STAGES[this.stageIndex]; }
  get heroName(): string { return HERO_NAMES[this.heroId]; }
  get maxPots(): number { return MAX_POTS[this.heroId]; }
  get modeName(): string { return `${this.heroName.split(' ')[0]} ${this.difficulty === 'easy' ? 'FACIL' : this.difficulty === 'hard' ? 'DIFICIL' : 'NORMAL'}`; }
  get difficultyName(): string { return this.difficulty === 'easy' ? 'FACIL' : this.difficulty === 'hard' ? 'DIFICIL' : 'NORMAL'; }

  // ---------- flow ----------

  private makeBrawl(stage: StageDef): Brawl {
    return new Brawl(stage, DEFS, W, (this.stageIndex * 7919 + Date.now()) >>> 0, {
      onHit: (from, t, dmg, knock) => {
        if (knock === 'flee') { this.audio.thief(); return; }
        if (t.team === 'enemy') { this.focus = t; this.focusT = 2.5; }
        if (dmg >= 2 || knock !== 'hit') this.audio.heavy(); else this.audio.hit();
        if (t.team === 'hero') this.audio.grunt();
        void from;
      },
      onKill: (a) => { if (a.team === 'enemy') this.addScore(a.def.points); },
      onItem: (_h, item) => this.pickUp(item),
      onSpecial: () => this.castMagic(),
      onHeroDown: () => this.heroDown(),
      onStageClear: () => this.stageClear(),
      onJump: () => this.audio.jump(),
      onSwing: (a, mv) => { if (a.team === 'hero' || mv === 'ranged') this.audio.swing(); },
      onThrow: () => this.audio.heavy(),
    }, enemyScale(this.difficulty));
  }

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.continues = CONTINUES;
    this.pots = 1;
    this.stageIndex = 0;
    this.startStage();
    this.shell.setState('playing');
    this.audio.setMusicEnabled(this.shell.settings.music !== false);
    this.audio.musicStart();
  }

  private startStage(): void {
    this.brawl = this.makeBrawl(this.stage);
    this.hero = this.brawl.addHero(this.heroId, 60, 185);
    this.hero.hp = this.hero.maxHp = healthFor(this.difficulty);
    this.hero.magic = this.pots;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.magicFx = null;
    this.focus = null;
  }

  private startCamp(): void {
    this.brawl = this.makeBrawl(CAMP_STAGE);
    this.hero = this.brawl.addHero(this.heroId, 150, 185);
    this.hero.hp = this.hero.maxHp = healthFor(this.difficulty);
    this.hero.hp = Math.max(this.hero.hp, this.lastHp);
    this.hero.magic = this.pots;
    this.campThieves = 2 + Math.floor(this.stageIndex / 3);
    for (let i = 0; i < this.campThieves; i++) {
      const t = this.brawl.spawn(i % 2 ? 'thiefGreen' : 'thiefBlue', 40 + i * 70, 165 + (i % 3) * 18, 'neutral');
      t.state = 'flee';
      t.facing = i % 2 ? -1 : 1;
    }
    this.phase = 'camp';
    this.phaseTime = 0;
  }

  private lastHp = 0;

  private respawn(): void {
    const b = this.brawl;
    const h = b.addHero(this.heroId, b.scrollX + 40, 185);
    h.hp = h.maxHp = healthFor(this.difficulty);
    h.magic = this.pots;
    h.invuln = 2;
    this.hero = h;
    this.phase = 'play';
    this.phaseTime = 0;
  }

  private heroDown(): void {
    this.audio.heroDown();
    this.lives--;
    this.phase = 'dead';
    this.phaseTime = 0;
  }

  private stageClear(): void {
    if (this.phase !== 'play') return; // the camp "stage" has no end of its own
    this.addScore(POINTS.stageClear);
    this.audio.stageClear();
    this.lastHp = this.hero.hp;
    this.pots = this.hero.magic;
    this.phase = 'clear';
    this.phaseTime = 0;
  }

  private nextStage(): void {
    if (this.stageIndex >= STAGES.length - 1) { this.phase = 'ending'; this.phaseTime = 0; return; }
    this.stageIndex++;
    this.startStage();
    this.hero.hp = Math.max(this.hero.hp, this.lastHp);
  }

  private pickUp(item: Item): void {
    switch (item.kind) {
      case 'pot':
        if (this.hero.magic < this.maxPots) this.hero.magic++;
        else this.addScore(POINTS.potBonus);
        this.audio.pot();
        break;
      case 'food':
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + (item.value || BAR));
        this.audio.food();
        break;
      case 'points': this.addScore(item.value || 500); break;
      case 'life': this.lives++; break;
      default: break;
    }
  }

  /** Magic: every pot is spent at once; damage grows with the number of pots (the cartridge's levels). */
  private castMagic(): boolean {
    const pots = this.hero.magic;
    if (pots <= 0) return false;
    this.hero.magic = 0;
    const dmg = Math.round(MAGIC_DAMAGE[this.heroId] * pots);
    const n = this.brawl.blast(this.hero, dmg, pots >= 3 ? 'launch' : 'down');
    this.magicFx = { kind: this.heroId, level: pots, t: 0 };
    this.shake = 0.6;
    this.audio.magic(this.heroId);
    void n;
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

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) { this.shell.pause(); return; }
    this.phaseTime += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.focusT = Math.max(0, this.focusT - dt);
    if (this.magicFx) { this.magicFx.t += dt; if (this.magicFx.t > 1.4) this.magicFx = null; }

    switch (this.phase) {
      case 'intro':
        if (this.phaseTime >= STAGE_INTRO_TIME || inp.justPressed('fire')) { this.phase = 'play'; this.phaseTime = 0; }
        break;
      case 'play':
        this.brawl.update(dt, new Map([[this.hero.id, this.controls()]]));
        break;
      case 'camp':
        this.brawl.update(dt, new Map([[this.hero.id, this.controls()]]));
        if (this.phaseTime >= CAMP_TIME || this.brawl.actors.every((a) => a.team !== 'neutral' || a.dead)) {
          this.lastHp = this.hero.hp;
          this.pots = this.hero.magic;
          this.nextStage();
        }
        break;
      case 'dead':
        this.brawl.update(dt, new Map([[this.hero.id, NO_CONTROLS]]));
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
        if (this.phaseTime >= CLEAR_TIME) {
          if (this.stage.camp && this.stageIndex < STAGES.length - 1) this.startCamp();
          else this.nextStage();
        }
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
