import { FmMusic, SoundBase } from '@arcade/shared';
import { GA_SONG } from './music';


/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  constructor() {
    super(0.5);
  }

  /** Mega Drive FM music (see music.ts) */
  private fm = ((s: SoundFx) => new FmMusic({ get ctx() { return s.ctx; }, get out() { return s.master; }, get noise() { return s.noiseBuf; } }))(this);
  musicStart(): void { this.fm.start(GA_SONG); }
  musicStop(): void { this.fm.stop(); }
  setMusicEnabled(on: boolean): void { this.fm.setEnabled(on); }

  blip(): void { this.tone(700, 0.05, 'square', 0.08); }
  swing(): void { this.noise(0.12, 0.18, 2400); }
  hit(): void { this.noise(0.14, 0.32, 1200); this.tone(180, 0.1, 'square', 0.08, 90); }
  heavy(): void { this.noise(0.3, 0.4, 700); this.tone(90, 0.3, 'sawtooth', 0.12, 40); }
  grunt(): void { this.tone(160, 0.18, 'sawtooth', 0.08, 90); }
  jump(): void { this.tone(260, 0.12, 'square', 0.06, 420); }
  pot(): void { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.08, 'square', 0.1, undefined, i * 0.06)); }
  food(): void { [523, 659].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.1, undefined, i * 0.1)); }
  thief(): void { this.tone(1400, 0.05, 'square', 0.06, 900); }
  mount(): void { this.tone(220, 0.2, 'sawtooth', 0.08, 330); }

  /** Earth quakes, fire roars, lightning cracks. */
  magic(kind: 'ax' | 'tyris' | 'gilius'): void {
    if (kind === 'gilius') { for (let i = 0; i < 4; i++) { this.noise(0.08, 0.4, 4000); this.tone(1800, 0.08, 'square', 0.1, 200, i * 0.12); } }
    else if (kind === 'tyris') { this.noise(1.2, 0.35, 900); this.tone(120, 1.0, 'sawtooth', 0.08, 60); }
    else { this.noise(1.0, 0.45, 300); this.tone(60, 1.0, 'sawtooth', 0.14, 30); }
  }

  heroDown(): void { [440, 392, 349, 294, 262].forEach((f, i) => this.tone(f, 0.16, 'square', 0.1, undefined, i * 0.15)); }
  stageClear(): void { [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.12)); }
  gameOver(): void { this.musicStop(); for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4); }
}
