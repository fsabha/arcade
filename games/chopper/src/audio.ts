import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  private rotor: OscillatorNode | null = null;
  private rotorGain: GainNode | null = null;

  constructor() {
    super(0.5);
  }

  protected onUnlock(): void {
    if (!this.ctx || !this.master) return;
    this.rotor = this.ctx.createOscillator();
    this.rotor.type = 'sawtooth';
    this.rotor.frequency.value = 28;
    this.rotorGain = this.ctx.createGain();
    this.rotorGain.gain.value = 0;
    this.rotor.connect(this.rotorGain).connect(this.master);
    this.rotor.start();
  }

  /** The rotor hums while flying. */
  setRotor(on: boolean): void {
    if (!this.rotorGain || !this.ctx) return;
    this.rotorGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.05);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  shot(): void {
    this.tone(1400, 0.05, 'square', 0.06, 500);
  }

  hit(): void {
    this.noise(0.25, 0.3, 1800);
  }

  missile(): void {
    this.tone(300, 0.3, 'sawtooth', 0.05, 600);
  }

  truck(): void {
    this.noise(0.5, 0.35, 700);
    this.tone(100, 0.4, 'sawtooth', 0.1, 40);
  }

  crash(): void {
    this.noise(1.0, 0.45, 900);
    this.tone(160, 0.9, 'sawtooth', 0.12, 30);
  }

  bonus(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  extraChopper(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    this.setRotor(false);
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
