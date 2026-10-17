/**
 * What the Three H's mean in play. Only the 0 values are decided (MILESTONES
 * M0); the 1+ meanings here are placeholders to tune in M2.
 */
import { add, eq, UP } from './grid';
import type { Stats, Vec } from './types';

/** Hustle → beats between hops. Hustle 0 hops every 2 beats. *(1+ is TBD: every beat for now.)* */
export function hopInterval(stats: Stats): number {
  return stats.hustle <= 0 ? 2 : 1;
}

/** Whether a unit with these stats hops (or attacks) on `beat`. */
export function actsOn(stats: Stats, beat: number): boolean {
  return beat % hopInterval(stats) === 0;
}

/**
 * Hands → the tiles a Small can catch from, relative to where it stands and
 * which way it faces. Hands 0: its own tile, or one tile ahead (a lunge).
 * *(1+ is TBD: adds diagonal-ahead lunges for now.)*
 */
export function catchTiles(pos: Vec, facing: Vec, stats: Stats): Vec[] {
  const tiles = [pos, add(pos, facing)];
  if (stats.hands >= 1) {
    const side: Vec = facing.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
    tiles.push(add(add(pos, facing), side), add(add(pos, facing), { x: -side.x, y: -side.y }));
  }
  return tiles;
}

/** Hits a unit survives before the next one kills it. Heft 0 dies on the first hit. *(1+ TBD.)* */
export function hitsSurvived(stats: Stats): number {
  return Math.max(0, stats.heft);
}

/** The direction a unit faces: toward its intent, or up if it has none. */
export function facingOf(pos: Vec, intent: Vec | null): Vec {
  if (!intent || eq(intent, pos)) return UP;
  return { x: Math.sign(intent.x - pos.x), y: Math.sign(intent.y - pos.y) };
}
