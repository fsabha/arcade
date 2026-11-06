import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  walk(): void {
    this.tone(220, 0.03, 'square', 0.04);
  }

  jump(): void {
    this.tone(330, 0.18, 'square', 0.08, 660);
  }

  /** Points for jumping something. */
  score(): void {
    this.tone(1047, 0.06, 'square', 0.08);
    this.tone(1319, 0.08, 'square', 0.08, undefined, 0.06);
  }

  hammerHit(): void {
    this.noise(0.15, 0.3, 2200);
    this.tone(200, 0.15, 'square', 0.1, 100);
  }

  hammerLoop(): void {
    [392, 523, 392, 523].forEach((f, i) => this.tone(f, 0.08, 'square', 0.05, undefined, i * 0.1));
  }

  item(): void {
    [784, 988, 1175].forEach((f, i) => this.tone(f, 0.08, 'square', 0.1, undefined, i * 0.07));
  }

  rivet(): void {
    this.tone(600, 0.08, 'square', 0.1, 900);
  }

  barrelThrow(): void {
    this.tone(120, 0.15, 'sawtooth', 0.06, 80);
  }

  kongStomp(): void {
    this.tone(70, 0.2, 'sawtooth', 0.1, 40);
  }

  die(): void {
    [440, 415, 392, 370, 349, 330, 311, 294].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, undefined, i * 0.12));
  }

  /** "How high can you get?" jingle. */
  intro(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, undefined, i * 0.12));
  }

  win(): void {
    [659, 784, 880, 1047, 880, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.16, 'square', 0.12, undefined, i * 0.14));
  }

  extraLife(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.08));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }
}
