/**
 * COMETA's sound: a generative space-synth score (slow pad chords, a pentatonic arpeggio that
 * quickens with the comet's speed, a soft pulse) kept well under the effects, plus effects that
 * sing on the same scale: every orb of a combo climbs one note.
 */
import { SoundBase } from '@arcade/shared';

const ROOT = 146.83; // D3
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]; // D major pentatonic over two octaves
const CHORDS = [[0, 7, 14, 16], [-3, 4, 12, 16], [-5, 2, 11, 14], [-7, 0, 9, 16]]; // I vi V IV, open voicings
const note = (semi: number) => ROOT * Math.pow(2, semi / 12);

export class Sound extends SoundBase {
  private musicOn = true;
  private bus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  /** 0..1, how hard the score drives (follows the speed) */
  intensity = 0;
  private delay: DelayNode | null = null;

  constructor() {
    super(0.55);
  }

  protected onUnlock(): void {
    const ctx = this.ctx!;
    // a long echo gives the space feel
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.375;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.master!);
  }

  private voice(freq: number, t: number, dur: number, vol: number, type: OscillatorType, attack: number, out: AudioNode, detune = 0, echo = false): void {
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
    if (echo && this.delay) g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 1.5);
  }

  // ---------- music ----------

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
    this.timer = setInterval(() => this.schedule(), 90);
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
    const bpm = 96 + this.intensity * 30;
    const sixteenth = 60 / bpm / 4;
    while (this.next < this.ctx.currentTime + 0.25) {
      const t = this.next, s = this.step;
      const bar = Math.floor(s / 16), chord = CHORDS[bar % 4];
      if (s % 16 === 0) {
        // pad: four detuned voices swelling over the bar
        for (const n of chord) for (const dt of [-7, 7]) this.voice(note(n), t, sixteenth * 16, 0.05, 'triangle', 0.6, this.bus, dt);
        this.voice(note(chord[0] - 12), t, sixteenth * 16, 0.12, 'sine', 0.05, this.bus);
      }
      // pulse on the beats once the run gets going
      if (s % 4 === 0 && this.intensity > 0.15) this.voice(note(chord[0] - 12), t, sixteenth * 2, 0.06 + this.intensity * 0.05, 'sine', 0.005, this.bus);
      // arpeggio: every eighth at first, every sixteenth when fast
      const dense = this.intensity > 0.55;
      if (dense || s % 2 === 0) {
        const pattern = [0, 2, 1, 3, 2, 4, 3, 1];
        const k = pattern[(s >> (dense ? 0 : 1)) % pattern.length];
        const semi = chord[k % chord.length] + (k > 3 ? 12 : 0) + 12;
        this.voice(note(semi), t, sixteenth * 3, 0.045, 'sine', 0.004, this.bus, 0, true);
      }
      this.next += sixteenth;
      this.step++;
    }
  }

  // ---------- effects ----------

  orb(combo: number): void {
    if (!this.ctx || !this.master) return;
    const semi = SCALE[Math.min(SCALE.length - 1, combo % SCALE.length)] + 24 + Math.floor(combo / SCALE.length) * 0;
    const t = this.ctx.currentTime;
    this.voice(note(semi), t, 0.35, 0.12, 'sine', 0.004, this.master, 0, true);
    this.voice(note(semi + 12), t, 0.2, 0.04, 'triangle', 0.004, this.master);
  }

  gate(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [24, 28, 31, 36].forEach((n, i) => this.voice(note(n), t + i * 0.05, 0.5, 0.08, 'triangle', 0.005, this.master!, 0, true));
  }

  sling(): void {
    this.tone(note(12), 0.6, 'sine', 0.12, note(36));
    this.tone(note(19), 0.6, 'triangle', 0.05, note(43), 0.05);
  }

  dash(): void {
    this.noise(0.35, 0.18, 4000);
    this.tone(220, 0.3, 'sawtooth', 0.05, 660);
  }

  smash(): void {
    this.noise(0.3, 0.25, 2500);
    this.tone(110, 0.25, 'square', 0.06, 50);
  }

  hit(): void {
    this.noise(0.5, 0.35, 1200);
    this.tone(90, 0.5, 'sawtooth', 0.12, 35);
  }

  level(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [12, 16, 19, 24, 28].forEach((n, i) => this.voice(note(n), t + i * 0.08, 0.8, 0.07, 'sine', 0.01, this.master!, 0, true));
  }

  gameOver(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [24, 19, 16, 12, 7, 0].forEach((n, i) => this.voice(note(n), t + i * 0.14, 0.9, 0.08, 'triangle', 0.01, this.master!, 0, true));
  }

  blip(): void {
    this.tone(note(24), 0.08, 'sine', 0.08);
  }
}
