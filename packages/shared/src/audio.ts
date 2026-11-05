/**
 * Base for the per-game sound classes: lazy AudioContext unlocked by a user gesture,
 * a master gain for muting, plus tone/noise helpers. Every sound is synthesized.
 */
export class SoundBase {
  protected ctx: AudioContext | null = null;
  protected master: GainNode | null = null;
  protected noiseBuf: AudioBuffer | null = null;
  private _muted = false;

  constructor(private volume = 0.6) {}

  get muted(): boolean {
    return this._muted;
  }

  /** Must be called from a user gesture before anything is audible. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      // iOS 17+: play even with the ringer switch on silent, like a game app would.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) {
        try { session.type = 'playback'; } catch { /* unsupported value */ }
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.onUnlock();
    }
    // 'interrupted' is iOS-only (phone call, switching apps); resume it like 'suspended'.
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  /** Hook for subclasses that need nodes created once the context exists. */
  protected onUnlock(): void {}

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
  }

  protected tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
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

  protected noise(dur: number, vol: number, filterFreq: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq, t0);
    f.frequency.exponentialRampToValueAtTime(80, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }
}
