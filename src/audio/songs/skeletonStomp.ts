/**
 * "Skeleton Stomp": the boss track. Heavy and stompy in A minor on the shared
 * grid (120 BPM, 8 bars): an A pedal riff on a driven bass, with F and E
 * bars for lift, organ stabs, and a lead that's almost a chant.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const RIFF = {
  a: 'A2 - . A2 A3 . A2 - C3 - . A2 D#3 - E3 -',
  f: 'F2 - . F2 F3 . F2 - A2 - . F2 E2 - - -',
  e: 'E2 - . E2 E3 . E2 - G#2 - . E2 D3 - D#3 -',
};
const AM = 'A3+C4+E4';
const F = 'F3+A3+C4';
const E = 'E3+G#3+B3';

export const skeletonStomp: Song = {
  id: 'skeletonStomp',
  name: 'Skeleton Stomp',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.5,
      steps: 16,
      bars: [...rep('X.....x.x.......', 7), 'X.....x.x...x.x.'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.42,
      steps: 16,
      bars: [...rep('....X.......X...', 7), '....X.......XXXX'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.3,
      steps: 16,
      bars: rep('x.x.x.x.x.x.x.X.', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.38,
      steps: 16,
      fx: { drive: 0.6 },
      bars: [RIFF.a, RIFF.a, RIFF.a, RIFF.f, RIFF.a, RIFF.a, RIFF.f, RIFF.e],
    },
    {
      id: 'organ',
      instrument: 'organ',
      gain: 0.36,
      steps: 8,
      bars: [
        `. . . . . . ${AM} .`,
        `. . . . . . ${AM} .`,
        `. . . . . . ${AM} .`,
        `${F} - - - . . . .`,
        `. . . . . . ${AM} .`,
        `. . . . . . ${AM} .`,
        `${F} - - - . . . .`,
        `${E} - - - ${E} - - -`,
      ],
    },
    {
      id: 'chant',
      instrument: 'lead',
      gain: 0.34,
      steps: 8,
      fx: { echo: { beats: 0.75, feedback: 0.25, mix: 0.2 }, drive: 0.5 },
      bars: [
        'A4 . A4 . A4 - G4 -',
        'A4 . A4 . C5 - A4 -',
        'A4 . A4 . A4 - G4 -',
        'F4 . F4 . A4 - C5 -',
        'E5 . E5 . E5 - D5 -',
        'C5 . C5 . D5 - E5 -',
        'F5 - E5 - D5 - C5 -',
        'B4 - G#4 - E4 - . .',
      ],
    },
  ],
  layers: {
    setup: ['bass', 'hat'],
    play: ['kick', 'snare', 'hat', 'bass', 'organ', 'chant'],
  },
};
