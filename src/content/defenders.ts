/**
 * Every defender kind in one place (GAMEPLAY.md, The Defense): what it is,
 * its job, its coverage ring, its stats and its look. Adding a kind means
 * adding an entry here (and its job in sim/ai.ts if it needs a new one).
 */
import type { DefenderKind, Stats } from '../sim/types';

/** How a defender picks its next hop (sim/ai.ts). */
export type Job =
  /** Man coverage: shadows one receiver, one tick behind; chases the carrier after a catch. */
  | 'cover'
  /** Planted: never moves, guards a wide area. */
  | 'zone'
  /** The pass rush: pushes the pocket back on the pocket clock; chases the carrier after a catch. */
  | 'rush'
  /** The deep guard: holds its row level with your deepest receiver (or the landing spot); after a catch, into the carrier's column, then down. */
  | 'safety'
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
  readonly job: Job;
  /**
   * The radius (tiles, half-yards) of its purple ring: a pass coming down
   * low inside it is knocked away. 0 means no ring: it can still bat down a
   * low pass that comes close (sim/step.ts), like every defender.
   */
  readonly coverage: number;
  /** Whether it moves before the snap and between downs too, not only in play. */
  readonly ignoresSnap: boolean;
}

/** Stats are all 0 for now; tuned later (MILESTONES: "what 1+ means"). */
const BASE: Stats = { hustle: 0, hands: 0, heft: 0 };

export const DEFENDERS: Readonly<Record<DefenderKind, DefenderDef>> = {
  cover: {
    name: 'Cover',
    creature: 'Garden Gnome',
    model: 'forest/chaser',
    glyph: 'C',
    stats: BASE,
    job: 'cover',
    coverage: 0,
    ignoresSnap: false,
  },
  zone: {
    name: 'Zone',
    creature: 'Scarecrow',
    model: 'forest/waller',
    glyph: 'Z',
    stats: BASE,
    job: 'zone',
    coverage: 3,
    ignoresSnap: false,
  },
  blitzer: {
    name: 'Blitzer',
    creature: 'Rhino Beetle',
    model: 'forest/blitzer',
    glyph: 'B',
    stats: BASE,
    job: 'rush',
    coverage: 0,
    ignoresSnap: false,
  },
  safety: {
    name: 'Safety',
    creature: 'Owl',
    model: 'forest/safety',
    glyph: 'S',
    stats: BASE,
    job: 'safety',
    coverage: 0,
    ignoresSnap: false,
  },
  bat: {
    name: 'Bat',
    creature: 'Bat',
    model: 'forest/picker',
    glyph: 'V',
    stats: BASE,
    job: 'patrol',
    coverage: 1,
    ignoresSnap: true,
  },
};

export const DEFENDER_KINDS = Object.keys(DEFENDERS) as DefenderKind[];
