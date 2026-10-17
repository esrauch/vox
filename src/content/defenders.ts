/**
 * Every defender kind in one place (GAMEPLAY.md, What's in the Way): what it
 * is, how it moves, its stats and its look. Adding a kind means adding an
 * entry here (and its movement rule in sim/ai.ts if it needs a new one).
 */
import type { DefenderKind, Stats } from '../sim/types';

/** How a defender picks its next hop (sim/ai.ts). */
export type Movement =
  /** Toward the carrier, else the ball's landing tile, else the nearest player. */
  | 'chase'
  /** Straight at the QB. */
  | 'blitz'
  /** Holds its starting row, sliding into the column of the nearest player coming its way. */
  | 'wall'
  /** Loops a fixed 4×4 box circuit, whatever the play is doing. */
  | 'patrol';

export interface DefenderDef {
  /** The role's name in the rules. */
  readonly name: string;
  /** What the Forest's version of it is. */
  readonly creature: string;
  /** Voxel model id. */
  readonly model: string;
  /** One letter for the dev screen inspector. */
  readonly glyph: string;
  readonly stats: Stats;
  readonly movement: Movement;
  /**
   * Whether it ignores the snap: it moves on every beat from the moment the
   * screen appears, before HIKE and between screens, not only in play.
   */
  readonly ignoresSnap: boolean;
}

/** Stats are all 0 for now; tuned in M2 (MILESTONES: "what 1+ means"). */
const BASE: Stats = { hustle: 0, hands: 0, heft: 0 };

export const DEFENDERS: Readonly<Record<DefenderKind, DefenderDef>> = {
  chaser: {
    name: 'Chaser',
    creature: 'Garden Gnome',
    model: 'forest/chaser',
    glyph: 'C',
    stats: BASE,
    movement: 'chase',
    ignoresSnap: false,
  },
  blitzer: {
    name: 'Blitzer',
    creature: 'Rhino Beetle',
    model: 'forest/blitzer',
    glyph: 'Z',
    stats: BASE,
    movement: 'blitz',
    ignoresSnap: false,
  },
  waller: {
    name: 'Wall-er',
    creature: 'Scarecrow',
    model: 'forest/waller',
    glyph: 'W',
    stats: BASE,
    movement: 'wall',
    ignoresSnap: false,
  },
  picker: {
    name: 'Picker',
    creature: 'Bat',
    model: 'forest/picker',
    glyph: 'P',
    stats: BASE,
    movement: 'patrol',
    ignoresSnap: true,
  },
};

export const DEFENDER_KINDS = Object.keys(DEFENDERS) as DefenderKind[];
