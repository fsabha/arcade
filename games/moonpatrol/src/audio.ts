import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  constructor() {
    super(0.5);
  }

  protected onUnlock(): void {
    if (!this.ctx || !this.master) return;
    this.engine = this.ctx.createOscillator();
    this.engine.type = 'square';
    this.engine.frequency.value = 60;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engine.connect(this.engineGain).connect(this.master);
    this.engine.start();
  }

  /** Engine pitch follows the throttle. */
  setEngine(on: boolean, speed: number): void {
    if (!this.engineGain || !this.engine || !this.ctx) return;
    this.engineGain.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, 0.05);
    this.engine.frequency.setTargetAtTime(40 + speed * 0.5, this.ctx.currentTime, 0.1);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  shot(): void {
    this.tone(1200, 0.06, 'square', 0.06, 400);
  }

  jump(): void {
    this.tone(250, 0.2, 'triangle', 0.08, 500);
  }

  hit(): void {
    this.noise(0.2, 0.3, 2000);
  }

  ufo(): void {
    this.tone(900, 0.12, 'sine', 0.05, 1300);
  }

  bomb(): void {
    this.tone(600, 0.6, 'sawtooth', 0.05, 150);
  }

  crash(): void {
    this.noise(0.9, 0.45, 800);
    this.tone(150, 0.8, 'sawtooth', 0.12, 30);
  }

  checkpoint(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.1));
  }

  course(): void {
    [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.12));
  }

  extraLife(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    this.setEngine(false, 0);
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
