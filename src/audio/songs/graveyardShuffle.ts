/**
 * "Graveyard Shuffle": a swung, Monster Mash-style bop in A minor, on the
 * shared grid (120 BPM, 8 bars): Am Am Dm Dm Am E7 Am E7.
 *
 * The swing comes from a triplet grid: 12 steps per bar, 3 per beat, with the
 * long-short shuffle on steps 1 and 3 of each beat. A walking bass, organ
 * stabs on the swung "and", and a bony xylophone (pluck) melody.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';
import { SONG_GRID } from './grid';

const AM = 'A3+C4+E4';
const DM = 'D3+F3+A3';
const E7 = 'E3+G#3+D4';
/** Organ stabs on the swung "and" of every beat. */
const stabs = (chord: string) => rep(`. . ${chord}`, 4).join(' ');

const BASS = {
  am: 'A2 - - C3 - - E3 - - C3 - -',
  amUp: 'A2 - - E3 - - A3 - - G3 - -',
  dm: 'D3 - - F3 - - A3 - - F3 - -',
  dmDown: 'D3 - - C3 - - B2 - - G#2 - -',
  e7: 'E2 - - G#2 - - B2 - - D3 - -',
  e7Turn: 'E2 - - G#2 - - B2 - - G#2 - -',
};

export const graveyardShuffle: Song = {
  id: 'graveyardShuffle',
  name: 'Graveyard Shuffle',
  ...SONG_GRID,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.6,
      steps: 12,
      bars: [...rep('x.....x.....', 7), 'x.....x...x.'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.58,
      steps: 12,
      bars: [...rep('...x.....x..', 7), '...x.....XxX'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.58,
      steps: 12,
      bars: rep('x.xx.xx.xX.x', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.52,
      steps: 12,
      bars: [BASS.am, BASS.amUp, BASS.dm, BASS.dmDown, BASS.am, BASS.e7, BASS.amUp, BASS.e7Turn],
    },
    {
      id: 'organ',
      instrument: 'organ',
      gain: 1.5,
      steps: 12,
      bars: [
        stabs(AM),
        stabs(AM),
        stabs(DM),
        stabs(DM),
        stabs(AM),
        stabs(E7),
        stabs(AM),
        stabs(E7),
      ],
    },
    {
      id: 'bones',
      instrument: 'pluck',
      gain: 1.45,
      steps: 12,
      fx: { echo: { beats: 1 / 3, feedback: 0.2, mix: 0.18 } },
      bars: [
        'A4 - C5 E5 - C5 A4 - - . . E4',
        'A4 - C5 E5 - D5 C5 - B4 A4 - -',
        'D5 - F5 A5 - F5 D5 - - . . A4',
        'D5 - C5 B4 - A4 F4 - - . . .',
        'E5 - E5 E5 - D5 C5 - A4 C5 - E5',
        'D5 - B4 G#4 - B4 D5 - - . . .',
        'C5 - B4 A4 - E4 A4 - B4 C5 - E5',
        'D5 - - B4 - G#4 E4 - - . . .',
      ],
    },
  ],
  layers: {
    setup: ['bass', 'hat'],
    play: ['kick', 'snare', 'hat', 'bass', 'organ', 'bones'],
  },
};
