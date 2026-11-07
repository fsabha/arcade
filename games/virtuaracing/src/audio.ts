import { FmMusic, SoundBase } from '@arcade/shared';
import { VR_SONG } from './music';


/** Engine note that follows the revs, plus beeps, skids and jingles. */
export class SoundFx extends SoundBase {
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  constructor() {
    super(0.5);
  }

  protected onUnlock(): void {
    if (!this.ctx || !this.master) return;
    this.engine = this.ctx.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 60;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engine.connect(this.engineGain).connect(this.master);
    this.engine.start();
  }

  /** revs 0..1 within the gear, on/off */
  setEngine(on: boolean, revs: number, speedK: number): void {
    if (!this.engine || !this.engineGain || !this.ctx) return;
    this.engineGain.gain.setTargetAtTime(on ? 0.03 + speedK * 0.02 : 0, this.ctx.currentTime, 0.05);
    this.engine.frequency.setTargetAtTime(50 + revs * 160 + speedK * 40, this.ctx.currentTime, 0.05);
  }

  /** Mega Drive FM music (see music.ts) */
  private fm = ((s: SoundFx) => new FmMusic({ get ctx() { return s.ctx; }, get out() { return s.master; }, get noise() { return s.noiseBuf; } }))(this);
  musicStart(): void { this.fm.start(VR_SONG); }
  musicStop(): void { this.fm.stop(); }
  setMusicEnabled(on: boolean): void { this.fm.setEnabled(on); }

  blip(): void { this.tone(700, 0.05, 'square', 0.08); }
  countdown(final: boolean): void { this.tone(final ? 880 : 440, final ? 0.5 : 0.18, 'square', 0.12); }
  checkpoint(): void { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.12, undefined, i * 0.08)); }
  lap(): void { this.tone(1175, 0.15, 'square', 0.1); }
  skid(): void { this.noise(0.2, 0.12, 2500); }
  bump(): void { this.noise(0.15, 0.3, 900); this.tone(120, 0.15, 'square', 0.1, 60); }
  view(): void { this.tone(1200, 0.04, 'square', 0.06); }
  finish(): void { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.12)); }
  timeUp(): void { [440, 392, 349, 294].forEach((f, i) => this.tone(f, 0.2, 'square', 0.12, undefined, i * 0.2)); }
  gameOver(): void { this.musicStop(); this.setEngine(false, 0, 0); for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4); }
}
