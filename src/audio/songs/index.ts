import { graveyardShuffle } from './graveyardShuffle';
import { midnightChase } from './midnightChase';
import { skeletonStomp } from './skeletonStomp';
import { spookySurf } from './spookySurf';

export { SONG_GRID } from './grid';
export { graveyardShuffle, midnightChase, skeletonStomp, spookySurf };

/** Every song, from friendliest to most intense. All share SONG_GRID, so any two can crossfade. */
export const SONGS = [graveyardShuffle, spookySurf, midnightChase, skeletonStomp] as const;
