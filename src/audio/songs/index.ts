import { crazyCandyCarnival } from './crazyCandyCarnival';
import { harvestHoedown } from './harvestHoedown';
import { hollowHop } from './hollowHop';
import { pumpkinMash } from './pumpkinMash';
import { sugarCoven } from './sugarCoven';

export { SONG_GRID } from './grid';
export { crazyCandyCarnival, harvestHoedown, hollowHop, pumpkinMash, sugarCoven };

/** Every song, in the order a run hears them. All share SONG_GRID, so any two can crossfade. */
export const SONGS = [
  hollowHop,
  sugarCoven,
  harvestHoedown,
  pumpkinMash,
  crazyCandyCarnival,
] as const;

/** Each area's song (the intro plays the first area's), and the win screen's. */
export const AREA_SONGS = [hollowHop, sugarCoven, harvestHoedown] as const;
export const WIN_SONG = pumpkinMash;
/** The Candy Queendom's candidates, being auditioned (?candy=2 plays the second in the game). */
export const CANDY_SONGS = [sugarCoven, crazyCandyCarnival] as const;
