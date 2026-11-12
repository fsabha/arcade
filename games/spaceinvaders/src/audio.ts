import { SoundBase } from '@arcade/shared';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  private ufoOsc: OscillatorNode | null = null;
  private ufoLfo: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private marchIdx = 0;

  constructor() {
    super(0.6);
  }

  /** The four-note invader march; called once per formation tick. */
  march(): void {
    const notes = [98, 87, 78, 73];
    this.tone(notes[this.marchIdx], 0.1, 'square', 0.12, notes[this.marchIdx] * 0.9);
    this.marchIdx = (this.marchIdx + 1) % notes.length;
  }

  shoot(): void {
    this.tone(1200, 0.12, 'square', 0.08, 300);
  }

  invaderHit(): void {
    this.noise(0.18, 0.25, 2500);
    this.tone(220, 0.12, 'square', 0.08, 60);
  }

  playerHit(): void {
    this.noise(0.8, 0.5, 1500);
    this.tone(120, 0.6, 'sawtooth', 0.2, 30);
  }

  shieldHit(): void {
    this.noise(0.06, 0.12, 900);
  }

  ufoHit(): void {
    this.tone(900, 0.4, 'square', 0.15, 100);
    this.noise(0.4, 0.3, 3000);
  }

  extraLife(): void {
    [523, 659, 784, 1047].forEach((n, i) => this.tone(n, 0.12, 'square', 0.12, undefined, i * 0.1));
  }

  waveClear(): void {
    [392, 523, 659, 784].forEach((n, i) => this.tone(n, 0.15, 'triangle', 0.15, undefined, i * 0.12));
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  ufoStart(): void {
    if (!this.ctx || !this.master || this.ufoOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 500;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this.ufoOsc = osc;
    this.ufoLfo = lfo;
    this.ufoGain = g;
  }

  ufoStop(): void {
    if (!this.ctx || !this.ufoOsc || !this.ufoLfo || !this.ufoGain) return;
    this.ufoGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    this.ufoOsc.stop(this.ctx.currentTime + 0.2);
    this.ufoLfo.stop(this.ctx.currentTime + 0.2);
    this.ufoOsc = null;
    this.ufoLfo = null;
    this.ufoGain = null;
  }
}
