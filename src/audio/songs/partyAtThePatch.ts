/**
 * "Party at the Patch": a second candidate for the win screen (the other is
 * The Pumpkin Mash), leaning harder on the early-'60s doo-wop monster-dance
 * record. Its ingredients are that genre's, not any one song's: a swung
 * I-vi-IV-V in A major (A F#m D E, twice) on the shared grid (120 BPM, 8
 * bars); pounding piano triplets; a deep "bom, bom-bom" bass voice; falsetto
 * "ooo-wah" backing answering each line; a honking sax on the tune (its own
 * tune); and the novelty record's sound effects: a coffin lid creaking open
 * at the top and a cauldron bubbling at the end of each half.
 *
 * The swing is a triplet grid: 12 steps per bar, 3 per beat.
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
/** The bass voice: "bom" on the one, "bom-bom" on the swung three. */
const bom = (root: string, fifth: string) => `${root} - - . . . ${fifth} - ${fifth} . . .`;

const REST = rep('.', 12).join(' ');

export const partyAtThePatch: Song = {
  id: 'partyAtThePatch',
  name: 'Party at the Patch',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.4,
      steps: 12,
      bars: [...rep('x.....x.....', 7), 'x.....x..x..'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.36,
      steps: 12,
      bars: [...rep('...x.....x..', 3), '...x.....x.x', ...rep('...x.....x..', 3), '...x.....xxx'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.32,
      steps: 12,
      bars: rep('x.xx.xx.xx.x', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.36,
      steps: 12,
      bars: [
        'A2 - - C#3 - - E3 - - F#3 - -',
        'F#2 - - A2 - - C#3 - - E3 - -',
        'D2 - - F#2 - - A2 - - B2 - -',
        'E2 - - G#2 - - B2 - - G#2 - -',
        'A2 - - C#3 - - E3 - - F#3 - -',
        'F#2 - - A2 - - C#3 - - E3 - -',
        'D2 - - F#2 - - A2 - - B2 - -',
        'E2 - - G#2 - - B2 - - E2 - -',
      ],
    },
    {
      id: 'bassVoice',
      instrument: 'choir',
      gain: 0.56,
      steps: 12,
      bars: [
        bom('A2', 'E2'),
        bom('F#2', 'C#3'),
        bom('D2', 'A2'),
        bom('E2', 'B2'),
        bom('A2', 'E2'),
        bom('F#2', 'C#3'),
        bom('D2', 'A2'),
        bom('E2', 'B2'),
      ],
    },
    {
      id: 'piano',
      instrument: 'piano',
      gain: 0.6,
      steps: 12,
      bars: [pound(A), pound(FSM), pound(D), pound(E), pound(A), pound(FSM), pound(D), pound(E)],
    },
    {
      id: 'sax',
      instrument: 'sax',
      gain: 0.72,
      steps: 12,
      bars: [
        'A4 - A4 C#5 - - E5 - - . . .',
        'F#5 - E5 C#5 - - . . . . . .',
        'D5 - D5 F#5 - - A5 - - . . .',
        'G#5 - F#5 E5 - - . . . . . .',
        'E5 - E5 A5 - - G#5 - F#5 E5 - -',
        'C#5 - - A4 - - . . . . . .',
        'F#4 - A4 D5 - F#5 E5 - D5 B4 - -',
        'E5 - - - - - . . . . . .',
      ],
    },
    {
      id: 'oooWah',
      instrument: 'choir',
      gain: 0.52,
      steps: 12,
      bars: [
        REST,
        '. . . . . . C#5 - - B4 - -',
        REST,
        '. . . . . . B4 - - E5 - -',
        REST,
        '. . . . . . A4 - - C#5 - -',
        REST,
        '. . . . . . G#4 - - B4 - -',
      ],
    },
    {
      id: 'coffin',
      instrument: 'creak',
      gain: 0.48,
      steps: 12,
      bars: ['A3 - - - - - . . . . . .', ...rep(REST, 7)],
    },
    {
      id: 'cauldron',
      instrument: 'bubble',
      gain: 0.64,
      steps: 12,
      bars: [
        ...rep(REST, 3),
        '. . . . . . . . . E5 A5 C#6',
        ...rep(REST, 3),
        '. . . . . . . . . B4 E5 G#5',
      ],
    },
  ],
  layers: {
    setup: ['piano', 'bass', 'snare'],
    play: [
      'kick',
      'snare',
      'hat',
      'bass',
      'bassVoice',
      'piano',
      'sax',
      'oooWah',
      'coffin',
      'cauldron',
    ],
  },
};
