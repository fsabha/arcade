import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  launch(): void {
    this.tone(900, 0.18, 'square', 0.07, 300);
  }

  explosion(): void {
    this.noise(0.5, 0.3, 1200);
  }

  hit(): void {
    this.tone(120, 0.5, 'sawtooth', 0.12, 40);
  }

  /** A city or the base is lost. */
  cityLost(): void {
    this.noise(0.9, 0.45, 600);
    this.tone(90, 0.8, 'sawtooth', 0.14, 30);
  }

  /** Enemy missiles entering the sky. */
  alarm(): void {
    this.tone(440, 0.08, 'square', 0.05, 660);
  }

  tally(): void {
    this.tone(1200, 0.04, 'square', 0.08);
  }

  /** Manual: "A musical tune is played each time a bonus city is used." */
  bonusCity(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.1));
  }

  waveStart(): void {
    [330, 392, 494].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
    this.noise(1.4, 0.3, 400);
  }
}
