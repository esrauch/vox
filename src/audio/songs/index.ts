import { harvestHoedown } from './harvestHoedown';
import { hollowHop } from './hollowHop';
import { partyAtThePatch } from './partyAtThePatch';
import { pumpkinMash } from './pumpkinMash';
import { sugarCoven } from './sugarCoven';

export { SONG_GRID } from './grid';
export { harvestHoedown, hollowHop, partyAtThePatch, pumpkinMash, sugarCoven };

/** Every song, in the order a run hears them. All share SONG_GRID, so any two can crossfade. */
export const SONGS = [hollowHop, sugarCoven, harvestHoedown, pumpkinMash, partyAtThePatch] as const;

/** Each area's song (the intro plays the first area's). */
export const AREA_SONGS = [hollowHop, sugarCoven, harvestHoedown] as const;
/** The win screen's candidates, being auditioned (?winSong=2 plays the second in the game). */
export const WIN_SONGS = [pumpkinMash, partyAtThePatch] as const;
