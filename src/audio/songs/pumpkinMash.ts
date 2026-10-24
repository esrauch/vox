/**
 * "The Pumpkin Mash": the win screen. A homage to the '60s doo-wop novelty
 * dance hits (in style only: the tune is its own), in A major on the shared
 * grid (120 BPM, 8 bars), swung: A F#m D E, twice. Pounding piano triplets,
 * a walking bass, a choir going "ooh... wah", a honking sax on the tune, a
 * twangy guitar answering, and handclaps on 2 and 4.
 *
 * The swing is a triplet grid: 12 steps per bar, the long-short shuffle on
 * steps 1 and 3 of each beat.
 * It's in A major, the others' A minor shares its root, so a crossfade into
 * it barely clashes.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const A = 'A3+C#4+E4';
const FSM = 'F#3+A3+C#4';
const D = 'D3+F#3+A3';
const E = 'E3+G#3+B3';
/** The piano pounds every triplet. */
const pound = (chord: string) => rep(chord, 12).join(' ');
/** The choir: "ooh" on the one, "wah" on the three. */
const ooh = (chord: string) => `${chord} - - - - - ${chord} - - - - -`;

export const pumpkinMash: Song = {
  id: 'pumpkinMash',
  name: 'The Pumpkin Mash',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.36,
      steps: 12,
      bars: [...rep('x.....x.....', 7), 'x.....x...x.'],
    },
    {
      id: 'clap',
      instrument: 'clap',
      gain: 0.33,
      steps: 12,
      bars: [...rep('...x.....x..', 7), '...x.....xxx'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.3,
      steps: 12,
      bars: rep('x.xx.xx.xx.x', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.33,
      steps: 12,
      bars: [
        'A2 - - C#3 - - E3 - - C#3 - -',
        'F#2 - - A2 - - C#3 - - A2 - -',
        'D2 - - F#2 - - A2 - - F#2 - -',
        'E2 - - G#2 - - B2 - - G#2 - -',
        'A2 - - C#3 - - E3 - - C#3 - -',
        'F#2 - - A2 - - C#3 - - A2 - -',
        'D2 - - F#2 - - A2 - - F#2 - -',
        'E2 - - G#2 - - B2 - - D3 - -',
      ],
    },
    {
      id: 'piano',
      instrument: 'piano',
      gain: 0.56,
      steps: 12,
      bars: [pound(A), pound(FSM), pound(D), pound(E), pound(A), pound(FSM), pound(D), pound(E)],
    },
    {
      id: 'choir',
      instrument: 'choir',
      gain: 0.49,
      steps: 12,
      bars: [ooh(A), ooh(FSM), ooh(D), ooh(E), ooh(A), ooh(FSM), ooh(D), ooh(E)],
    },
    {
      id: 'sax',
      instrument: 'sax',
      gain: 0.63,
      steps: 12,
      bars: [
        'E4 - - A4 - C#5 E5 - - . . .',
        'F#5 - E5 C#5 - - A4 - - . . .',
        'F#4 - A4 D5 - F#5 A5 - - F#5 - D5',
        'E5 - - - - - B4 - C#5 D5 - -',
        'C#5 - - E5 - - A5 - - G#5 - A5',
        'F#5 - - C#5 - - A4 - - C#5 - -',
        'D5 - F#5 A5 - F#5 D5 - B4 A4 - F#4',
        'E4 - - G#4 - - B4 - - E5 - -',
      ],
    },
    {
      id: 'twang',
      instrument: 'lead',
      gain: 0.53,
      steps: 12,
      fx: { echo: { beats: 1 / 3, feedback: 0.25, mix: 0.2 } },
      bars: [
        '. . . . . . . . . E4 G#4 A4',
        '. . . . . . . . . C#5 A4 F#4',
        ...rep('. . . . . . . . . . . .', 3),
        '. . . . . . . . . E4 F#4 A4',
        ...rep('. . . . . . . . . . . .', 2),
      ],
    },
  ],
  layers: {
    setup: ['piano', 'bass', 'clap'],
    play: ['kick', 'clap', 'hat', 'bass', 'piano', 'choir', 'sax', 'twang'],
  },
};
