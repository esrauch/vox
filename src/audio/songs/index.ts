import { harvestHoedown } from './harvestHoedown';
import { hollowHop } from './hollowHop';
import { partyAtThePatch } from './partyAtThePatch';
import { spookyCow } from './spookyCow';
import { sugarCoven } from './sugarCoven';

export { SONG_GRID } from './grid';
export { harvestHoedown, hollowHop, partyAtThePatch, spookyCow, sugarCoven };

/** Every song, in the order a run hears them. All share SONG_GRID, so any two can crossfade. */
export const SONGS = [hollowHop, sugarCoven, harvestHoedown, partyAtThePatch, spookyCow] as const;

/** The intro's and the first two areas' songs. */
export const AREA_SONGS = [hollowHop, sugarCoven] as const;
/** Frederick's Farm's candidates, being auditioned (?farmSong=2 plays the second in the game). */
export const FARM_SONGS = [harvestHoedown, spookyCow] as const;
/** Every song the game plays (the others are only on the dev audio board). */
export const GAME_SONGS = [...AREA_SONGS, ...FARM_SONGS] as const;
