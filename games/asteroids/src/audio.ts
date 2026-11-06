import { SoundBase } from '@arcade/shared';
import type { Size } from './config';

/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx extends SoundBase {
  private thrustSrc: AudioBufferSourceNode | null = null;
  private thrustGain: GainNode | null = null;
  private saucerOsc: OscillatorNode | null = null;
  private saucerLfo: OscillatorNode | null = null;
  private saucerGain: GainNode | null = null;
  private saucerKind: string | null = null;

  constructor() {
    super(0.55);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  fire(): void {
    this.tone(900, 0.08, 'square', 0.09, 300);
  }

  explode(size: Size): void {
    const big = size === 'large';
    this.noise(big ? 0.5 : size === 'medium' ? 0.35 : 0.22, big ? 0.45 : 0.3, big ? 900 : 1500);
  }

  shipExplode(): void {
    this.noise(0.9, 0.6, 1200);
    this.tone(120, 0.7, 'triangle', 0.25, 30);
  }

  hyperspace(): void {
    this.tone(1200, 0.4, 'square', 0.1, 200);
  }

  extraShip(): void {
    [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, i * 0.1));
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }

  /** The low rumble of the engine while the stick is forward. */
  thrustStart(): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this.thrustSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.05);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.thrustSrc = src;
    this.thrustGain = g;
  }

  thrustStop(): void {
    if (!this.ctx || !this.thrustSrc || !this.thrustGain) return;
    this.thrustGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.thrustSrc.stop(this.ctx.currentTime + 0.2);
    this.thrustSrc = null;
    this.thrustGain = null;
  }

  /** Satellite: low siren; UFO: high siren. */
  saucerStart(kind: 'satellite' | 'ufo'): void {
    if (!this.ctx || !this.master) return;
    if (this.saucerOsc && this.saucerKind === kind) return;
    this.saucerStop();
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = kind === 'satellite' ? 140 : 420;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = kind === 'satellite' ? 3 : 6;
    const lg = this.ctx.createGain();
    lg.gain.value = kind === 'satellite' ? 40 : 120;
    lfo.connect(lg).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this.saucerOsc = osc;
    this.saucerLfo = lfo;
    this.saucerGain = g;
    this.saucerKind = kind;
  }

  saucerStop(): void {
    if (!this.ctx || !this.saucerOsc) return;
    this.saucerGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    this.saucerOsc.stop(this.ctx.currentTime + 0.1);
    this.saucerLfo?.stop(this.ctx.currentTime + 0.1);
    this.saucerOsc = null;
    this.saucerLfo = null;
    this.saucerGain = null;
    this.saucerKind = null;
  }
}
