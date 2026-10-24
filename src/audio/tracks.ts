/**
 * Recorded tracks: whole songs from an audio file (not synth data), played
 * as-is and looped. They don't sit on the shared beat grid, so switching to
 * one is a plain crossfade, not one in step with the beat.
 */
import weGotJackBackUrl from '../../assets/music/weGotJackBack.mp3?url';

export interface Track {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

/** The win screen's song: "We Got Jack Back" (made with Suno). */
export const WIN_TRACK: Track = {
  id: 'weGotJackBack',
  name: 'We Got Jack Back',
  url: weGotJackBackUrl,
};

const fetched = new Map<string, Promise<ArrayBuffer>>();

/** Start downloading a track (once); resolves to its encoded bytes. */
export function fetchTrack(track: Track): Promise<ArrayBuffer> {
  let p = fetched.get(track.id);
  if (!p) {
    p = fetch(track.url).then((r) => {
      if (!r.ok) throw new Error(`${track.id}: ${r.status}`);
      return r.arrayBuffer();
    });
    fetched.set(track.id, p);
  }
  return p;
}
