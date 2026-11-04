import { SoundBase } from '@arcade/shared';
import type { SpeedMode } from './config';

const ENGINE_FREQ: Record<SpeedMode, number> = { slow: 48, normal: 68, fast: 104 };

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.6);
  }

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  shoot(): void {
    this.tone(880, 0.09, 'square', 0.12, 220);
  }

  explode(big = false): void {
    this.noise(big ? 0.7 : 0.35, big ? 0.5 : 0.3, big ? 1800 : 1200);
    this.tone(big ? 90 : 140, big ? 0.5 : 0.25, 'triangle', 0.25, 30);
  }

  fuelLow(): void {
    this.tone(520, 0.1, 'square', 0.1);
  }

  refuelTick(): void {
    this.tone(660, 0.05, 'sine', 0.08, 880);
  }

  extraLife(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.12, 'square', 0.12, undefined, i * 0.1));
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  bridge(): void {
    this.explode(true);
    this.tone(200, 0.4, 'sawtooth', 0.15, 60);
  }

  engineStart(): void {
    if (!this.ctx || !this.master || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = ENGINE_FREQ.normal;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.2);
    osc.connect(f).connect(g).connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = g;
  }

  engineSet(mode: SpeedMode): void {
    if (!this.ctx || !this.engineOsc) return;
    this.engineOsc.frequency.setTargetAtTime(ENGINE_FREQ[mode], this.ctx.currentTime, 0.1);
  }

  engineStop(): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const osc = this.engineOsc;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    osc.stop(this.ctx.currentTime + 0.3);
    this.engineOsc = null;
    this.engineGain = null;
  }
}
