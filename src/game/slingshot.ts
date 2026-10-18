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
 * When a throw released at sim tick position `releasedAt` happens: the sim
 * takes it on the next tick (`tick`) and it lands `flight` ticks after that.
 * The ball is drawn leaving the hand at `releasedAt`, flying a little faster
 * or slower so it still lands on a tick.
 */
export function throwTiming(
  releasedAt: number,
  simTick: number,
  flight: number,
): { tick: number; releasedAt: number; landsOn: number } {
  const from = Math.max(releasedAt, simTick);
  const tick = Math.floor(from) + 1;
  return { tick, releasedAt: from, landsOn: tick + flight };
}
