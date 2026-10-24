/**
 * "Harvest Moon Hoedown": the Farm. A midnight barn dance in the cornrows,
 * spooky bluegrass in A minor on the shared grid (120 BPM, 8 bars): Am G Am
 * E Am G F E. Banjo rolls in sixteenths, a scratchy fiddle lead, a slapped
 * root-and-fifth bass, stomps and claps, a shaker, and a crow's caw at the
 * end of each half. The sixteenths make it feel the fastest of the three.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

/** A forward roll: three strings round and round, landing on the top note. */
const roll = (lo: string, mid: string, hi: string, top: string) =>
  rep([lo, mid, hi, lo, mid, hi, lo, top].join(' '), 2).join(' ');
const AM = roll('A3', 'C4', 'E4', 'A4');
const G = roll('G3', 'B3', 'D4', 'G4');
const E = roll('E3', 'G#3', 'B3', 'E4');
const F = roll('F3', 'A3', 'C4', 'F4');

const REST8 = '. . . . . . . .';

export const harvestHoedown: Song = {
  id: 'harvestHoedown',
  name: 'Harvest Moon Hoedown',
  ...SONG_GRID,
  stems: [
    {
      id: 'stomp',
      instrument: 'kick',
      gain: 0.67,
      steps: 8,
      bars: [...rep('x...x...', 3), 'x...x.x.', ...rep('x...x...', 3), 'x.x.x.x.'],
    },
    {
      id: 'clap',
      instrument: 'clap',
      gain: 0.62,
      steps: 8,
      bars: rep('..x...x.', 8),
    },
    {
      id: 'shaker',
      instrument: 'hat',
      gain: 0.45,
      steps: 16,
      bars: rep('.x.x.x.x.x.x.x.x', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.56,
      steps: 8,
      bars: [
        'A2 . E2 . A2 . E2 .',
        'G2 . D2 . G2 . D2 .',
        'A2 . E2 . A2 . E2 .',
        'E2 . B1 . E2 . G#2 .',
        'A2 . E2 . A2 . E2 .',
        'G2 . D2 . G2 . D2 .',
        'F2 . C2 . F2 . C2 .',
        'E2 . B1 . E2 . G#2 B2',
      ],
    },
    {
      id: 'banjo',
      instrument: 'banjo',
      gain: 0.78,
      steps: 16,
      bars: [AM, G, AM, E, AM, G, F, E],
    },
    {
      id: 'fiddle',
      instrument: 'fiddle',
      gain: 1.12,
      steps: 16,
      bars: [
        'A4 - - - C5 - E5 - A5 - G5 - E5 - C5 -',
        'B4 - - - D5 - G5 - - - F#5 - G5 - D5 -',
        'C5 - B4 - A4 - B4 - C5 - D5 - E5 - - -',
        'G#4 - - - B4 - - - E5 - D5 - B4 - G#4 -',
        'A4 - - - E5 - - - A5 - - - G5 - E5 -',
        'D5 - - - G5 - - - B5 - A5 - G5 - D5 -',
        'C5 - A4 - F4 - A4 - C5 - F5 - E5 - D5 -',
        'E5 - - - B4 - - - G#4 - - - . . . .',
      ],
    },
    {
      id: 'caw',
      instrument: 'caw',
      gain: 0.62,
      steps: 8,
      bars: [REST8, REST8, REST8, '. . . . . . E5 .', REST8, REST8, REST8, '. . . . . . E5 E5'],
    },
  ],
  layers: {
    setup: ['banjo', 'bass', 'stomp'],
    play: ['stomp', 'clap', 'shaker', 'bass', 'banjo', 'fiddle', 'caw'],
  },
};
