/**
 * "Spooky Surf": the first track. Cheerful Halloween surf rock in A minor at
 * 120 BPM, 8 bars: Am Am F E Am Am Dm E.
 *
 * Setup plays just the bass and hats (the huddle); HIKE! brings in the kick,
 * snare, organ stabs and the twangy lead.
 */
import { rep } from '../synth/notes';
import type { Song } from '../synth/render';

const AM = 'A3+C4+E4';
const F = 'F3+A3+C4';
const E = 'E3+G#3+B3';
const DM = 'D3+F3+A3';
/** Organ stabs on the offbeats. */
const stabs = (chord: string) => `. ${chord} . ${chord} . ${chord} . ${chord}`;

const BASS = {
  am: 'A2 A2 C3 A2 E3 A2 C3 A2',
  f: 'F2 F2 A2 F2 C3 F2 A2 F2',
  e: 'E2 E2 G#2 E2 B2 E2 G#2 B2',
  dm: 'D2 D2 F2 D2 A2 D2 F2 D2',
};

export const spookySurf: Song = {
  id: 'spookySurf',
  name: 'Spooky Surf',
  bpm: 120,
  beatsPerBar: 4,
  bars: 8,
  stems: [
    {
      id: 'kick',
      instrument: 'kick',
      gain: 0.55,
      steps: 16,
      bars: [...rep('x.......x.x.....', 7), 'x.......x.x.x.x.'],
    },
    {
      id: 'snare',
      instrument: 'snare',
      gain: 0.45,
      steps: 16,
      bars: [...rep('....x.......x...', 7), '....x...x.x.XxXX'],
    },
    {
      id: 'hat',
      instrument: 'hat',
      gain: 0.4,
      steps: 16,
      bars: rep('x.x.x.x.x.x.x.X.', 8),
    },
    {
      id: 'bass',
      instrument: 'bass',
      gain: 0.5,
      steps: 8,
      bars: [BASS.am, BASS.am, BASS.f, BASS.e, BASS.am, BASS.am, BASS.dm, BASS.e],
    },
    {
      id: 'organ',
      instrument: 'organ',
      gain: 0.5,
      steps: 8,
      bars: [stabs(AM), stabs(AM), stabs(F), stabs(E), stabs(AM), stabs(AM), stabs(DM), stabs(E)],
    },
    {
      id: 'lead',
      instrument: 'lead',
      gain: 0.45,
      steps: 8,
      fx: { echo: { beats: 0.75, feedback: 0.3, mix: 0.3 }, drive: 0.3 },
      bars: [
        'E5 - C5 - A4 - B4 C5',
        'B4 - A4 - E4 - . .',
        'F4 - A4 - C5 - A4 C5',
        'B4 - G#4 - E4 - . .',
        'E5 - C5 - A4 - B4 C5',
        'E5 - D5 C5 B4 - A4 -',
        'D5 - F5 - E5 D5 C5 B4',
        'G#4 - B4 - E5 - . .',
      ],
    },
  ],
  layers: {
    setup: ['bass', 'hat'],
    play: ['kick', 'snare', 'hat', 'bass', 'organ', 'lead'],
  },
};

export const SONGS: readonly Song[] = [spookySurf];
