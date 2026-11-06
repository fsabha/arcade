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
    this.tone(300, 0.14, 'square', 0.09, 620);
  }

  /** Kelly's footsteps while running. */
  step(): void {
    this.tone(180, 0.03, 'square', 0.04);
  }

  loot(): void {
    [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.07, 'square', 0.1, undefined, i * 0.05));
  }

  /** KO'd by a cart, ball or radio. */
  bump(): void {
    this.noise(0.25, 0.3, 900);
    this.tone(160, 0.3, 'sawtooth', 0.12, 60);
  }

  tick(): void {
    this.tone(1400, 0.03, 'square', 0.07);
  }

  elevator(): void {
    this.tone(880, 0.12, 'sine', 0.1);
    this.tone(1175, 0.2, 'sine', 0.1, undefined, 0.12);
  }

  escalator(): void {
    this.tone(220, 0.25, 'triangle', 0.06, 330);
  }

  /** Police whistle when Harry is nabbed. */
  caught(): void {
    this.tone(2200, 0.25, 'square', 0.1, 2600);
    this.tone(2200, 0.25, 'square', 0.1, 2600, 0.3);
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, 0.7 + i * 0.1));
  }

  lose(): void {
    [500, 420, 340, 260, 180].forEach((f, i) => this.tone(f, 0.2, 'square', 0.12, undefined, i * 0.16));
  }

  bonusKop(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
