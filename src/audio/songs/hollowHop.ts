/**
 * "Hollow Hop": the intro and the Forest. Spooky campfire folk, light and
 * bouncy, in A minor on the shared grid (120 BPM, 8 bars): Am Am Dm Am F E
 * Am E. A plucked, banjo-ish guitar picking the chords, brushes, an upright
 * walking bass with a hop in it, a wobbly theremin on the tune, a music box
 * (glock) answering it, and now and then a frog's ribbit on the off-beat.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

/** The guitar picks each chord: low, middle, high, top, and back down, twice a bar. */
const pick = (lo: string, mid: string, hi: string, top: string) =>
  rep([lo, mid, hi, top, mid, hi, top, hi].join(' '), 2).join(' ');
const AM = pick('A3', 'E4', 'A4', 'C5');
const DM = pick('D4', 'F4', 'A4', 'D5');
const F = pick('F3', 'C4', 'F4', 'A4');
const E = pick('E3', 'B3', 'E4', 'G#4');

const REST8 = '. . . . . . . .';
const REST16 = rep('.', 16).join(' ');

export const hollowHop: Song = {
  id: 'hollowHop',
  name: 'Hollow Hop',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.36,
      steps: 8,
      bars: [...rep('x...x...', 7), 'x...x.x.'],
    },
    {
      id: 'brush',
      instrument: 'brush',
      gain: 0.58,
      steps: 8,
      bars: [...rep('..x...x.', 3), '..x...xx', ...rep('..x...x.', 3), '..x..xXx'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.26,
      steps: 8,
      bars: rep('x.x.x.x.', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.36,
      steps: 8,
      bars: [
        'A2 . . E2 A2 . C3 .',
        'A2 . . E2 A2 . E3 G2',
        'D2 . . A2 D3 . F2 .',
        'A2 . . E2 A2 . C3 .',
        'F2 . . C3 F2 . A2 .',
        'E2 . . B2 E2 . G#2 .',
        'A2 . . E2 A2 . C3 .',
        'E2 . B2 . E3 . G#2 B2',
      ],
    },
    {
      id: 'guitar',
      instrument: 'banjo',
      gain: 0.55,
      steps: 16,
      bars: [AM, AM, DM, AM, F, E, AM, E],
    },
    {
      id: 'theremin',
      instrument: 'theremin',
      gain: 0.8,
      steps: 8,
      fx: { echo: { beats: 0.75, feedback: 0.25, mix: 0.2 } },
      bars: [
        'E5 - - - C5 - A4 -',
        'B4 - C5 - D5 - E5 -',
        'F5 - - - E5 - D5 -',
        'C5 - - - - - . .',
        'A4 - C5 - F5 - E5 -',
        'D5 - - - B4 - G#4 -',
        'A4 - C5 - E5 - A5 -',
        'G#5 - - - - - . .',
      ],
    },
    {
      id: 'musicBox',
      instrument: 'glock',
      gain: 0.66,
      steps: 16,
      bars: [
        REST16,
        REST16,
        REST16,
        '. . . . . . . . . . . . E6 C6 A5 E5',
        REST16,
        REST16,
        REST16,
        '. . . . . . . . . . . . B5 G#5 E5 B4',
      ],
    },
    {
      id: 'ribbit',
      instrument: 'croak',
      gain: 0.51,
      steps: 8,
      bars: [REST8, '. . . . . . . A2', REST8, REST8, REST8, '. . . . . . . E2', REST8, REST8],
    },
  ],
  layers: {
    setup: ['guitar', 'bass', 'brush'],
    play: ['kick', 'brush', 'hat', 'bass', 'guitar', 'theremin', 'musicBox', 'ribbit'],
  },
};
