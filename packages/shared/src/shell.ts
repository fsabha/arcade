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

/** One row of the global leaderboard as the API returns it. */
export interface GlobalEntry {
  initials: string;
  score: number;
  label: string;
  date: string;
}

export interface RemoteOptions<E> {
  /** game id used by the API (same as the hub id) */
  game: string;
  /** what to show next to the score (level, wave, variation...) */
  label(e: E): string;
  /** numeric sort key when the entry has no `score` field */
  score?(e: E): number;
}

export const API_SCORES = '/api/scores';

export interface ShellOptions<E extends ScoreEntry, S extends ShellSettings> {
  /** The ranking: results are sent to the global leaderboard and the ranking screen shows it. */
  remote?: RemoteOptions<E>;
  /** Title menu entries, in order. 'JOGAR' starts; SHELL_ITEMS are built in; the rest go to onItem. */
  items: readonly string[];
  /** @deprecated the ranking is global now; local tables are no longer written */
  scores?: ScoreStoreLike<E>;
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
  /** the global leaderboard top 10 (null = not loaded yet, [] = empty) */
  global: GlobalEntry[] | null = null;
  globalError = false;
  /** rank the API gave the last submitted result, if any */
  lastGlobalRank: number | null = null;
  private fetching = false;

  constructor(private opts: ShellOptions<E, S>) {
    this.settings = opts.settings.load();
    opts.audio.setMuted(!this.settings.sound);
    this.loadGlobal();
  }

  /** @deprecated kept for old renderers: the ranking lives on the server now */
  get highScores(): E[] {
    return [];
  }

  /** Best score on the leaderboard, for HUDs that show a record. */
  get bestScore(): number {
    return this.global?.[0]?.score ?? 0;
  }

  get items(): readonly string[] {
    return this.opts.items;
  }

  setState(s: ShellState): void {
    this.state = s;
    this.stateTime = 0;
    if (s === 'ranking') this.loadGlobal();
  }

  get hasRemote(): boolean {
    return !!this.opts.remote && typeof fetch === 'function' && typeof location !== 'undefined';
  }

  /** Fetches the top 10 (on start, when the ranking opens and after a submission). */
  loadGlobal(): void {
    const r = this.opts.remote;
    if (!r || this.fetching || !this.hasRemote) return;
    this.fetching = true;
    this.globalError = false;
    fetch(`${API_SCORES}?game=${encodeURIComponent(r.game)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { entries?: unknown }) => {
        // never trust the wire: coerce every field
        this.global = (Array.isArray(data.entries) ? data.entries : []).map((e) => {
          const r = (e ?? {}) as Record<string, unknown>;
          return { initials: String(r.initials ?? '').slice(0, 3), score: Number(r.score) || 0, label: String(r.label ?? '').slice(0, 24), date: String(r.date ?? '') };
        });
      })
      .catch(() => { this.globalError = true; })
      .finally(() => { this.fetching = false; });
  }

  /** Sends a result to the global leaderboard (fire and forget). */
  private submitGlobal(entry: E): void {
    const r = this.opts.remote;
    if (!r || !this.hasRemote) return;
    const score = r.score ? r.score(entry) : (entry as unknown as { score: number }).score;
    const body = { game: r.game, initials: entry.initials, score: Math.round(score), label: r.label(entry) };
    fetch(API_SCORES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rank?: number } | null) => { if (data && typeof data.rank === 'number') this.lastGlobalRank = data.rank; this.loadGlobal(); })
      .catch(() => undefined);
  }

  /** Does this result enter the top 10? Without a loaded table every positive result is offered the initials screen. */
  private entersTable(probe: E): boolean {
    if (!this.hasScore(probe)) return false;
    if (!this.global || this.global.length < 10) return true;
    const r = this.opts.remote;
    const score = r?.score ? r.score(probe) : (probe as unknown as { score: number }).score;
    return score > this.global[this.global.length - 1].score;
  }

  /** Rows of the ranking screen. */
  globalRows(): string[] {
    return (this.global ?? []).map((e, i) => `${String(i + 1).padStart(2, ' ')} ${e.initials.padEnd(3, ' ')} ${String(e.score).padStart(7, ' ')} ${e.label}`.trimEnd());
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
    const probe = this.opts.probe();
    this.qualifiesForRank = this.entersTable(probe);
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
        case 'RANKING': this.setState('ranking'); break;
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
        this.lastGlobalRank = null;
        this.submitGlobal(entry);
        this.setState('ranking');
      }
    }
  }
}
