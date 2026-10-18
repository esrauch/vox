/**
 * "Midnight Chase": driving and urgent, in A minor on the shared grid (120
 * BPM, 8 bars): the descending Am G F E line, twice, with the lead climbing
 * higher the second time. Four-on-the-floor kick, sixteenth hats with open
 * hats on the "and", a pulsing octave bass and a held organ wash.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const AM = 'A3+C4+E4';
const G = 'G3+B3+D4';
const F = 'F3+A3+C4';
const E = 'E3+G#3+B3';
/** A chord held for the whole bar. */
const held = (chord: string) => `${chord} - - - - - - -`;
/** Octave-pumping eighths on a root. */
const pump = (low: string, high: string) =>
  `${low} ${low} ${high} ${low} ${low} ${low} ${high} ${low}`;

export const midnightChase: Song = {
  id: 'midnightChase',
  name: 'Midnight Chase',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.55,
      steps: 16,
      bars: [...rep('x...x...x...x...', 7), 'x...x...x...x.xx'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.42,
      steps: 16,
      bars: [
        ...rep('....x.......x...', 3),
        '....x.......x.xx',
        ...rep('....x.......x...', 3),
        '....x...x.xxXXXX',
      ],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.36,
      steps: 16,
      bars: rep('xxXxxxXxxxXxxxXx', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.5,
      steps: 8,
      bars: rep([pump('A2', 'A3'), pump('G2', 'G3'), pump('F2', 'F3'), pump('E2', 'E3')], 2),
    },
    {
      id: 'organ',
      instrument: 'organ',
      gain: 0.32,
      steps: 8,
      bars: rep([held(AM), held(G), held(F), held(E)], 2),
    },
    {
      id: 'lead',
      instrument: 'lead',
      gain: 0.42,
      steps: 8,
      fx: { echo: { beats: 0.5, feedback: 0.3, mix: 0.25 }, drive: 0.4 },
      bars: [
        'E4 - A4 - C5 - B4 A4',
        'D4 - G4 - B4 - A4 G4',
        'C4 - F4 - A4 - G4 F4',
        'B3 - E4 - G#4 - B4 -',
        'A4 - C5 - E5 - D5 C5',
        'B4 - D5 - G5 - F5 E5',
        'A4 - C5 - F5 - E5 D5',
        'G#4 B4 E5 G#5 - - . .',
      ],
    },
  ],
  layers: {
    setup: ['bass', 'hat'],
    play: ['kick', 'snare', 'hat', 'bass', 'organ', 'lead'],
  },
};
