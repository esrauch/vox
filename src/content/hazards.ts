/**
 * Every hazard kind in one place (GAMEPLAY.md, Haunted Forest hazards).
 * Hazards are pure beat patterns: where one is is set by the beat number
 * alone (sim/hazards.ts), so they run before HIKE and between screens too.
 */
import type { HazardKind } from '../sim/types';

export interface HazardDef {
  readonly name: string;
  /** Voxel model id. */
  readonly model: string;
  /** Beats per tile of travel. */
  readonly ticksPerTile: number;
  /**
   * How close (in tiles, along her row) a pass must cross to be hit. The
   * Witch snatches a ball crossing her row within this distance of her.
   */
  readonly reach: number;
}

export const HAZARDS: Readonly<Record<HazardKind, HazardDef>> = {
  witch: {
    name: 'Witch on a Broom',
    model: 'forestHazards/witch',
    ticksPerTile: 1,
    reach: 0.75,
  },
};
