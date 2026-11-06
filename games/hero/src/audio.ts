import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  private laserOsc: OscillatorNode | null = null;
  private laserGain: GainNode | null = null;

  constructor() {
    super(0.55);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  laserStart(): void {
    if (!this.ctx || !this.master || this.laserOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 1400;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 28;
    const lg = this.ctx.createGain();
    lg.gain.value = 500;
    lfo.connect(lg).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this.laserOsc = osc;
    this.laserGain = g;
    osc.onended = () => lfo.stop();
  }

  laserStop(): void {
    if (!this.ctx || !this.laserOsc || !this.laserGain) return;
    this.laserGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    this.laserOsc.stop(this.ctx.currentTime + 0.1);
    this.laserOsc = null;
    this.laserGain = null;
  }

  zap(): void {
    this.tone(1800, 0.12, 'square', 0.1, 200);
  }

  crumble(): void {
    this.noise(0.25, 0.3, 900);
  }

  fuse(): void {
    for (let i = 0; i < 6; i++) this.tone(2400, 0.03, 'square', 0.05, undefined, i * 0.25);
  }

  explode(): void {
    this.noise(0.7, 0.6, 1200);
    this.tone(80, 0.5, 'triangle', 0.3, 30);
  }

  dark(): void {
    this.tone(400, 0.3, 'sine', 0.12, 60);
  }

  die(): void {
    [500, 400, 300, 200, 120].forEach((f, i) => this.tone(f, 0.16, 'square', 0.12, undefined, i * 0.14));
  }

  rescue(): void {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.09));
  }

  extraLife(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
