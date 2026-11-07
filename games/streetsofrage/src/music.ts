import { eighths, halves, wholes } from '@arcade/shared';
import type { FmPatch, FmSong } from '@arcade/shared';

/**
 * Streets of Rage: an original club/house groove in A minor (four on the floor, offbeat open
 * hats, slap FM bass and electric piano stabs), in the spirit of the cartridge's score (not a
 * transcription of it).
 */
const slap: FmPatch = { ratio: 1, index: 6, index2: 0.6, idxDecay: 0.08, attack: 0.003, decay: 0.15, sustain: 0.35, release: 0.05, gain: 0.14 };
const ep: FmPatch = { ratio: 1, index: 1.4, index2: 0.4, idxDecay: 0.3, attack: 0.003, decay: 0.6, sustain: 0.25, release: 0.15, tine: 4, detune: 4, gain: 0.05, pan: 0.25 };
const pad: FmPatch = { ...ep, decay: 2, sustain: 0.6, release: 0.5, attack: 0.05, gain: 0.04 };
const lead: FmPatch = { ratio: 2, index: 1.6, index2: 1.1, idxDecay: 0.3, attack: 0.01, decay: 0.3, sustain: 0.75, release: 0.1, vib: 15, vibDelay: 0.2, detune: 8, gain: 0.075, pan: -0.2 };

/** chord stabs on the offbeats of a bar */
const stab = (c: string) => `. . ${c} . . . ${c} . . ${c} . . ${c} . . .`;
/** octave slap bass for one bar */
const slapBar = (lo: string, hi: string) => `${lo} . ${hi} . ${lo} ${hi} . ${lo} . ${lo} . ${hi} ${lo} . ${hi} .`;

const Am = 'A3+C4+E4+G4', F = 'F3+A3+C4+E4', G = 'G3+B3+D4+E4', Em = 'E3+G3+B3+D4';

export const SR_SONG: FmSong = {
  bpm: 126,
  volume: 0.9,
  kit: { kick: 0.55, snare: 0.3, hat: 0.07 },
  order: [0, 0, 1, 0],
  sections: [
    {
      tracks: [
        { patch: lead, notes: `
          . . E5 . G5 . A5 _ _ . G5 . E5 . D5 .   E5 _ _ . C5 . . . A4 . C5 . D5 _ E5 .
          D5 _ _ . B4 . G4 . . . B4 . D5 . G5 .   E5 _ _ _ D5 . B4 _ _ . G4 . A4 _ _ .
          A5 _ . A5 . G5 . E5 _ . D5 . E5 _ _ .   C6 _ _ . A5 . G5 . E5 _ . . G5 . A5 .
          B5 _ _ . A5 . G5 . D5 _ . . E5 . G5 .   E5 _ _ _ _ _ _ . . . . . . . . .` },
        { patch: ep, notes: [Am, F, G, Em, Am, F, G, Em].map(stab).join(' ') },
        { patch: slap, notes: [['A2', 'A3'], ['F2', 'F3'], ['G2', 'G3'], ['E2', 'E3']].concat([['A2', 'A3'], ['F2', 'F3'], ['G2', 'G3'], ['E2', 'E3']]).map(([a, b]) => slapBar(a, b)).join(' ') },
      ],
      drums: [
        'k...k...k...k...'.repeat(8),
        '....c.......c...'.repeat(8),
        'h.o.h.o.h.o.h.ohh'.slice(0, 16).repeat(8),
      ],
    },
    {
      tracks: [
        { patch: lead, notes: eighths(`
          F5 _ E5 D5 A4 _ C5 _   B4 _ _ G4 E5 _ D5 _   C5 _ A4 _ E5 _ F5 G5   G#5 _ _ _ B5 _ _ .
          A5 _ G5 F5 E5 _ D5 _   G5 _ E5 _ B4 _ D5 _   A5 _ G5 F5 E5 _ C5 _   B4 _ _ _ G#4 _ E4 _`) },
        { patch: pad, notes: wholes('D3+F3+A3+C4 E3+G3+B3+D4 F3+A3+C4+E4 E3+G#3+B3+D4 D3+F3+A3+C4 E3+G3+B3+D4 F3+A3+C4+E4') + ' ' + halves('E3+G#3+B3+D4 E3+G#3+B3+D4') },
        { patch: slap, notes: eighths('D2 . D3 . D2 D3 . . E2 . E3 . E2 E3 . . F2 . F3 . F2 F3 . . E2 . E3 . E2 G#2 B2 E3 D2 . D3 . D2 D3 . . E2 . E3 . E2 E3 . . F2 . F3 . F2 F3 . . E2 E2 E3 E3 G#2 G#2 B2 B2') },
      ],
      drums: [
        'k.......k.......'.repeat(7) + 'k...k...k.k.kkkk',
        '....c.......c...'.repeat(8),
        '..o...o...o...o.'.repeat(8),
      ],
    },
  ],
};
