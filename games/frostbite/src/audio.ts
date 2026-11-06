import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.55);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  jump(): void {
    this.tone(320, 0.12, 'square', 0.09, 640);
  }

  /** A block lands on the igloo. */
  block(): void {
    this.tone(880, 0.06, 'square', 0.1);
    this.tone(1320, 0.1, 'square', 0.1, undefined, 0.06);
  }

  reverse(): void {
    this.tone(500, 0.12, 'sawtooth', 0.08, 250);
  }

  fish(): void {
    [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.08, 'square', 0.1, undefined, i * 0.06));
  }

  /** Splash into the Arctic Sea. */
  splash(): void {
    this.noise(0.6, 0.35, 1600);
    this.tone(300, 0.5, 'sine', 0.12, 60);
  }

  freeze(): void {
    [600, 500, 400, 300, 200].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1, undefined, i * 0.14));
  }

  bear(): void {
    this.tone(90, 0.4, 'sawtooth', 0.14, 60);
  }

  /** Entering the igloo. */
  igloo(): void {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.1));
  }

  extraLife(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  cold(): void {
    this.tone(1200, 0.04, 'square', 0.07);
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
