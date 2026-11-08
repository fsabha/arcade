/**
 * LUME's sound: the score is made of the lights you carry. A low drone always plays; every light
 * in the tail adds a voice to the chord (up to eight) and, past a few, a slow arpeggio joins, so
 * losing the tail thins the music out. Low light filters everything down and a heartbeat comes in.
 */
import { SoundBase } from '@arcade/shared';

const ROOT = 110; // A2
const MODE = [0, 3, 7, 10, 14, 15, 19, 22, 26]; // A minor 9 colours, stacked
const PROG = [0, -4, -2, -7]; // i, VI, VII, iv (in semitones from A)
const note = (semi: number) => ROOT * Math.pow(2, semi / 12);

export class Sound extends SoundBase {
  private musicOn = true;
  private bus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private next = 0;
  private step = 0;
  /** lights in the tail: how many voices sing */
  voices = 0;
  /** 0..1 of Lume's light: low light darkens the music */
  light = 1;

  constructor() {
    super(0.55);
  }

  protected onUnlock(): void {
    const ctx = this.ctx!;
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.5;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const wet = ctx.createGain(); wet.gain.value = 0.4;
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
    g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur * 0.5), dur / 3);
    o.connect(g).connect(out);
    if (echo && this.delay) g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 2);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!on) this.stopMusic();
  }

  startMusic(): void {
    if (!this.ctx || !this.master || this.timer || !this.musicOn) return;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 4000;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.18;
    this.bus.connect(this.filter).connect(this.master);
    this.next = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stopMusic(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus && this.ctx) {
      const b = this.bus, f = this.filter;
      b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      setTimeout(() => { b.disconnect(); f?.disconnect(); }, 2000);
    }
    this.bus = null;
    this.filter = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.bus) return;
    const eighth = 60 / 76 / 2;
    if (this.filter) this.filter.frequency.setTargetAtTime(500 + 3800 * this.light * this.light, this.ctx.currentTime, 0.4);
    while (this.next < this.ctx.currentTime + 0.3) {
      const t = this.next, s = this.step;
      const chord = PROG[Math.floor(s / 16) % PROG.length];
      if (s % 16 === 0) {
        // the drone is always there
        this.voice(note(chord - 12), t, eighth * 16, 0.16, 'sine', 1.2, this.bus);
        this.voice(note(chord - 5), t, eighth * 16, 0.05, 'triangle', 1.5, this.bus, 6);
        // one voice per carried light
        const n = Math.min(8, this.voices);
        for (let i = 0; i < n; i++) this.voice(note(chord + MODE[i % MODE.length] + 12), t + i * 0.03, eighth * 16, 0.035, 'triangle', 1.0, this.bus, (i % 2 ? 5 : -5), true);
      }
      // a slow music-box arpeggio once the tail is long
      if (this.voices >= 4 && s % 2 === 0) {
        const pat = [0, 2, 4, 1, 3, 5, 2, 4];
        const k = pat[(s >> 1) % pat.length] % Math.min(this.voices, MODE.length);
        this.voice(note(chord + MODE[k] + 24), t, eighth * 3, 0.04, 'sine', 0.005, this.bus, 0, true);
      }
      // heartbeat in the dark
      if (this.light < 0.25 && s % 8 === 0) { this.voice(52, t, 0.2, 0.45, 'sine', 0.004, this.bus); this.voice(48, t + 0.18, 0.2, 0.32, 'sine', 0.004, this.bus); }
      this.next += eighth;
      this.step++;
    }
  }

  // ---------- effects ----------

  pick(n: number): void {
    if (!this.ctx || !this.master) return;
    const semi = MODE[(n - 1) % MODE.length] + 24 + Math.floor((n - 1) / MODE.length) * 12;
    this.voice(note(Math.min(semi, 48)), this.ctx.currentTime, 0.5, 0.1, 'sine', 0.004, this.master, 0, true);
  }

  regain(): void {
    this.tone(note(31), 0.25, 'sine', 0.07, note(36));
  }

  cut(): void {
    // glass snapping
    this.noise(0.25, 0.22, 7000);
    this.tone(note(38), 0.3, 'triangle', 0.06, note(26));
    this.tone(note(33), 0.3, 'triangle', 0.05, note(21), 0.05);
  }

  hurt(): void {
    this.noise(0.45, 0.3, 900);
    this.tone(70, 0.5, 'sawtooth', 0.1, 30);
  }

  pulse(): void {
    this.tone(55, 0.7, 'sine', 0.35, 30);
    this.noise(0.5, 0.15, 3000);
    this.tone(note(36), 0.4, 'sine', 0.05, note(24), 0.02);
  }

  bank(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [0, 7, 12, 15, 19, 24].forEach((n, i) => this.voice(note(n + 12), t + i * 0.09, 2.2, 0.07, 'triangle', 0.02, this.master!, 0, true));
  }

  sector(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.voice(note(-12), t, 3, 0.25, 'sine', 0.3, this.master);
    this.voice(note(-5), t + 0.4, 2.6, 0.1, 'triangle', 0.4, this.master, 0, true);
  }

  low(): void {
    this.tone(note(12), 0.4, 'sine', 0.08, note(7));
  }

  gameOver(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [24, 22, 19, 15, 12].forEach((n, i) => this.voice(note(n), t + i * 0.3, 1.6, 0.07, 'sine', 0.05, this.master!, 0, true));
  }

  /** a trial begins: two rising glass notes */
  chime(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [19, 26, 31].forEach((n, i) => this.voice(note(n), t + i * 0.12, 1.2, 0.06, 'sine', 0.01, this.master!, 0, true));
  }

  win(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [12, 19, 24, 27, 31, 36].forEach((n, i) => this.voice(note(n), t + i * 0.07, 1.6, 0.06, 'triangle', 0.01, this.master!, 0, true));
  }

  fail(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [15, 12, 10].forEach((n, i) => this.voice(note(n), t + i * 0.22, 1, 0.05, 'sine', 0.02, this.master!, 0, true));
  }

  /** a bronze bell: inharmonic partials with a long ring */
  bell(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const f0 = note(-2);
    [[1, 0.3], [2, 0.18], [2.4, 0.12], [3, 0.09], [4.2, 0.06], [5.4, 0.04]].forEach(([r, v]) => {
      for (let k = 0; k < 3; k++) this.voice(f0 * r, t + k * 0.9, 3.2, v * (1 - k * 0.25), 'sine', 0.003, this.master!, 0, true);
    });
  }

  /** the Black Tide wakes: a low swelling rumble */
  rumble(): void {
    this.noise(1.6, 0.35, 300);
    this.tone(45, 2.2, 'sawtooth', 0.08, 30);
  }

  /** the leviathan's call */
  roar(): void {
    this.tone(70, 1.8, 'sawtooth', 0.14, 38);
    this.tone(105, 1.6, 'square', 0.04, 52, 0.1);
    this.noise(1.4, 0.25, 500);
  }

  warn(): void {
    this.tone(note(10), 0.18, 'square', 0.04);
    this.tone(note(10), 0.18, 'square', 0.04, undefined, 0.3);
  }

  blip(): void {
    this.tone(note(24), 0.08, 'sine', 0.07);
  }
}
