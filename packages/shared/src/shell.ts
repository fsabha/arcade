import type { Input } from './input';
import type { ScoreEntry } from './storage';

/**
 * The part every game shares: title menu, how-to and ranking screens, pause, game over
 * and initials entry. The game owns only `playing`; the shell owns the rest.
 */
export type ShellState = 'menu' | 'howto' | 'ranking' | 'playing' | 'paused' | 'gameover' | 'initials';

export const PAUSE_ITEMS = ['CONTINUAR', 'SAIR PARA O MENU'] as const;
export const INITIALS_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
/** Menu items the shell handles by itself. */
export const SHELL_ITEMS = ['COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;

export interface ShellAudio {
  blip(): void;
  gameOver(): void;
  setMuted(m: boolean): void;
}

export interface ShellSettings {
  crt: boolean;
  sound: boolean;
  music?: boolean;
}

export interface ScoreStoreLike<E extends ScoreEntry> {
  load(): E[];
  save(list: E[]): void;
  insert(list: E[], entry: E): E[];
  beatsTable(list: E[], probe: E): boolean;
}

export interface SettingsStoreLike<S> {
  load(): S;
  save(value: S): void;
}

export interface ShellOptions<E extends ScoreEntry, S extends ShellSettings> {
  /** Title menu entries, in order. 'JOGAR' starts; SHELL_ITEMS are built in; the rest go to onItem. */
  items: readonly string[];
  scores: ScoreStoreLike<E>;
  settings: SettingsStoreLike<S>;
  audio: ShellAudio;
  onStart(): void;
  /** A game-specific item was confirmed (delta 0) or cycled with left/right (delta -1 / +1). */
  onItem?(item: string, delta: -1 | 0 | 1): void;
  /** The entry to store when the player confirms their initials. */
  entry(initials: string): E;
  /** A probe entry for the "does this result enter the table?" check (score fields filled, no initials). */
  probe(): E;
  /** Called whenever play stops: leaving to the menu, pausing, game over. */
  onStop?(): void;
  /** Called when play resumes from pause. */
  onResume?(): void;
  onMusic?(on: boolean): void;
  /** Seconds the game over screen waits before accepting a key (default 2). */
  gameOverDelay?: number;
}

export class Shell<E extends ScoreEntry, S extends ShellSettings> {
  state: ShellState = 'menu';
  stateTime = 0;
  menuIndex = 0;
  pauseIndex = 0;
  initials = ['A', 'A', 'A'];
  initialsPos = 0;
  qualifiesForRank = false;
  settings: S;
  highScores: E[];

  constructor(private opts: ShellOptions<E, S>) {
    this.settings = opts.settings.load();
    this.highScores = opts.scores.load();
    opts.audio.setMuted(!this.settings.sound);
  }

  get items(): readonly string[] {
    return this.opts.items;
  }

  setState(s: ShellState): void {
    this.state = s;
    this.stateTime = 0;
  }

  /** Label suffix for the built-in toggles. */
  label(item: string): string {
    switch (item) {
      case 'CRT': return `CRT: ${this.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      case 'SOM': return `SOM: ${this.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      case 'MUSICA': return `MUSICA: ${this.settings.music !== false ? 'LIGADA' : 'DESLIGADA'}`;
      default: return item;
    }
  }

  toggleCrt(): void {
    this.settings = { ...this.settings, crt: !this.settings.crt };
    this.opts.settings.save(this.settings);
  }

  toggleSound(): void {
    this.settings = { ...this.settings, sound: !this.settings.sound };
    this.opts.settings.save(this.settings);
    this.opts.audio.setMuted(!this.settings.sound);
  }

  toggleMusic(): void {
    const on = this.settings.music === false;
    this.settings = { ...this.settings, music: on };
    this.opts.settings.save(this.settings);
    this.opts.onMusic?.(on);
  }

  /** Game over: decide whether the result enters the ranking and show the screen. */
  endGame(): void {
    this.highScores = this.opts.scores.load();
    const probe = this.opts.probe();
    this.qualifiesForRank = this.hasScore(probe) && this.opts.scores.beatsTable(this.highScores, probe);
    this.opts.audio.gameOver();
    this.opts.onStop?.();
    this.setState('gameover');
  }

  private hasScore(e: E): boolean {
    const s = (e as unknown as { score?: number }).score;
    return typeof s !== 'number' || s > 0;
  }

  pause(): void {
    this.pauseIndex = 0;
    this.opts.onStop?.();
    this.setState('paused');
  }

  toMenu(): void {
    this.opts.onStop?.();
    this.setState('menu');
  }

  /**
   * Advances the shell's own states. Returns true when the game should run its playing update.
   * Mute (M) and CRT (C) hotkeys work everywhere.
   */
  update(dt: number, inp: Input): boolean {
    this.stateTime += dt;
    if (inp.justPressed('mute')) this.toggleSound();
    if (inp.justPressed('crt')) this.toggleCrt();
    switch (this.state) {
      case 'menu': this.updateMenu(inp); return false;
      case 'howto':
      case 'ranking':
        if (inp.justPressed('confirm') || inp.justPressed('fire') || inp.justPressed('back') || inp.justPressed('pause')) {
          this.opts.audio.blip();
          this.setState('menu');
        }
        return false;
      case 'paused': this.updatePaused(inp); return false;
      case 'gameover': this.updateGameOver(inp); return false;
      case 'initials': this.updateInitials(inp); return false;
      case 'playing': return true;
    }
  }

  private updateMenu(inp: Input): void {
    const items = this.opts.items;
    const n = items.length;
    const audio = this.opts.audio;
    if (inp.justPressed('up')) { this.menuIndex = (this.menuIndex + n - 1) % n; audio.blip(); }
    if (inp.justPressed('down')) { this.menuIndex = (this.menuIndex + 1) % n; audio.blip(); }
    const item = items[this.menuIndex];
    const builtIn = (SHELL_ITEMS as readonly string[]).includes(item) || item === 'JOGAR';
    const delta = (inp.justPressed('right') ? 1 : 0) - (inp.justPressed('left') ? 1 : 0);
    if (delta !== 0 && !builtIn) { this.opts.onItem?.(item, delta as 1 | -1); audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      audio.blip();
      switch (item) {
        case 'JOGAR': this.setState('playing'); this.opts.onStart(); break;
        case 'COMO JOGAR': this.setState('howto'); break;
        case 'RANKING': this.highScores = this.opts.scores.load(); this.setState('ranking'); break;
        case 'CRT': this.toggleCrt(); break;
        case 'SOM': this.toggleSound(); break;
        case 'MUSICA': this.toggleMusic(); break;
        default: this.opts.onItem?.(item, 0);
      }
    }
  }

  private updatePaused(inp: Input): void {
    const n = PAUSE_ITEMS.length;
    const audio = this.opts.audio;
    if (inp.justPressed('up')) { this.pauseIndex = (this.pauseIndex + n - 1) % n; audio.blip(); }
    if (inp.justPressed('down')) { this.pauseIndex = (this.pauseIndex + 1) % n; audio.blip(); }
    if (inp.justPressed('pause')) { this.resume(); return; }
    if (inp.justPressed('back')) { this.toMenu(); return; }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      if (this.pauseIndex === 0) this.resume();
      else this.toMenu();
    }
  }

  private resume(): void {
    this.setState('playing');
    this.opts.onResume?.();
  }

  private updateGameOver(inp: Input): void {
    if (this.stateTime < (this.opts.gameOverDelay ?? 2)) return;
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      this.opts.audio.blip();
      if (this.qualifiesForRank) {
        this.initials = ['A', 'A', 'A'];
        this.initialsPos = 0;
        this.setState('initials');
      } else {
        this.setState('menu');
      }
    }
  }

  private updateInitials(inp: Input): void {
    const L = INITIALS_LETTERS;
    const audio = this.opts.audio;
    const i = this.initialsPos;
    const cur = L.indexOf(this.initials[i]);
    if (inp.justPressed('up')) { this.initials[i] = L[(cur + 1) % L.length]; audio.blip(); }
    if (inp.justPressed('down')) { this.initials[i] = L[(cur + L.length - 1) % L.length]; audio.blip(); }
    if (inp.justPressed('left') || inp.justPressed('back')) { this.initialsPos = Math.max(0, i - 1); audio.blip(); }
    if (inp.justPressed('right')) { this.initialsPos = Math.min(2, i + 1); audio.blip(); }
    if (inp.justPressed('confirm') || inp.justPressed('fire')) {
      audio.blip();
      if (i < 2) {
        this.initialsPos = i + 1;
      } else {
        const entry = this.opts.entry(this.initials.join(''));
        this.highScores = this.opts.scores.insert(this.highScores, entry);
        this.opts.scores.save(this.highScores);
        this.setState('ranking');
      }
    }
  }
}
