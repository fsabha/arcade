import { eighths } from '@arcade/shared';
import type { FmPatch, FmSong } from '@arcade/shared';

/**
 * Virtua Racing: an original up-tempo rock theme in E major with an FM overdrive lead, chugging
 * power chords, a driving eighth-note bass and rock drums, in the spirit of the arcade's score
 * (not a transcription of it).
 */
const guitar: FmPatch = { ratio: 1, index: 5, index2: 3.5, idxDecay: 0.3, attack: 0.005, decay: 0.5, sustain: 0.75, release: 0.08, vib: 25, vibDelay: 0.18, vibRate: 6, detune: 10, gain: 0.065 };
const rhythm: FmPatch = { ratio: 1, index: 4, index2: 1.5, idxDecay: 0.06, attack: 0.003, decay: 0.12, sustain: 0.3, release: 0.04, detune: 12, gain: 0.045, pan: 0.35 };
const bass: FmPatch = { ratio: 1, index: 2.5, index2: 0.8, idxDecay: 0.1, attack: 0.003, decay: 0.2, sustain: 0.5, release: 0.05, gain: 0.12 };

const chug = (pc: string) => eighths(`${pc} ${pc} . ${pc} ${pc} . ${pc} ${pc}`);
const drive = (r: string, hi: string) => eighths(`${r} ${r} ${r} ${r} ${r} ${r} ${hi} ${r}`);
const P: Record<string, [string, string, string]> = {
  E: ['E3+B3', 'E2', 'E3'], 'C#m': ['C#3+G#3', 'C#2', 'C#3'], A: ['A2+E3', 'A1', 'A2'], B: ['B2+F#3', 'B1', 'B2'], 'F#m': ['F#2+C#3', 'F#2', 'F#3'],
};
const rhythmOf = (chords: string[]) => chords.map((c) => chug(P[c][0])).join(' ');
const bassOf = (chords: string[]) => chords.map((c) => drive(P[c][1], P[c][2])).join(' ');

const A = ['E', 'C#m', 'A', 'B', 'E', 'C#m', 'A', 'B'];
const B = ['C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'B'];
const rock = 'k.....k.k.......';

export const VR_SONG: FmSong = {
  bpm: 152,
  volume: 0.85,
  kit: { kick: 0.5, snare: 0.35, hat: 0.06 },
  order: [0, 0, 1, 0],
  sections: [
    {
      tracks: [
        { patch: guitar, notes: eighths(`
          B4 _ E5 _ G#5 _ F#5 E5   F#5 _ E5 _ C#5 _ B4 _   A4 _ C#5 _ E5 _ F#5 G#5   A5 _ G#5 _ F#5 _ D#5 _
          E5 _ _ B4 E5 F#5 G#5 _   G#5 _ A5 G#5 F#5 _ E5 _   C#5 _ E5 _ A5 _ G#5 F#5   F#5 _ _ _ B5 _ _ .`) },
        { patch: rhythm, notes: rhythmOf(A) },
        { patch: bass, notes: bassOf(A) },
      ],
      drums: [rock.repeat(7) + 'k.k.k.k.k.k.kkkk', 'x...s.......s...' + '....s.......s...'.repeat(6) + '....s...s.s.ssss', 'h.h.h.h.h.h.h.h.'.repeat(8)],
    },
    {
      tracks: [
        { patch: guitar, notes: eighths(`
          E5 _ _ _ C#5 _ E5 _   F#5 _ E5 _ C#5 _ A4 _   B4 _ _ _ G#4 _ B4 _   D#5 _ _ _ F#5 _ _ _
          G#5 _ _ _ E5 _ G#5 _  A5 _ G#5 _ F#5 _ E5 _   F#5 _ A5 _ C#6 _ B5 A5   B5 _ A5 _ G#5 _ F#5 D#5`) },
        { patch: rhythm, notes: rhythmOf(B) },
        { patch: bass, notes: bassOf(B) },
      ],
      drums: [rock.repeat(8), 'x...s.......s...' + '....s.......s...'.repeat(7), 'o.h.o.h.o.h.o.h.'.repeat(8)],
    },
  ],
};
