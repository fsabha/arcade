import { SoundBase } from '@arcade/shared';
import type { Tune } from '@arcade/shared';

// An original chiptune loop in the spirit of the arcade (not a transcription of the copyrighted score).
const FROGGER_TUNE: Tune = {
  bpm: 144,
  lead: 'square',
  volume: 0.035,
  melody: [
    'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', '-', 'A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', '-',
    'G4', 'A4', 'C5', 'D5', 'C5', 'A4', 'G4', '-', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', '-',
    'C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', '=', 'D5', '=', 'E5', '=', '-', '-',
    'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', '=', 'G4', '=', 'C5', '=', '=', '-',
  ],
  bass: ['C3', 'C3', 'A2', 'A2', 'G2', 'G2', 'E2', 'E2', 'C3', 'G2', 'A2', 'E2', 'F2', 'G2', 'C3', 'C3'],
  drum: true,
};

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  musicStart(): void {
    this.music.start(FROGGER_TUNE);
  }

  musicStop(): void {
    this.music.stop();
  }

  setMusicEnabled(on: boolean): void {
    this.music.setEnabled(on);
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
