/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
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

  /** The chicken's little tick while walking. */
  step(): void {
    this.tone(1200, 0.03, 'square', 0.06);
  }

  /** Squawk + horn when hit. */
  hit(): void {
    this.tone(900, 0.25, 'sawtooth', 0.14, 300);
    this.tone(240, 0.3, 'square', 0.1, 200, 0.05);
  }

  score(): void {
    this.tone(880, 0.08, 'square', 0.12);
    this.tone(1320, 0.14, 'square', 0.12, undefined, 0.08);
  }

  tick(): void {
    this.tone(1000, 0.04, 'square', 0.08);
  }

  timeUp(): void {
    for (let i = 0; i < 3; i++) this.tone(330, 0.25, 'square', 0.14, undefined, i * 0.35);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  humStart(): void {
    if (!this.ctx || !this.master || this.humOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 200;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.04, this.ctx.currentTime, 0.3);
    osc.connect(f).connect(g).connect(this.master);
    osc.start();
    this.humOsc = osc;
    this.humGain = g;
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
