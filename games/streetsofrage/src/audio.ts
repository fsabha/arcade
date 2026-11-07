import { FmMusic, SoundBase } from '@arcade/shared';
import { SR_SONG } from './music';


/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  /** Mega Drive FM music (see music.ts) */
  private fm = ((s: SoundFx) => new FmMusic({ get ctx() { return s.ctx; }, get out() { return s.master; }, get noise() { return s.noiseBuf; } }))(this);
  musicStart(): void { this.fm.start(SR_SONG); }
  musicStop(): void { this.fm.stop(); }
  setMusicEnabled(on: boolean): void { this.fm.setEnabled(on); }

  blip(): void { this.tone(700, 0.05, 'square', 0.08); }
  swing(): void { this.noise(0.08, 0.14, 2800); }
  punch(): void { this.noise(0.1, 0.3, 1400); this.tone(200, 0.08, 'square', 0.08, 100); }
  kick(): void { this.noise(0.2, 0.36, 900); this.tone(120, 0.18, 'sawtooth', 0.1, 50); }
  whip(): void { this.noise(0.05, 0.3, 6000); this.tone(1600, 0.04, 'square', 0.05, 400); }
  grunt(): void { this.tone(150, 0.16, 'sawtooth', 0.08, 80); }
  jump(): void { this.tone(260, 0.12, 'square', 0.06, 420); }
  pickup(): void { [880, 1175].forEach((f, i) => this.tone(f, 0.08, 'square', 0.1, undefined, i * 0.07)); }
  food(): void { [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.1, undefined, i * 0.08)); }
  money(): void { [1319, 1760].forEach((f, i) => this.tone(f, 0.06, 'square', 0.08, undefined, i * 0.05)); }
  oneUp(): void { [659, 784, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, undefined, i * 0.1)); }
  weapon(): void { this.tone(900, 0.06, 'square', 0.07, 1400); }
  shot(): void { this.noise(0.06, 0.2, 3000); }
  gun(): void { for (let i = 0; i < 3; i++) this.tone(300, 0.04, 'sawtooth', 0.1, 80, i * 0.07); }
  flame(): void { this.noise(0.5, 0.25, 700); }

  /** The police car: siren, then the napalm. */
  siren(): void { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 660 : 880, 0.18, 'square', 0.08, undefined, i * 0.18); }
  napalm(): void { this.noise(1.1, 0.5, 500); this.tone(70, 0.9, 'sawtooth', 0.14, 30); }

  heroDown(): void { [440, 392, 349, 294, 262].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1, undefined, i * 0.15)); }
  roundClear(): void { [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.12)); }
  gameOver(): void { this.musicStop(); for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4); }
}
