/**
 * "Crazy Candy Carnival": a second candidate for the Candy Queendom (the
 * other is Sugar Coven). A manic circus galop, in A minor on the shared grid
 * (120 BPM, 8 bars): Am Am E E F Dm E Am. Oom-pah in eighths (a tuba on
 * every beat, piano chords on every off-beat), a calliope racing through
 * chromatic sixteenth-note figures, snare on the off-beats, glockenspiel
 * sparkles, and a slide whistle swooping up at the end of each half.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const AM = 'A3+C4+E4';
const E = 'E3+G#3+B3';
const F = 'F3+A3+C4';
const DM = 'D3+F3+A3';
/** The "pah": a chord on every off-beat. */
const pah = (chord: string) => rep(`. ${chord}`, 4).join(' ');

const REST8 = '. . . . . . . .';

export const crazyCandyCarnival: Song = {
  id: 'crazyCandyCarnival',
  name: 'Crazy Candy Carnival',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.38,
      steps: 8,
      bars: [...rep('x.x.x.x.', 7), 'x.x.xxx.'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.3,
      steps: 8,
      bars: [...rep('.x.x.x.x', 3), '.x.x.xxX', ...rep('.x.x.x.x', 3), '.x.xxxxX'],
    },
    {
      id: 'tuba',
      instrument: 'tuba',
      gain: 0.55,
      steps: 8,
      bars: [
        'A2 . E2 . A2 . E2 .',
        'A2 . E2 . A2 . C3 .',
        'E2 . B1 . E2 . B1 .',
        'E2 . B1 . E2 . G#2 .',
        'F2 . C2 . F2 . C2 .',
        'D2 . A1 . D2 . A1 .',
        'E2 . B1 . E2 . G#2 .',
        'A2 . E2 . A2 . . .',
      ],
    },
    {
      id: 'pah',
      instrument: 'piano',
      gain: 0.59,
      steps: 8,
      bars: [
        pah(AM),
        pah(AM),
        pah(E),
        pah(E),
        pah(F),
        pah(DM),
        pah(E),
        '. A3+C4+E4 . A3+C4+E4 . . . .',
      ],
    },
    {
      id: 'calliope',
      instrument: 'calliope',
      gain: 0.94,
      steps: 16,
      bars: [
        'E5 D#5 E5 . A5 . E5 . C5 B4 C5 . E5 . C5 .',
        'A4 G#4 A4 . C5 . A4 . E4 D#4 E4 . A4 - - .',
        'B4 A#4 B4 . E5 . B4 . G#4 G4 G#4 . B4 . G#4 .',
        'E4 F4 F#4 G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 E5 - - .',
        'F5 E5 F5 . A5 . F5 . C5 B4 C5 . F5 . C5 .',
        'D5 C#5 D5 . F5 . D5 . A4 G#4 A4 . D5 . F5 .',
        'E5 - D#5 - D5 - C#5 - C5 - B4 - G#4 - E4 -',
        'A4 . C5 . E5 . A5 - - - . . . . . .',
      ],
    },
    {
      id: 'glock',
      instrument: 'glock',
      gain: 0.64,
      steps: 8,
      bars: [
        REST8,
        REST8,
        REST8,
        'E6 . B5 . G#5 . E5 .',
        REST8,
        REST8,
        REST8,
        '. . . . A6 E6 C6 A5',
      ],
    },
    {
      id: 'whistle',
      instrument: 'slide',
      gain: 0.77,
      steps: 8,
      bars: [REST8, '. . . . . . E5 -', REST8, REST8, REST8, REST8, REST8, '. . . . A4 - - .'],
    },
  ],
  layers: {
    setup: ['tuba', 'pah', 'kick'],
    play: ['kick', 'snare', 'tuba', 'pah', 'calliope', 'glock', 'whistle'],
  },
};
