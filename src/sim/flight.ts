/**
 * The ball in the air (GAMEPLAY.md, Throwing): one sliding arc, no modes.
 * The farther the throw, the higher it flies (the peak grows with the
 * distance squared) and the longer it takes. A defender can only get a hand
 * on it where it's low: a short pass stays low the whole way, so anyone near
 * its path can bat it down; a long one is out of reach almost from the
 * release, and only comes back within reach as it drops toward the landing.
 */
import { tuning } from '../content/tuning';
import type { Vec } from './types';

const T = tuning.throw;

export function flightDistance(from: Vec, to: Vec): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Ticks a pass is in the air. */
export function flightTicks(from: Vec, to: Vec): number {
  return Math.max(1, Math.round(flightDistance(from, to) / T.tilesPerTick));
}

/** The arc's peak above the straight line, in tiles. */
export function arcPeak(distance: number): number {
  return Math.min(T.maxArc, T.arcPerTile2 * distance * distance);
}

/** The ball's height `t` (0..1) of the way along a pass of this length: from the release down to the turf. */
export function ballHeight(distance: number, t: number): number {
  return T.releaseHeight * (1 - t) + 4 * arcPeak(distance) * t * (1 - t);
}

/** Where along the ground the ball is, `t` of the way. */
export function ballGround(from: Vec, to: Vec, t: number): Vec {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** Whether the pass is low enough to touch `t` of the way along it: to catch, or to bat down. */
export function catchable(from: Vec, to: Vec, t: number): boolean {
  return ballHeight(flightDistance(from, to), t) < T.reach;
}
