/**
 * Slingshot aiming and throw timing, as plain maths (GAMEPLAY.md, Pull Back
 * and Release).
 */
import { tuning } from '../content/tuning';
import { COLS } from '../sim/grid';
import type { Vec } from '../sim/types';

/**
 * Where a pull aims, from the QB's tile, given where the drag started and
 * where the finger is now (screen px): pulling down aims up the field, pulling
 * left aims right. The target is a free point (not grid-locked) in tile units.
 */
export function aimTarget(
  qb: Vec,
  start: { x: number; y: number },
  now: { x: number; y: number },
): Vec {
  const k = tuning.aim.tilesPerPixel;
  return {
    x: Math.max(-0.5, Math.min(COLS - 0.5, qb.x - (now.x - start.x) * k)),
    y: Math.max(0, qb.y + (now.y - start.y) * k),
  };
}

/**
 * When a throw released at sim beat position `releasedAt` happens: the sim
 * takes it on the next beat (`beat`) and it lands flightBeats after that. The
 * ball is drawn leaving the hand at `releasedAt`, flying a little faster or
 * slower so it still lands on the beat.
 */
export function throwTiming(
  releasedAt: number,
  simBeat: number,
): { beat: number; releasedAt: number; landsOn: number } {
  const from = Math.max(releasedAt, simBeat);
  const beat = Math.floor(from) + 1;
  return { beat, releasedAt: from, landsOn: beat + tuning.throw.flightBeats };
}
