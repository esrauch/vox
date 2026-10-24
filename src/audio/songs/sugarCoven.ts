/**
 * "Sugar Coven": the Candy Kingdom. A twisted carnival, sugary on top and
 * sinister underneath, in A minor on the shared grid (120 BPM, 8 bars): Am E
 * Am E Dm Am E Am. An oom-pah tuba, organ "pahs" on the off-beats, a steam
 * calliope on a slinky chromatic tune, a harpsichord-ish counter-line in
 * sixteenths, glockenspiel sparkles, and snare rolls into each half.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

/** The harpsichord runs up and down the chord in sixteenths. */
const run = (a: string, b: string, c: string) => rep(`${a} ${b} ${c} ${b}`, 4).join(' ');
/** Organ "pahs" between the tuba's "ooms". */
const pah = (chord: string) => `. . ${chord} - . . ${chord} -`;
const AM = 'A3+C4+E4';
const DM = 'D3+F3+A3';
const E = 'E3+G#3+B3';

const REST8 = '. . . . . . . .';

export const sugarCoven: Song = {
  id: 'sugarCoven',
  name: 'Sugar Coven',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.35,
      steps: 8,
      bars: rep('x...x...', 8),
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.32,
      steps: 16,
      bars: [
        ...rep('....x.......x...', 3),
        '....x.......xxxX',
        ...rep('....x.......x...', 3),
        '....x...xxxxxxxX',
      ],
    },
    {
      id: 'tuba',
      instrument: 'tuba',
      gain: 0.49,
      steps: 8,
      bars: [
        'A2 - . . E2 - . .',
        'E2 - . . B1 - . .',
        'A2 - . . E2 - . .',
        'E2 - . . G#2 - . .',
        'D2 - . . A2 - . .',
        'A2 - . . E2 - . .',
        'E2 - . . B1 - . .',
        'A2 - . . E2 - A2 .',
      ],
    },
    {
      id: 'pah',
      instrument: 'organ',
      gain: 0.84,
      steps: 8,
      bars: [pah(AM), pah(E), pah(AM), pah(E), pah(DM), pah(AM), pah(E), pah(AM)],
    },
    {
      id: 'harpsichord',
      instrument: 'pluck',
      gain: 0.63,
      steps: 16,
      bars: [
        run('A3', 'C4', 'E4'),
        run('G#3', 'B3', 'E4'),
        run('A3', 'C4', 'E4'),
        run('G#3', 'B3', 'D4'),
        run('A3', 'D4', 'F4'),
        run('A3', 'C4', 'E4'),
        run('G#3', 'B3', 'E4'),
        run('A3', 'C4', 'E4'),
      ],
    },
    {
      id: 'calliope',
      instrument: 'calliope',
      gain: 0.88,
      steps: 8,
      bars: [
        'E5 - D#5 E5 - C5 A4 -',
        'B4 - A#4 B4 - G#4 E4 -',
        'A4 C5 E5 A5 - G#5 A5 -',
        'G#5 - F5 E5 - D5 B4 -',
        'D5 - C#5 D5 - F5 A5 -',
        'C5 - B4 C5 - E5 A4 -',
        'B4 - C5 B4 - A#4 B4 G#4',
        'A4 - - - . . . .',
      ],
    },
    {
      id: 'glock',
      instrument: 'glock',
      gain: 0.59,
      steps: 8,
      bars: [
        REST8,
        REST8,
        REST8,
        'G#6 . E6 . D6 . B5 .',
        REST8,
        REST8,
        REST8,
        '. . . . A6 E6 C6 A5',
      ],
    },
  ],
  layers: {
    setup: ['tuba', 'pah', 'kick'],
    play: ['kick', 'snare', 'tuba', 'pah', 'harpsichord', 'calliope', 'glock'],
  },
};
