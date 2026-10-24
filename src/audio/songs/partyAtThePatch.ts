/**
 * "Party at the Patch": a second candidate for the win screen (the other is
 * The Pumpkin Mash), leaning harder on the early-'60s monster-dance record,
 * played spooky: a swung doo-wop in A minor on the shared grid (120 BPM, 8
 * bars), Am F Dm E, twice, with a creeping chromatic bass into each
 * turnaround. Its ingredients are the genre's, not any one song's, and the
 * tune is its own: pounding piano triplets, a horror organ holding wobbly
 * chords, a deep "bom, bom-bom" bass voice, a theremin on the tune, ghostly
 * "ooo-wah" answers, a wolf howl, a coffin lid creaking open at the top and a
 * cauldron bubbling at the end.
 *
 * The swing is a triplet grid: 12 steps per bar, 3 per beat.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const AM = 'A3+C4+E4';
const F = 'F3+A3+C4';
const DM = 'D3+F3+A3';
const E = 'E3+G#3+B3';
/** The piano pounds every triplet. */
const pound = (chord: string) => rep(chord, 12).join(' ');
/** The organ holds the chord all bar. */
const hold = (chord: string) => `${chord} ${rep('-', 11).join(' ')}`;
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
      gain: 0.32,
      steps: 12,
      bars: [...rep('x.....x.....', 7), 'x.....x..x..'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.27,
      steps: 12,
      bars: [...rep('...x.....x..', 3), '...x.....x.x', ...rep('...x.....x..', 3), '...x.....xxx'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.23,
      steps: 12,
      bars: rep('x.xx.xx.xx.x', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.27,
      steps: 12,
      bars: [
        'A2 - - C3 - - E3 - - C3 - -',
        'F2 - - A2 - - C3 - - A2 - -',
        'D2 - - F2 - - A2 - - F2 - -',
        'E2 - - G#2 - - B2 - - G#2 - -',
        'A2 - - C3 - - E3 - - C3 - -',
        'F2 - - A2 - - C3 - - A2 - -',
        'D2 - - F2 - - A2 - - F2 - -',
        'E2 - - F2 - - F#2 - - G#2 - -',
      ],
    },
    {
      id: 'bassVoice',
      instrument: 'choir',
      gain: 0.4,
      steps: 12,
      bars: [
        bom('A2', 'E2'),
        bom('F2', 'C3'),
        bom('D2', 'A2'),
        bom('E2', 'B2'),
        bom('A2', 'E2'),
        bom('F2', 'C3'),
        bom('D2', 'A2'),
        bom('E2', 'B2'),
      ],
    },
    {
      id: 'piano',
      instrument: 'piano',
      gain: 0.4,
      steps: 12,
      bars: [pound(AM), pound(F), pound(DM), pound(E), pound(AM), pound(F), pound(DM), pound(E)],
    },
    {
      id: 'organ',
      instrument: 'organ',
      gain: 0.72,
      steps: 12,
      bars: [
        hold('A4+C5+E5'),
        hold('A4+C5+F5'),
        hold('A4+D5+F5'),
        'G#4+B4+E5 - - - - - G#4+B4+D5 - - - - -',
        hold('A4+C5+E5'),
        hold('A4+C5+F5'),
        hold('A4+D5+F5'),
        'G#4+B4+E5 - - G#4+B4+D5 - - G#4+B4+C5 - - G#4+B4 - -',
      ],
    },
    {
      id: 'theremin',
      instrument: 'theremin',
      gain: 0.61,
      steps: 12,
      fx: { echo: { beats: 2 / 3, feedback: 0.3, mix: 0.25 } },
      bars: [
        'E5 - - - - - C5 - - A4 - -',
        'C5 - - - - - A4 - - F4 - -',
        'D5 - - F5 - - A5 - - G#5 - -',
        'B4 - - - - - . . . . . .',
        'A5 - - - - - G#5 - - E5 - -',
        'F5 - - - - - E5 - - C5 - -',
        'D5 - - C5 - - B4 - - A4 - -',
        'G#4 - - - - - . . . . . .',
      ],
    },
    {
      id: 'ghosts',
      instrument: 'choir',
      gain: 0.4,
      steps: 12,
      bars: [
        REST,
        REST,
        REST,
        '. . . . . . E5 - - D5 - -',
        REST,
        REST,
        REST,
        '. . . . . . B4 - - E5 - -',
      ],
    },
    {
      id: 'howl',
      instrument: 'howl',
      gain: 0.5,
      steps: 12,
      bars: [...rep(REST, 3), '. . . . . . A4 - - - - .', ...rep(REST, 4)],
    },
    {
      id: 'coffin',
      instrument: 'creak',
      gain: 0.36,
      steps: 12,
      bars: ['A3 - - - - - . . . . . .', ...rep(REST, 7)],
    },
    {
      id: 'cauldron',
      instrument: 'bubble',
      gain: 0.47,
      steps: 12,
      bars: [...rep(REST, 7), '. . . . . . . . . E5 A5 C6'],
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
      'organ',
      'theremin',
      'ghosts',
      'howl',
      'coffin',
      'cauldron',
    ],
  },
};
