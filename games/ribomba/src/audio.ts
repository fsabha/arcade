/**
 * RIBOMBA's sound (direction: Lúcio). A toy march: a snare that keeps the step, a bass on the beat
 * and a little fife over the top; the Bocão goes "bum" (deeper with more barrels); gates answer with
 * chords that climb with n; crates go "tuc" until they crack; the clash of the armies is a dry
 * rattle whose density follows the fight; a captain brings the drums; winning plays the fanfare.
 */
import { SoundBase } from '@arcade/shared';

const ROOT = 146.83; // D3
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const PROG = [0, 5, 7, 0]; // I IV V I
const FIFE: (number | null)[] = [12, null, 14, 16, 19, null, 16, 14, 12, null, 7, 9, 12, null, null, null];
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
  /** a guardian is on: drums come in; in its fury they speed up */
  boss = false;
  fury = false;

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
    const beat = 60 / (this.fury ? 132 : this.boss ? 120 : 112);
    while (this.next < this.ctx.currentTime + 0.3) {
      const t = this.next, s = this.step;
      const chord = PROG[Math.floor(s / 8) % PROG.length];
      // the march: bass on the beat, snare on the offbeats with a ruff, a fife every other bar
      this.voice(note(chord - 24), t, beat * 0.9, 0.12, 'triangle', 0.005, this.bus);
      if (s % 2 === 1) { this.noiseAt(t, 0.08, 0.05, 3500); if (s % 8 === 7) for (let r = 1; r < 4; r++) this.noiseAt(t + beat * r * 0.16, 0.05, 0.03, 4000); }
      if (Math.floor(s / 16) % 2 === 1 && !this.night) {
        const m = FIFE[s % FIFE.length];
        if (m !== null) this.voice(note(chord + m + 12), t, beat * 0.8, 0.035, 'square', 0.01, this.bus);
      }
      if (this.boss) {
        // the captain's drums: kick on every beat, a tom on the offbeat, faster in fury
        this.voice(58, t, 0.25, 0.32, 'sine', 0.003, this.bus);
        this.voice(42, t, 0.3, 0.2, 'sine', 0.003, this.bus);
        if (s % 2 === 1) this.noiseAt(t + beat * 0.5, 0.06, 0.06, 4000);
        if (this.fury) this.noiseAt(t + beat * 0.25, 0.04, 0.05, 6000);
        if (s % 4 === 2) this.voice(note(-12 + (s % 8 === 2 ? 0 : 3)), t, beat * 0.9, 0.08, 'sawtooth', 0.01, this.bus);
      }
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

  /** the Bocão: a short "bum", deeper with more barrels, at most ~12 a second */
  fire(barrels = 1): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (now - this.lastTick < 0.085) return;
    this.lastTick = now;
    this.tick = (this.tick + 1) % 4;
    this.tone(120 - Math.min(60, barrels * 6) + this.tick * 4, 0.09, 'sine', 0.09, 50);
    this.noise(0.05, 0.03, 900);
  }

  /** a crate takes a soldier: "tuc" */
  tuc(): void { this.tone(220 + Math.random() * 40, 0.05, 'square', 0.025, 160); }
  /** a crate cracks open and hands over its upgrade */
  crate(): void {
    this.noise(0.35, 0.25, 900); this.tone(140, 0.3, 'sawtooth', 0.08, 70);
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + 0.15;
    [0, 4, 7, 12].forEach((n, i) => this.voice(note(n + 12), t + i * 0.07, 0.5, 0.06, 'square', 0.005, this.master!));
  }
  /** a bugle call: a captain arrives */
  bugle(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [7, 7, 12, 7, 12, 16].forEach((n, i) => this.voice(note(n), t + i * 0.13 + (i > 2 ? 0.1 : 0), 0.3, 0.07, 'sawtooth', 0.01, this.master!));
  }
  /** alarm: reds close to the line */
  alarm(): void { this.tone(note(19), 0.12, 'square', 0.04); this.tone(note(15), 0.12, 'square', 0.04, undefined, 0.14); }

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
    if (last) this.bugle();
    else this.tone(note(19), 0.15, 'sine', 0.06);
  }

  /** the music box plays the theme (short: a small fanfare for a trial) */
  win(short = false): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    if (short) { [12, 16, 19, 24].forEach((n, i) => this.voice(note(n + 12), t + i * 0.07, 0.6, 0.06, 'triangle', 0.003, this.master!)); return; }
    THEME.forEach((n, i) => {
      this.voice(note(n + 12), t + 0.4 + i * 0.16, 0.9, 0.06, 'sine', 0.002, this.master!);
      this.voice(note(n + 24), t + 0.4 + i * 0.16, 0.4, 0.015, 'sine', 0.002, this.master!);
    });
    this.tone(48, 1.4, 'sine', 0.3, 30);
  }

  lose(short = false): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    if (short) { [7, 3, 0].forEach((n, i) => this.voice(note(n), t + i * 0.14, 0.6, 0.06, 'triangle', 0.01, this.master!)); return; }
    [12, 9, 7, 4, 0].forEach((n, i) => this.voice(note(n), t + i * 0.28, 1.4, 0.06, 'sine', 0.04, this.master!));
  }

  burst(): void { this.tone(note(24), 0.2, 'triangle', 0.06, note(31)); }
  /** dry leaf: the Sower wilts */
  wilt(): void { this.noise(0.5, 0.25, 1800); this.tone(note(7), 0.6, 'triangle', 0.06, note(-5)); }
  reflect(): void { this.tone(note(31), 0.1, 'square', 0.03, note(19)); }
  /** telegraph tick */
  warn(): void { this.tone(note(22), 0.07, 'square', 0.03); }
  hurt(): void { this.tone(80, 0.35, 'sawtooth', 0.12, 40); this.noise(0.3, 0.2, 1200); }
  thud(): void { this.tone(48, 0.5, 'sine', 0.4, 28); this.noise(0.35, 0.25, 300); }
  whoosh(): void { this.noise(0.35, 0.12, 2200); }
  splat(): void { this.noise(0.3, 0.2, 500); this.tone(90, 0.25, 'sine', 0.12, 50); }
  freeze(): void { if (!this.ctx || !this.master) return; const t = this.ctx.currentTime; [36, 31, 34, 29].forEach((n, i) => this.voice(note(n), t + i * 0.05, 0.8, 0.04, 'sine', 0.002, this.master!)); }
  wind(): void { this.noise(2.5, 0.2, 600); }
  inhale(): void { this.noise(1.6, 0.2, 900); this.tone(60, 1.6, 'sawtooth', 0.06, 110); }
  burn(): void { this.noise(0.6, 0.3, 1500); }
  heartbeat(): void { this.tone(52, 0.2, 'sine', 0.5, 40); this.tone(46, 0.2, 'sine', 0.35, 36, 0.22); }
  shatter(): void { if (!this.ctx || !this.master) return; const t = this.ctx.currentTime; [31, 36, 40, 43].forEach((n, i) => this.voice(note(n), t + i * 0.04, 0.5, 0.05, 'sine', 0.002, this.master!)); this.noise(0.3, 0.15, 6000); }
  trial(): void { if (!this.ctx || !this.master) return; const t = this.ctx.currentTime; [19, 24, 26].forEach((n, i) => this.voice(note(n), t + i * 0.1, 0.8, 0.05, 'triangle', 0.005, this.master!)); }
  /** the guardian arrives: the music cuts, a low boom */
  bossEnter(): void { this.tone(40, 1.4, 'sine', 0.5, 30); this.noise(1.2, 0.25, 250); this.tone(note(-24), 2, 'sawtooth', 0.06, note(-26)); }
  roar(): void { this.tone(70, 1.2, 'sawtooth', 0.12, 40); this.noise(1, 0.2, 500); }

  blip(): void {
    this.tone(note(24), 0.07, 'sine', 0.06);
  }
}
