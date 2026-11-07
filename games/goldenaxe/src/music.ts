import { eighths, halves, quarters, wholes } from '@arcade/shared';
import type { FmPatch, FmSong } from '@arcade/shared';

/**
 * Golden Axe: an original heroic march in D minor for FM brass, strings, harp and timpani,
 * in the spirit of the cartridge's score (not a transcription of it).
 */
const brass: FmPatch = { ratio: 1, index: 3.2, index2: 1.6, idxDecay: 0.25, attack: 0.04, decay: 0.4, sustain: 0.7, release: 0.12, vib: 18, vibRate: 5, detune: 6, gain: 0.1 };
const strings: FmPatch = { ratio: 1, index: 0.9, attack: 0.35, decay: 1, sustain: 0.9, release: 0.4, detune: 10, vib: 8, gain: 0.035, pan: -0.3 };
const bass: FmPatch = { ratio: 1, index: 1.8, index2: 0.8, idxDecay: 0.2, attack: 0.01, decay: 0.4, sustain: 0.5, gain: 0.13 };
const harp: FmPatch = { ratio: 3, index: 1.2, index2: 0.1, idxDecay: 0.3, attack: 0.002, decay: 0.25, sustain: 0, release: 0.2, gain: 0.05, pan: 0.4 };

const arp = (a: string, b: string, c: string) => eighths(`${a} ${b} ${c} ${b} ${a} ${b} ${c} ${b}`);

export const GA_SONG: FmSong = {
  bpm: 108,
  volume: 0.9,
  kit: { kick: 0.35, snare: 0.2, hat: 0.04, tom: 0.4 },
  order: [0, 0, 1],
  sections: [
    {
      tracks: [
        { patch: brass, notes: eighths(`
          D5 _ _ A4 D5 E5 F5 _   G5 _ F5 E5 D5 _ _ .   E5 _ _ C5 E5 F5 G5 _   A5 _ _ _ E5 _ C#5 .
          D5 _ _ A4 D5 E5 F5 _   Bb5 _ A5 G5 F5 _ D5 .  F5 _ E5 D5 E5 _ G5 _   A5 _ _ _ _ _ . .`) },
        { patch: strings, notes: wholes('D4+F4+A4 Bb3+D4+F4 C4+E4+G4 A3+C#4+E4 D4+F4+A4 G3+Bb3+D4') + ' ' + halves('Bb3+D4+F4 C4+E4+G4') + ' ' + wholes('A3+C#4+E4') },
        { patch: bass, notes: quarters('D2 D2 A1 D2 Bb1 Bb1 F2 Bb1 C2 C2 G1 C2 A1 A1 E2 A1 D2 D2 A1 D2 G1 G1 D2 G1 Bb1 Bb1 C2 C2 A1 E2 A1 C#2') },
        { patch: harp, pass: 1, notes: [arp('D4', 'F4', 'A4'), arp('Bb3', 'D4', 'F4'), arp('C4', 'E4', 'G4'), arp('A3', 'C#4', 'E4'), arp('D4', 'F4', 'A4'), arp('G3', 'Bb3', 'D4'), arp('Bb3', 'D4', 'F4'), arp('A3', 'C#4', 'E4')].join(' ') },
      ],
      drums: [
        'k...s...k.k.s... k...s...k.k.s... k...s...k.k.s... k...s...t.t.m.m. k...s...k.k.s... k...s...k.k.s... k...s...k.k.s... k...s.s.t.t.mmmm',
        'h.h.h.h.h.h.h.h. h.h.h.h.h.h.h.h. h.h.h.h.h.h.h.h. h.h.h.h......... h.h.h.h.h.h.h.h. h.h.h.h.h.h.h.h. h.h.h.h.h.h.h.h. ................',
      ],
    },
    {
      tracks: [
        { patch: brass, notes: eighths(`
          A5 _ _ G5 F5 _ C5 _   E5 _ _ D5 C5 _ G4 _   F5 _ E5 F5 A5 _ D5 _   F5 _ E5 D5 Bb4 _ _ .
          G5 _ _ F5 D5 _ Bb4 _  C5 _ E5 _ G5 _ C6 _   A5 _ _ G5 F5 _ E5 _   C#5 _ _ _ E5 _ A5 _`) },
        { patch: strings, notes: wholes('F4+A4+C5 C4+E4+G4 D4+F4+A4 Bb3+D4+F4 G3+Bb3+D4 C4+E4+G4 A3+C#4+E4 A3+C#4+E4') },
        { patch: bass, notes: quarters('F1 F1 C2 F1 C2 C2 G1 C2 D2 D2 A1 D2 Bb1 Bb1 F1 Bb1 G1 G1 D2 G1 C2 C2 G1 C2 A1 A1 E2 A1 A1 C#2 E2 A1') },
        { patch: harp, notes: [arp('F4', 'A4', 'C5'), arp('C4', 'E4', 'G4'), arp('D4', 'F4', 'A4'), arp('Bb3', 'D4', 'F4'), arp('G3', 'Bb3', 'D4'), arp('C4', 'E4', 'G4'), arp('A3', 'C#4', 'E4'), arp('A3', 'C#4', 'E4')].join(' ') },
      ],
      drums: [
        't.......s....... t.......s....... t.......s...t.t. t.......s....... t.......s....... t.......s...t.t. t...t...s...t.t. s.s.s.ssssssssx.',
      ],
    },
  ],
};
