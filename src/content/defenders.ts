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
  /** What your players' checks are rolled against (GAMEPLAY.md, Checks), before the area's boost. */
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

export const DEFENDERS: Readonly<Record<DefenderKind, DefenderDef>> = {
  cover: {
    name: 'Cover',
    creature: 'Garden Gnome',
    model: 'forest/chaser',
    glyph: 'C',
    stats: { hustle: 1, hands: 0, heft: 0 },
    job: 'cover',
    coverage: 0,
    ignoresSnap: false,
  },
  zone: {
    name: 'Zone',
    creature: 'Scarecrow',
    model: 'forest/waller',
    glyph: 'Z',
    stats: { hustle: 0, hands: 1, heft: 1 },
    job: 'zone',
    coverage: 3,
    ignoresSnap: false,
  },
  safety: {
    name: 'Safety',
    creature: 'Owl',
    model: 'forest/safety',
    glyph: 'S',
    stats: { hustle: 1, hands: 1, heft: 1 },
    job: 'safety',
    coverage: 0,
    ignoresSnap: false,
  },
  bat: {
    name: 'Bat',
    creature: 'Bat',
    model: 'forest/picker',
    glyph: 'V',
    stats: { hustle: 0, hands: 0, heft: -1 },
    job: 'patrol',
    coverage: 1,
    ignoresSnap: true,
  },
};

export const DEFENDER_KINDS = Object.keys(DEFENDERS) as DefenderKind[];
