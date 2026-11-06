/**
 * Chiptune loops for the games' background music. A tune is a list of steps (eighth notes)
 * for a square-wave lead, an optional bass line in quarter notes and an optional drum tick.
 * Notes are written as names ('C4', 'F#5', '-' for a rest) and resolved to Hz.
 */
export interface Tune {
  bpm: number;
  /** eighth notes: note names, '-' for rest, '=' to hold the previous note */
  melody: string[];
  /** quarter notes, aligned with every second melody step */
  bass?: string[];
  drum?: boolean;
  lead?: OscillatorType;
  volume?: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' -> 440, 'C#5' -> 554.4; '-' -> 0. */
export function noteHz(name: string): number {
  if (name === '-' || name === '=') return 0;
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 0;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const octave = Number(m[3]);
  n += (octave - 4) * 12;
  return 440 * Math.pow(2, (n - 9) / 12);
}

export interface MusicHost {
  readonly ctx: AudioContext | null;
  play(freq: number, dur: number, type: OscillatorType, vol: number, delay: number, slideTo?: number): void;
}

/** Schedules a tune a little ahead of the audio clock, looping until stopped. */
export class MusicLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  private enabled = true;
  private wanted = false;
  private tune: Tune | null = null;

  constructor(private host: MusicHost) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stopScheduler();
    else if (this.wanted) this.startScheduler();
  }

  start(tune?: Tune): void {
    if (tune && tune !== this.tune) { this.tune = tune; this.stopScheduler(); }
    this.wanted = true;
    if (this.enabled) this.startScheduler();
  }

  stop(): void {
    this.wanted = false;
    this.stopScheduler();
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  private startScheduler(): void {
    if (this.timer || !this.host.ctx || !this.tune) return;
    this.next = this.host.ctx.currentTime + 0.08;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 120);
    this.schedule();
  }

  private stopScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.host.ctx;
    const t = this.tune;
    if (!ctx || !t) return;
    const beat = 60 / t.bpm / 2; // one eighth note
    const vol = t.volume ?? 0.04;
    while (this.next < ctx.currentTime + 0.3) {
      const i = this.step % t.melody.length;
      const name = t.melody[i];
      const delay = this.next - ctx.currentTime;
      if (name !== '-' && name !== '=') {
        // hold ('=') extends the note: count the following holds
        let len = 1;
        while (t.melody[(i + len) % t.melody.length] === '=' && len < 8) len++;
        this.host.play(noteHz(name), beat * len * 0.92, t.lead ?? 'square', vol, delay);
      }
      if (t.bass && i % 2 === 0) {
        const b = t.bass[(i / 2) % t.bass.length];
        if (b !== '-' && b !== '=') this.host.play(noteHz(b), beat * 1.8, 'triangle', vol * 1.8, delay);
      }
      if (t.drum && i % 4 === 0) this.host.play(90, 0.06, 'square', vol * 1.2, delay, 40);
      this.next += beat;
      this.step++;
    }
  }
}
