/**
 * "Spooky Cow": a candidate for Frederick's Farm (the other is Harvest Moon
 * Hoedown). A ghost-rider western: a galloping cowpoke tune in A minor on
 * the shared grid (120 BPM, 8 bars) over the Andalusian walk-down, Am G F E,
 * twice. A galloping bass (long, short-short), a cowbell, an eerie "ahh"
 * choir holding the chords, a twangy guitar with a long canyon echo on the
 * tune, a theremin answering it, and a ghostly cow mooing at the end of the
 * first half.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

/** The gallop: root, then the fifth twice quick, every beat (sixteenths). */
const gallop = (root: string, fifth: string) =>
  rep(`${root} . ${root} ${root} ${fifth} . ${fifth} ${fifth}`, 2).join(' ');
/** The choir holds the chord all bar. */
const ahh = (chord: string) => `${chord} - - - - - - -`;

const REST8 = '. . . . . . . .';

export const spookyCow: Song = {
  id: 'spookyCow',
  name: 'Spooky Cow',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.45,
      steps: 16,
      bars: [...rep('x...x...x...x...', 7), 'x...x...x.x.x.x.'],
    },
    {
      id: 'hooves',
      instrument: 'hat',
      gain: 0.32,
      steps: 16,
      bars: rep('x.xxx.xxx.xxx.xx', 8),
    },
    {
      id: 'cowbell',
      instrument: 'cowbell',
      gain: 0.45,
      steps: 8,
      bars: [...rep('..x...x.', 3), 'X.x.X.x.', ...rep('..x...x.', 3), 'X.x.X.xx'],
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.41,
      steps: 16,
      bars: [
        gallop('A2', 'E2'),
        gallop('G2', 'D2'),
        gallop('F2', 'C3'),
        gallop('E2', 'B1'),
        gallop('A2', 'E2'),
        gallop('G2', 'D2'),
        gallop('F2', 'C3'),
        gallop('E2', 'B1'),
      ],
    },
    {
      id: 'choir',
      instrument: 'choir',
      gain: 0.45,
      steps: 8,
      bars: [
        ahh('A3+C4+E4'),
        ahh('G3+B3+D4'),
        ahh('F3+A3+C4'),
        ahh('E3+G#3+B3'),
        ahh('A3+C4+E4'),
        ahh('G3+B3+D4'),
        ahh('F3+A3+C4'),
        ahh('E3+G#3+B3'),
      ],
    },
    {
      id: 'twang',
      instrument: 'lead',
      gain: 0.72,
      steps: 8,
      fx: { echo: { beats: 0.75, feedback: 0.4, mix: 0.3 } },
      bars: [
        'A4 - - C5 E5 - - -',
        'D5 - - B4 G4 - - -',
        'C5 - - A4 F5 - E5 -',
        'E5 - - - . . . .',
        'A5 - - G5 E5 - - C5',
        'D5 - - B4 D5 - G5 -',
        'F5 - E5 - C5 - A4 -',
        'G#4 - - - B4 - E5 -',
      ],
    },
    {
      id: 'theremin',
      instrument: 'theremin',
      gain: 0.72,
      steps: 8,
      bars: [REST8, '. . . . . . A5 -', REST8, REST8, REST8, '. . . . . . . B5', REST8, REST8],
    },
    {
      id: 'moo',
      instrument: 'moo',
      gain: 0.72,
      steps: 8,
      bars: [REST8, REST8, REST8, '. . . . D3 - - -', REST8, REST8, REST8, REST8],
    },
  ],
  layers: {
    setup: ['bass', 'hooves', 'cowbell'],
    play: ['kick', 'hooves', 'cowbell', 'bass', 'choir', 'twang', 'theremin', 'moo'],
  },
};
