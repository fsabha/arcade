/**
 * A small FM sound chip for the Mega Drive games, in the spirit of the YM2612: each voice is a
 * sine carrier phase-modulated by a sine modulator whose depth (the index) moves on its own
 * envelope, which is where FM brass, slap bass, electric piano and distorted leads come from.
 * Drums are synthesized (pitch-dropped sine kick, filtered-noise snare and hats, toms).
 *
 * Songs are step grids of sixteenth notes. Every track is a string of tokens separated by
 * spaces: a note ('A4', 'C#5'), a chord ('A3+C4+E4'), '.' for a rest or '_' to hold.
 * Drum tracks use one letter per step: k kick, s snare, c clap, h closed hat, o open hat,
 * t low tom, m mid tom, x crash, '.' nothing.
 */
import { noteHz } from './music';

export interface FmPatch {
  /** modulator frequency / carrier frequency */
  ratio: number;
  /** modulation index at the attack and after `idxDecay` seconds */
  index: number;
  index2?: number;
  idxDecay?: number;
  attack?: number;
  /** carrier decay to `sustain` (0..1) over `decay` seconds */
  decay?: number;
  sustain?: number;
  release?: number;
  /** a second, detuned carrier for chorus (cents) */
  detune?: number;
  /** vibrato depth in cents and rate in Hz, after `vibDelay` seconds */
  vib?: number;
  vibRate?: number;
  vibDelay?: number;
  /** octave shift applied to every note */
  octave?: number;
  gain: number;
  /** extra sine tine at this multiple (electric piano), with its own quick decay */
  tine?: number;
  /** stereo position -1..1 */
  pan?: number;
}

export interface FmTrack {
  patch: FmPatch;
  /** one string per section; tokens are sixteenth notes */
  notes: string;
  /** only play on alternate passes of the song (0 = first, 1 = second), for variety */
  pass?: 0 | 1;
}

export interface FmSection {
  tracks: FmTrack[];
  /** one letter per sixteenth, see the header; several lanes play together */
  drums?: string | string[];
  /** number of sixteenth steps (defaults to the longest track) */
  steps?: number;
}

export interface FmSong {
  bpm: number;
  sections: FmSection[];
  /** section indices in play order; loops forever */
  order: number[];
  /** overall level */
  volume?: number;
  /** drum kit levels */
  kit?: { kick?: number; snare?: number; hat?: number; tom?: number };
}

export interface FmHost {
  readonly ctx: AudioContext | null;
  readonly out: AudioNode | null;
  readonly noise: AudioBuffer | null;
}

interface Parsed { steps: number; tracks: { patch: FmPatch; pass?: 0 | 1; events: { step: number; len: number; notes: number[] }[] }[]; drums: string[] }

/** Turns token strings into note events with lengths (holds extend the previous note). */
export function parseSection(sec: FmSection): Parsed {
  const tracks = sec.tracks.map((t) => {
    const toks = t.notes.trim().split(/\s+/);
    const events: { step: number; len: number; notes: number[] }[] = [];
    toks.forEach((tok, i) => {
      if (tok === '_') { if (events.length) events[events.length - 1].len++; return; }
      if (tok === '.') return;
      events.push({ step: i, len: 1, notes: tok.split('+').map(noteHz).filter((f) => f > 0) });
    });
    return { patch: t.patch, pass: t.pass, events, n: toks.length };
  });
  const drums = (Array.isArray(sec.drums) ? sec.drums : sec.drums ? [sec.drums] : []).map((d) => d.replace(/\s+/g, ''));
  const steps = sec.steps ?? Math.max(0, ...drums.map((d) => d.length), ...tracks.map((t) => t.n));
  return { steps, tracks, drums };
}

export class FmMusic {
  /** Overall music level against the sound effects (the mixed FM voices peak near 1). */
  static LEVEL = 0.28;
  private timer: ReturnType<typeof setInterval> | null = null;
  private song: FmSong | null = null;
  private parsed: Parsed[] = [];
  private next = 0;
  private pos = 0; // index into order
  private step = 0;
  private pass = 0;
  private enabled = true;
  private wanted = false;
  private bus: GainNode | null = null;

  constructor(private host: FmHost) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.halt();
    else if (this.wanted) this.run();
  }

  start(song: FmSong): void {
    if (song !== this.song) { this.song = song; this.parsed = song.sections.map(parseSection); this.halt(); }
    this.wanted = true;
    if (this.enabled) this.run();
  }

  stop(): void {
    this.wanted = false;
    this.halt();
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  private run(): void {
    const ctx = this.host.ctx;
    if (this.timer || !ctx || !this.host.out || !this.song) return;
    this.bus = ctx.createGain();
    // music sits well under the effects: the voices sum hot, so the bus starts at a third
    this.bus.gain.value = (this.song.volume ?? 1) * FmMusic.LEVEL;
    this.bus.connect(this.host.out);
    this.next = ctx.currentTime + 0.1;
    this.pos = 0; this.step = 0; this.pass = 0;
    this.timer = setInterval(() => this.schedule(), 100);
    this.schedule();
  }

  private halt(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus && this.host.ctx) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, this.host.ctx.currentTime, 0.05);
      setTimeout(() => b.disconnect(), 400);
    }
    this.bus = null;
  }

  private schedule(): void {
    const ctx = this.host.ctx, song = this.song;
    if (!ctx || !song || !this.bus) return;
    const six = 60 / song.bpm / 4;
    while (this.next < ctx.currentTime + 0.35) {
      const sec = this.parsed[song.order[this.pos]];
      for (const tr of sec.tracks) {
        if (tr.pass !== undefined && tr.pass !== this.pass % 2) continue;
        for (const ev of tr.events) if (ev.step === this.step) for (const f of ev.notes) this.voice(tr.patch, f, this.next, ev.len * six);
      }
      for (const lane of sec.drums) { const d = lane[this.step]; if (d && d !== '.') this.drum(d, this.next); }
      this.next += six;
      if (++this.step >= sec.steps) {
        this.step = 0;
        if (++this.pos >= song.order.length) { this.pos = 0; this.pass++; }
      }
    }
  }

  /** One FM note: modulator -> carrier frequency, both with envelopes. */
  private voice(p: FmPatch, freq: number, t: number, dur: number): void {
    const ctx = this.host.ctx!;
    const f = freq * Math.pow(2, p.octave ?? 0);
    const attack = p.attack ?? 0.005, decay = p.decay ?? 0.3, sus = p.sustain ?? 0.6, rel = p.release ?? 0.08;
    const end = t + Math.max(dur, attack + 0.02);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(p.gain, t + attack);
    out.gain.setTargetAtTime(p.gain * sus, t + attack, decay / 3);
    out.gain.setTargetAtTime(0.0001, end, rel / 3);
    let dest: AudioNode = this.bus!;
    if (p.pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = p.pan; pn.connect(dest); dest = pn; }
    out.connect(dest);
    const stopAt = end + rel + 0.05;
    const carriers = p.detune ? [0, p.detune] : [0];
    for (const cents of carriers) {
      const car = ctx.createOscillator();
      car.frequency.value = f;
      car.detune.value = cents;
      const mod = ctx.createOscillator();
      mod.frequency.value = f * p.ratio;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(f * p.ratio * p.index, t);
      if (p.index2 !== undefined) depth.gain.setTargetAtTime(f * p.ratio * p.index2, t + 0.002, (p.idxDecay ?? 0.2) / 3);
      mod.connect(depth).connect(car.frequency);
      if (p.vib) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = p.vibRate ?? 5.5;
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t);
        lg.gain.setValueAtTime(0, t + (p.vibDelay ?? 0.15));
        lg.gain.linearRampToValueAtTime(p.vib, t + (p.vibDelay ?? 0.15) + 0.2);
        lfo.connect(lg).connect(car.detune);
        lfo.start(t); lfo.stop(stopAt);
      }
      const g = ctx.createGain();
      g.gain.value = 1 / carriers.length;
      car.connect(g).connect(out);
      car.start(t); mod.start(t);
      car.stop(stopAt); mod.stop(stopAt);
    }
    if (p.tine) {
      const tn = ctx.createOscillator();
      tn.frequency.value = f * p.tine;
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(p.gain * 0.35, t);
      tg.gain.setTargetAtTime(0.0001, t + 0.01, 0.05);
      tn.connect(tg).connect(dest);
      tn.start(t); tn.stop(t + 0.4);
    }
  }

  private drum(k: string, t: number): void {
    const ctx = this.host.ctx!, bus = this.bus!;
    const kit = this.song!.kit ?? {};
    const env = (g: GainNode, v: number, d: number) => { g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0.0001, t + 0.002, d / 3); };
    const pitched = (f0: number, f1: number, d: number, v: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.6);
      env(g, v, d); o.connect(g).connect(bus); o.start(t); o.stop(t + d + 0.1);
    };
    const noise = (type: BiquadFilterType, f: number, d: number, v: number, q = 0.8) => {
      if (!this.host.noise) return;
      const s = ctx.createBufferSource(); s.buffer = this.host.noise;
      s.playbackRate.value = 0.7 + Math.random() * 0.6;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); env(g, v, d);
      s.connect(fl).connect(g).connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.1);
    };
    const K = kit.kick ?? 0.5, S = kit.snare ?? 0.3, H = kit.hat ?? 0.08, T = kit.tom ?? 0.3;
    switch (k) {
      case 'k': pitched(160, 42, 0.28, K); break;
      case 's': noise('bandpass', 1900, 0.18, S, 0.7); pitched(220, 160, 0.08, S * 0.6); break;
      case 'c': noise('bandpass', 1300, 0.16, S * 1.1, 1.4); break;
      case 'h': noise('highpass', 7500, 0.04, H); break;
      case 'o': noise('highpass', 6500, 0.22, H * 1.1); break;
      case 't': pitched(140, 80, 0.3, T); break;
      case 'm': pitched(210, 120, 0.25, T); break;
      case 'x': noise('highpass', 4000, 0.9, H * 2.5, 0.5); break;
    }
  }
}

/** Writes a line in longer note values: each token lasts `n` sixteenths ('.' stays a rest). */
export function every(n: number, line: string): string {
  return line.trim().split(/\s+/).map((tok) => [tok, ...Array(n - 1).fill(tok === '.' ? '.' : '_')].join(' ')).join(' ');
}
export const eighths = (s: string) => every(2, s);
export const quarters = (s: string) => every(4, s);
export const halves = (s: string) => every(8, s);
export const wholes = (s: string) => every(16, s);

/** Checks a song: every track and drum lane spans the section, every note parses. Returns problems. */
export function validateSong(song: FmSong): string[] {
  const out: string[] = [];
  song.sections.forEach((sec, si) => {
    const p = parseSection(sec);
    if (p.steps % 16) out.push(`section ${si}: ${p.steps} steps is not whole bars`);
    sec.tracks.forEach((t, ti) => {
      const toks = t.notes.trim().split(/\s+/);
      if (toks.length !== p.steps) out.push(`section ${si} track ${ti}: ${toks.length} steps, expected ${p.steps}`);
      for (const tok of toks) if (tok !== '.' && tok !== '_' && tok.split('+').some((n) => noteHz(n) <= 0)) out.push(`section ${si} track ${ti}: bad note '${tok}'`);
    });
    p.drums.forEach((d, di) => {
      if (d.length !== p.steps) out.push(`section ${si} drums ${di}: ${d.length} steps, expected ${p.steps}`);
      if (/[^kschotmx.]/.test(d)) out.push(`section ${si} drums ${di}: unknown drum letter`);
    });
  });
  for (const i of song.order) if (!song.sections[i]) out.push(`order points at missing section ${i}`);
  return out;
}
