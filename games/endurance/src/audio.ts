import { SoundBase } from '@arcade/shared';
/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.6);
  }

  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private grassSrc: AudioBufferSourceNode | null = null;
  private grassGain: GainNode | null = null;

  crash(): void {
    this.noise(0.6, 0.55, 1600);
    this.tone(110, 0.45, 'square', 0.22, 28);
  }

  pass(): void {
    this.tone(1200, 0.06, 'sine', 0.05, 600);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  flags(): void {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.14, 'square', 0.12, undefined, i * 0.11));
  }

  newDay(): void {
    const notes = [392, 523, 659];
    notes.forEach((n, i) => this.tone(n, 0.18, 'triangle', 0.14, undefined, i * 0.15));
  }

  gameOver(): void {
    const notes = [440, 370, 311, 220];
    notes.forEach((n, i) => this.tone(n, 0.3, 'sawtooth', 0.12, n * 0.9, i * 0.25));
  }

  engineStart(): void {
    if (!this.ctx || !this.master || this.engineOsc || !this.noiseBuf) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 40;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 80;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 360;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.2);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.35;
    osc.connect(f);
    osc2.connect(g2).connect(f);
    f.connect(g).connect(this.master);
    osc.start();
    osc2.start();
    this.engineOsc = osc;
    this.engineOsc2 = osc2;
    this.engineGain = g;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.value = 0;
    src.connect(nf).connect(ng).connect(this.master);
    src.start();
    this.grassSrc = src;
    this.grassGain = ng;
  }

  /** speed 0..1, grass = driving off road */
  engineSet(speed: number, grass: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 38 + speed * 150;
    this.engineOsc?.frequency.setTargetAtTime(f, t, 0.08);
    this.engineOsc2?.frequency.setTargetAtTime(f * 2.01, t, 0.08);
    this.engineGain?.gain.setTargetAtTime(0.035 + speed * 0.04, t, 0.1);
    this.grassGain?.gain.setTargetAtTime(grass ? 0.08 + speed * 0.1 : 0, t, 0.05);
  }

  engineStop(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, t, 0.05);
    if (this.grassGain) this.grassGain.gain.setTargetAtTime(0, t, 0.05);
    this.engineOsc?.stop(t + 0.3);
    this.engineOsc2?.stop(t + 0.3);
    this.grassSrc?.stop(t + 0.3);
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.grassSrc = null;
    this.grassGain = null;
  }
}
