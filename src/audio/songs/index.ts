import { harvestHoedown } from './harvestHoedown';
import { hollowHop } from './hollowHop';
import { pumpkinMash } from './pumpkinMash';
import { sugarCoven } from './sugarCoven';

export { SONG_GRID } from './grid';
export { harvestHoedown, hollowHop, pumpkinMash, sugarCoven };

/** Every song, in the order a run hears them. All share SONG_GRID, so any two can crossfade. */
export const SONGS = [hollowHop, sugarCoven, harvestHoedown, pumpkinMash] as const;

/** Each area's song (the intro plays the first area's), and the win screen's. */
export const AREA_SONGS = [hollowHop, sugarCoven, harvestHoedown] as const;
export const WIN_SONG = pumpkinMash;
