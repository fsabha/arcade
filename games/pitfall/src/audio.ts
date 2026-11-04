import { SoundBase } from '@arcade/shared';
// A minor pentatonic jungle loop: 32 eighth notes of melody over a 16-beat bass line.
const A4 = 440, C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880, G4 = 392, E4 = 330, D4 = 294;
const MELODY = [
  A4, C5, E5, D5, C5, A4, G4, A4, E5, D5, C5, A4, G4, E4, G4, A4,
  C5, D5, E5, G5, A5, G5, E5, D5, C5, A4, G4, A4, C5, 0, D4, E4,
];
const BASS = [110, 110, 82.4, 82.4, 98, 98, 73.4, 73.4, 110, 110, 82.4, 82.4, 98, 98, 65.4, 73.4];

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  private musicOn = true; // user setting
  private musicWanted = false; // game wants music playing
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicNext = 0;
  private musicStep = 0;

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  /** Tarzan yell when Harry grabs the vine: a yodel between two registers. */
  yell(): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    // alternating low/high "ah-ee-ah-ee" pattern, rising then settling
    const pattern = [440, 880, 494, 988, 523, 1047, 587, 1175, 523, 1047, 494, 988, 440, 880, 392, 784, 349];
    const dur = 0.09;
    pattern.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, t0 + i * dur);
      osc.frequency.linearRampToValueAtTime(freq * 1.04, t0 + (i + 1) * dur);
    });
    const end = t0 + pattern.length * dur;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.05);
    g.gain.setValueAtTime(0.16, end - 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, end + 0.15);
    osc.connect(f).connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(end + 0.2);
  }

  // ---------- background music (original jungle loop, not the cartridge's) ----------

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopScheduler();
    else if (this.musicWanted) this.startScheduler();
  }

  musicStart(): void {
    this.musicWanted = true;
    if (this.musicOn) this.startScheduler();
  }

  musicStop(): void {
    this.musicWanted = false;
    this.stopScheduler();
  }

  private startScheduler(): void {
    if (this.musicTimer || !this.ctx) return;
    this.musicNext = this.ctx.currentTime + 0.1;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 120);
    this.scheduleMusic();
  }

  private stopScheduler(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic(): void {
    if (!this.ctx) return;
    const beat = 60 / 132 / 2; // eighth notes at 132 bpm
    while (this.musicNext < this.ctx.currentTime + 0.3) {
      const i = this.musicStep % MELODY.length;
      const m = MELODY[i];
      if (m > 0) this.tone(m, beat * 0.9, 'square', 0.035, undefined, this.musicNext - this.ctx.currentTime);
      if (i % 2 === 0) {
        const b = BASS[(i / 2) % BASS.length];
        this.tone(b, beat * 1.8, 'triangle', 0.07, undefined, this.musicNext - this.ctx.currentTime);
      }
      if (i % 4 === 0) this.tone(90, 0.06, 'square', 0.05, 40, this.musicNext - this.ctx.currentTime); // drum
      this.musicNext += beat;
      this.musicStep++;
    }
  }

  /** Rising "boing" of the jump. */
  jump(): void {
    this.tone(300, 0.18, 'square', 0.1, 700);
  }

  /** Thud of a rolling log. */
  hitLog(): void {
    this.tone(140, 0.2, 'sawtooth', 0.12, 60);
  }

  fall(): void {
    this.tone(600, 0.5, 'square', 0.1, 80);
  }

  sink(): void {
    this.tone(200, 0.5, 'sawtooth', 0.1, 40);
  }

  /** The classic rising arpeggio when a treasure is found. */
  treasure(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.08));
  }

  die(): void {
    const notes = [660, 520, 400, 300, 200];
    notes.forEach((f, i) => this.tone(f, 0.18, 'square', 0.12, undefined, i * 0.14));
  }

  tick(): void {
    this.tone(1000, 0.04, 'square', 0.08);
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }

  finished(): void {
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((f, i) => this.tone(f, 0.25, 'square', 0.12, undefined, i * 0.15));
  }
}
