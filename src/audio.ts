/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  /** Must be called from a user gesture before anything is audible. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq, t0);
    f.frequency.exponentialRampToValueAtTime(80, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  torpedo(): void {
    this.noise(0.18, 0.2, 1400);
    this.tone(300, 0.12, 'square', 0.08, 90);
  }

  explode(big = false): void {
    this.noise(big ? 0.8 : 0.35, big ? 0.5 : 0.3, big ? 1600 : 1000);
    this.tone(big ? 80 : 130, big ? 0.6 : 0.25, 'triangle', 0.25, 30);
  }

  diver(): void {
    this.tone(660, 0.07, 'square', 0.1, undefined, 0);
    this.tone(990, 0.09, 'square', 0.1, undefined, 0.07);
  }

  diverLost(): void {
    this.tone(400, 0.2, 'sawtooth', 0.1, 120);
  }

  oxygenLow(): void {
    this.tone(480, 0.09, 'square', 0.1);
  }

  refillTick(): void {
    this.tone(520, 0.04, 'sine', 0.07, 780);
  }

  bonus(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((n, i) => this.tone(n, 0.13, 'square', 0.12, undefined, i * 0.1));
  }

  extraLife(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.12, 'square', 0.12, undefined, i * 0.1));
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  gameOver(): void {
    const notes = [440, 370, 311, 220];
    notes.forEach((n, i) => this.tone(n, 0.3, 'sawtooth', 0.12, n * 0.9, i * 0.25));
  }

  humStart(): void {
    if (!this.ctx || !this.master || this.humOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.3);
    osc.connect(f).connect(g).connect(this.master);
    osc.start();
    this.humOsc = osc;
    this.humGain = g;
  }

  /** moving = any direction key held */
  humSet(moving: boolean): void {
    if (!this.ctx || !this.humOsc) return;
    this.humOsc.frequency.setTargetAtTime(moving ? 72 : 55, this.ctx.currentTime, 0.15);
  }

  humStop(): void {
    if (!this.ctx || !this.humOsc || !this.humGain) return;
    const osc = this.humOsc;
    this.humGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    osc.stop(this.ctx.currentTime + 0.3);
    this.humOsc = null;
    this.humGain = null;
  }
}
