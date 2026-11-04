/** All sounds are synthesized with Web Audio; no asset files. */
export class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private sirenMode: 'off' | 'siren' | 'fright' | 'eyes' = 'off';
  private wakaFlip = false;
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

  /** Alternating "waka" chomp. */
  waka(): void {
    this.wakaFlip = !this.wakaFlip;
    if (this.wakaFlip) this.tone(420, 0.08, 'square', 0.12, 180);
    else this.tone(180, 0.08, 'square', 0.12, 420);
  }

  pellet(): void {
    this.tone(220, 0.15, 'square', 0.12, 330);
  }

  eatGhost(): void {
    this.tone(200, 0.45, 'square', 0.14, 1400);
  }

  eatFruit(): void {
    this.tone(900, 0.08, 'square', 0.12, 500);
    this.tone(500, 0.12, 'square', 0.12, 1000, 0.08);
  }

  death(): void {
    for (let i = 0; i < 8; i++) this.tone(700 - i * 70, 0.16, 'square', 0.12, 420 - i * 40, i * 0.17);
    this.tone(200, 0.1, 'square', 0.12, 600, 1.4);
    this.tone(200, 0.1, 'square', 0.12, 600, 1.55);
  }

  extraLife(): void {
    for (let i = 0; i < 6; i++) this.tone(880, 0.06, 'square', 0.12, undefined, i * 0.12);
  }

  blip(): void {
    this.tone(700, 0.05, 'square', 0.08);
  }

  /** Start-of-round jingle (an approximation of the arcade intro). */
  intro(): void {
    const seq: [number, number][] = [
      [494, 0.12], [988, 0.12], [740, 0.12], [622, 0.12], [988, 0.06], [740, 0.18], [622, 0.24],
      [523, 0.12], [1047, 0.12], [784, 0.12], [659, 0.12], [1047, 0.06], [784, 0.18], [659, 0.24],
      [494, 0.12], [988, 0.12], [740, 0.12], [622, 0.12], [988, 0.06], [740, 0.18], [622, 0.24],
      [622, 0.08], [659, 0.08], [698, 0.08], [698, 0.08], [740, 0.08], [784, 0.08], [784, 0.08], [831, 0.08], [880, 0.08], [988, 0.3],
    ];
    let t = 0;
    for (const [f, d] of seq) {
      this.tone(f, d * 0.95, 'square', 0.1, undefined, t);
      this.tone(f / 2, d * 0.95, 'triangle', 0.08, undefined, t);
      t += d;
    }
  }

  intermission(): void {
    const notes = [392, 440, 494, 523, 587, 523, 494, 440, 392, 440, 494, 523];
    notes.forEach((n, i) => this.tone(n, 0.14, 'square', 0.1, undefined, i * 0.16));
  }

  /** Background loop: siren (pitch rises with `level` 0..4), frightened warble, or eyes returning. */
  loop(mode: 'off' | 'siren' | 'fright' | 'eyes', level = 0): void {
    if (!this.ctx || !this.master) return;
    if (mode === 'off') {
      this.stopLoop();
      return;
    }
    const t = this.ctx.currentTime;
    if (this.sirenMode !== mode || !this.sirenOsc) {
      this.stopLoop();
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      const g = this.ctx.createGain();
      osc.type = mode === 'eyes' ? 'sine' : 'square';
      lfo.type = mode === 'siren' ? 'triangle' : 'square';
      lfo.connect(lfoG).connect(osc.frequency);
      osc.connect(g).connect(this.master);
      g.gain.value = 0;
      g.gain.setTargetAtTime(mode === 'fright' ? 0.07 : 0.05, t, 0.05);
      osc.start();
      lfo.start();
      this.sirenOsc = osc;
      this.sirenGain = g;
      this.sirenLfo = lfo;
      this.sirenMode = mode;
      (osc as unknown as { _lfoG: GainNode })._lfoG = lfoG;
    }
    const osc = this.sirenOsc;
    const lfoG = (osc as unknown as { _lfoG: GainNode })._lfoG;
    if (mode === 'siren') {
      osc.frequency.setTargetAtTime(260 + level * 60, t, 0.1);
      this.sirenLfo!.frequency.setTargetAtTime(1.6 + level * 0.5, t, 0.1);
      lfoG.gain.setTargetAtTime(90 + level * 20, t, 0.1);
    } else if (mode === 'fright') {
      osc.frequency.setTargetAtTime(140, t, 0.05);
      this.sirenLfo!.frequency.setTargetAtTime(9, t, 0.05);
      lfoG.gain.setTargetAtTime(120, t, 0.05);
    } else {
      osc.frequency.setTargetAtTime(700, t, 0.05);
      this.sirenLfo!.frequency.setTargetAtTime(6, t, 0.05);
      lfoG.gain.setTargetAtTime(400, t, 0.05);
    }
  }

  private stopLoop(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0, t, 0.03);
    this.sirenOsc?.stop(t + 0.2);
    this.sirenLfo?.stop(t + 0.2);
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.sirenMode = 'off';
  }
}
