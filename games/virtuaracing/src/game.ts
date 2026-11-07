import {
  MAX_SPEED, CARS, LAPS, COURSES, COURSE_NAMES, MODE_NAMES, START_TIME, CHECKPOINT_TIME, COUNTDOWN, FINISH_TIME, VIEWS, gearFor, raceScore,
  Course, Mode,
} from './config';
import { buildTrack, Track } from './track';
import { Race } from './race';
import { Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { settings, HighScore, Settings } from './storage';

export type State = ShellState;
export type Phase = 'countdown' | 'race' | 'finish' | 'timeup';

export const MENU_ITEMS = ['JOGAR', 'MODO', 'PISTA', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM', 'MUSICA'] as const;
export { PAUSE_ITEMS };

export class Game {
  shell: Shell<HighScore, Settings>;
  mode: Mode = 'arcade';
  course: Course = 'bigforest';
  track: Track = buildTrack('bigforest');
  race: Race;
  phase: Phase = 'countdown';
  phaseTime = 0;
  view = 1;
  /** arcade clock */
  timeLeft = 0;
  bonusFlash = 0;
  lastLap = 0;
  bestLap = 0;
  lapStart = 0;
  position = CARS;
  score = 0;
  time = 0;
  private beeps = 0;

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      settings,
      audio,
      onStart: () => this.startGame(),
      onItem: (item, delta) => {
        if (item === 'MODO') { const m: Mode[] = ['arcade', 'gp', 'free']; this.mode = m[(m.indexOf(this.mode) + (delta || 1) + 3) % 3]; }
        if (item === 'PISTA') { this.course = COURSES[(COURSES.indexOf(this.course) + (delta || 1) + 3) % 3]; }
      },
      onMusic: (on) => this.audio.setMusicEnabled(on),
      onStop: () => { this.audio.musicStop(); this.audio.setEngine(false, 0, 0); },
      onResume: () => this.audio.musicStart(),
      remote: { game: 'virtuaracing', label: (e) => `${e.laps} VOLTAS ${e.mode}` },
      entry: (initials) => ({ initials, score: this.score, laps: this.race.player.lap, mode: this.modeName, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, laps: this.race.player.lap, mode: this.modeName, date: '' }),
    });
    this.race = new Race(this.track, 1);
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

  get modeName(): string { return `${MODE_NAMES[this.mode]} ${COURSE_NAMES[this.course]}`; }
  get player() { return this.race.player; }
  get speedKmh(): number { return Math.round(this.player.speed * 3.6); }
  get gear(): number { return gearFor(this.player.speed); }
  get revs(): number { const k = this.player.speed / MAX_SPEED; const g = this.gear; return (k * 7 - (g - 1)); }

  // ---------- flow ----------

  startGame(): void {
    this.track = buildTrack(this.course);
    this.race = new Race(this.track, (Date.now() & 0xffff) + 1, this.mode === 'free' ? 0 : CARS - 1, LAPS);
    this.phase = 'countdown';
    this.phaseTime = 0;
    this.beeps = 0;
    this.timeLeft = START_TIME[this.course];
    this.score = 0;
    this.lastLap = 0; this.bestLap = 0; this.lapStart = 0;
    this.position = this.race.cars.length;
    this.shell.setState('playing');
    this.audio.setMusicEnabled(this.shell.settings.music !== false);
    this.audio.musicStart();
  }

  private finishRace(finished: boolean): void {
    const p = this.player;
    this.position = this.race.positionOf(p);
    this.score = raceScore(p.lap, finished ? this.position : null, this.race.time, this.course, finished);
    this.phase = finished ? 'finish' : 'timeup';
    this.phaseTime = 0;
    this.race.running = false;
    if (finished) this.audio.finish(); else this.audio.timeUp();
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.updatePlaying(dt);
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) { this.shell.pause(); return; }
    this.phaseTime += dt;
    this.bonusFlash = Math.max(0, this.bonusFlash - dt);
    if (inp.justPressed('special')) { this.view = (this.view + 1) % VIEWS; this.audio.view(); }

    switch (this.phase) {
      case 'countdown': {
        const n = Math.floor(this.phaseTime);
        if (n > this.beeps - 1 && n < 3) { this.beeps = n + 1; this.audio.countdown(false); }
        if (this.phaseTime >= COUNTDOWN) { this.phase = 'race'; this.phaseTime = 0; this.race.running = true; this.audio.countdown(true); }
        this.audio.setEngine(true, inp.isDown('fire') ? 0.8 : 0.2, 0);
        break;
      }
      case 'race': {
        this.race.update(dt, { gas: inp.isDown('fire') || inp.isDown('up'), brake: inp.isDown('jump') || inp.isDown('down'), left: inp.isDown('left'), right: inp.isDown('right') }, (c, e) => {
          if (!c.player) return;
          if (e === 'checkpoint' || e === 'lap') {
            if (this.mode === 'arcade') { this.timeLeft += CHECKPOINT_TIME[this.course]; this.bonusFlash = 1.5; }
            this.audio.checkpoint();
          }
          if (e === 'lap' || e === 'finish') {
            this.lastLap = this.race.time - this.lapStart;
            this.lapStart = this.race.time;
            if (!this.bestLap || this.lastLap < this.bestLap) this.bestLap = this.lastLap;
            if (e === 'lap') this.audio.lap();
          }
          if (e === 'finish') this.finishRace(true);
        });
        this.position = this.race.positionOf(this.player);
        if (this.mode === 'arcade') {
          this.timeLeft -= dt;
          if (this.timeLeft <= 0) { this.timeLeft = 0; this.finishRace(false); }
        }
        const p = this.player;
        if (p.bump > 0.25 && Math.floor(this.time * 20) % 10 === 0) this.audio.bump();
        if (Math.abs(p.steer) > 0.7 && p.speed > 40 && Math.floor(this.time * 10) % 4 === 0) this.audio.skid();
        this.audio.setEngine(true, Math.max(0, Math.min(1, this.revs)), p.speed / MAX_SPEED);
        break;
      }
      case 'finish':
      case 'timeup':
        this.audio.setEngine(false, 0, 0);
        if (this.phaseTime >= FINISH_TIME || (this.phaseTime > 1.5 && (inp.justPressed('fire') || inp.justPressed('confirm')))) this.shell.endGame();
        break;
    }
  }
}
