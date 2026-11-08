/**
 * BROTO's sound (direction: Lúcio). A warm low pad with a breath of wind; every seed let out is a
 * soft marimba tick on a pentatonic scale that climbs with the stream; multipliers answer with a
 * rising arpeggio; the clash of the crowds is a granular crackle whose density follows the fight;
 * the heart groans as it cracks; winning plays the theme on a music box. Night drops the pad.
 */
import { SoundBase } from '@arcade/shared';

const ROOT = 146.83; // D3
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const PROG = [0, -3, 5, 3]; // D, B, G, F (semitones from D)
const THEME = [12, 14, 16, 19, 16, 14, 12, 9, 12, 14, 16, 21, 19, 16, 14, 12];
const note = (semi: number) => ROOT * Math.pow(2, semi / 12);

export class Sound extends SoundBase {
  private musicOn = true;
  private bus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  private tick = 0;
  private lastTick = 0;
  private crackle = 0;
  /** night: the pad goes quiet */
  night = false;
  /** 0..1 how hard the crowds are fighting */
  fight = 0;

  constructor() {
    super(0.55);
  }

  private voice(freq: number, t: number, dur: number, vol: number, type: OscillatorType, attack: number, out: AudioNode, detune = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur * 0.4), dur / 3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 1.5);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopMusic();
  }

  startMusic(): void {
    if (!this.ctx || !this.master || this.timer || !this.musicOn) return;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.16;
    this.bus.connect(this.master);
    this.next = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus && this.ctx) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => b.disconnect(), 1500);
    }
    this.bus = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.bus) return;
    const beat = 60 / 84;
    while (this.next < this.ctx.currentTime + 0.3) {
      const t = this.next, s = this.step;
      const chord = PROG[Math.floor(s / 8) % PROG.length];
      if (s % 8 === 0 && !this.night) {
        this.voice(note(chord - 12), t, beat * 8, 0.13, 'sine', 1.2, this.bus);
        this.voice(note(chord - 5), t, beat * 8, 0.05, 'triangle', 1.6, this.bus, 7);
        this.voice(note(chord + 4), t + 0.05, beat * 8, 0.03, 'triangle', 1.8, this.bus, -7);
      }
      if (s % 8 === 4) this.noiseAt(t, 2.4, 0.03 + (this.night ? 0.03 : 0), 700); // wind
      // the crackle of the clash
      const grains = Math.round(this.fight * 6);
      for (let i = 0; i < grains; i++) this.noiseAt(t + Math.random() * beat, 0.03, 0.05 * this.fight, 2500 + Math.random() * 3000);
      this.next += beat;
      this.step++;
    }
  }

  private noiseAt(t: number, dur: number, vol: number, freq: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.3));
    g.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur / 4);
    src.connect(f).connect(g).connect(this.bus ?? this.master);
    src.start(t);
    src.stop(t + dur + 0.5);
  }

  // ---------- effects ----------

  /** a seed let out: soft marimba ticks, at most ~14 a second, climbing the scale */
  fire(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (now - this.lastTick < 0.07) return;
    this.lastTick = now;
    this.tick = (this.tick + 1) % PENTA.length;
    this.voice(note(PENTA[this.tick] + 12), now, 0.18, 0.025, 'sine', 0.003, this.master);
  }

  /** a gate: dew trickles, roots answer a fifth, bloom a triad, the well an octave with a bell */
  gate(op: string, n: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const m = this.master;
    if (op === 'add') { this.voice(note(28), t, 0.25, 0.04, 'sine', 0.003, m); return; }
    if (op === 'sub') { this.voice(note(6), t, 0.15, 0.04, 'square', 0.003, m); return; }
    if (op === 'div') { this.voice(note(10), t, 0.3, 0.04, 'triangle', 0.003, m); this.voice(note(5), t + 0.06, 0.3, 0.03, 'triangle', 0.003, m); return; }
    const steps = op === 'well' ? [0, 12, 24] : n >= 3 ? [0, 4, 7] : [0, 7];
    steps.forEach((st, i) => this.voice(note(12 + st), t + i * 0.06, 0.6, 0.05, 'triangle', 0.005, m));
    if (op === 'well') this.voice(note(36), t + 0.2, 1.2, 0.04, 'sine', 0.002, m);
  }

  clash(): void {
    this.crackle++;
  }

  hit(): void {
    if (!this.ctx || !this.master) return;
    this.voice(note(PENTA[Math.floor(Math.random() * 5)] + 24), this.ctx.currentTime, 0.2, 0.03, 'sine', 0.002, this.master);
  }

  /** stone grinding as the heart cracks */
  crack(): void {
    this.tone(55, 0.5, 'sawtooth', 0.08, 38);
    this.noise(0.4, 0.15, 400);
  }

  shield(): void {
    this.tone(note(-5), 0.08, 'triangle', 0.02);
  }

  open(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [0, 7, 12, 19].forEach((n, i) => this.voice(note(n + 12), t + i * 0.08, 1, 0.06, 'triangle', 0.01, this.master!));
  }

  surge(): void {
    this.noise(1.6, 0.3, 500);
    this.tone(70, 1.4, 'sawtooth', 0.09, 45);
  }

  petal(): void {
    this.tone(62, 0.6, 'sine', 0.35, 38);
    this.noise(0.3, 0.2, 800);
  }

  sprout(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [0, 4, 7, 12, 16].forEach((n, i) => this.voice(note(n), t + i * 0.04, 0.8, 0.07, 'triangle', 0.005, this.master!));
  }

  countdown(last: boolean): void {
    if (last) this.sprout();
    else this.tone(note(19), 0.15, 'sine', 0.06);
  }

  /** the music box plays the theme */
  win(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    THEME.forEach((n, i) => {
      this.voice(note(n + 12), t + 0.4 + i * 0.16, 0.9, 0.06, 'sine', 0.002, this.master!);
      this.voice(note(n + 24), t + 0.4 + i * 0.16, 0.4, 0.015, 'sine', 0.002, this.master!);
    });
    this.tone(48, 1.4, 'sine', 0.3, 30);
  }

  lose(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [12, 9, 7, 4, 0].forEach((n, i) => this.voice(note(n), t + i * 0.28, 1.4, 0.06, 'sine', 0.04, this.master!));
  }

  blip(): void {
    this.tone(note(24), 0.07, 'sine', 0.06);
  }
}
