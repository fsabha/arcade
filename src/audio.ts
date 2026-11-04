/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  /** Rising "boing" of the jump. */
  jump(): void {
    this.tone(300, 0.18, 'square', 0.1, 700);
  }

  grab(): void {
    this.tone(500, 0.08, 'square', 0.08, 900);
  }

  /** Thud of a rolling log. */
  hitLog(): void {
    this.tone(140, 0.2, 'sawtooth', 0.12, 60);
  }

  fall(): void {
    this.tone(600, 0.5, 'square', 0.1, 80);
  }

  sink(): void {
    this.tone(200, 0.5, 'sawtooth', 0.1, 40);
  }

  /** The classic rising arpeggio when a treasure is found. */
  treasure(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, i * 0.08));
  }

  die(): void {
    const notes = [660, 520, 400, 300, 200];
    notes.forEach((f, i) => this.tone(f, 0.18, 'square', 0.12, undefined, i * 0.14));
  }

  tick(): void {
    this.tone(1000, 0.04, 'square', 0.08);
  }

  gameOver(): void {
    for (let i = 0; i < 3; i++) this.tone(220, 0.3, 'square', 0.14, undefined, i * 0.4);
  }

  finished(): void {
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((f, i) => this.tone(f, 0.25, 'square', 0.12, undefined, i * 0.15));
  }
}
