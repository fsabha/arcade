import { SoundBase } from '@arcade/shared';
/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.6);
  }

  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

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
