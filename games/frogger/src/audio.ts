import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  hop(): void {
    this.tone(420, 0.06, 'square', 0.08, 840);
  }

  /** Run over, bitten, drowned. */
  splat(): void {
    this.noise(0.4, 0.35, 1400);
    this.tone(200, 0.4, 'sawtooth', 0.1, 50);
  }

  drown(): void {
    this.tone(300, 0.5, 'sine', 0.12, 60);
    this.noise(0.5, 0.2, 500);
  }

  home(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'square', 0.12, undefined, i * 0.08));
  }

  fly(): void {
    [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.06, 'square', 0.1, undefined, i * 0.05));
  }

  lady(): void {
    this.tone(880, 0.12, 'triangle', 0.1, 1320);
  }

  /** All five frogs home. */
  levelClear(): void {
    [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.12));
  }

  tick(): void {
    this.tone(1200, 0.03, 'square', 0.06);
  }

  extraLife(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
