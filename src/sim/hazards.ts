/**
 * Hazards (GAMEPLAY.md, What's in the Way): pure tick patterns that don't
 * react to anything. Their position is a function of the global tick alone.
 *
 * The Witch on a Broom flies across her row, one tile per ticksPerTile ticks,
 * and wraps around: leaving one side, she's back at the other. She's in the
 * air, so runners pass under her; only a pass crossing her row near her is
 * hit: it bounces off her (blocked).
 */
import { HAZARDS } from '../content/hazards';
import { COLS } from './grid';
import type { BallState, Hazard } from './types';

/**
 * How far the Witch has flown by `tick`, in tiles along her row, before
 * wrapping: continuous, so the renderer can draw her between tiles too.
 */
export function witchTravel(h: Hazard, tick: number): number {
  return h.startX + (h.dir * tick) / HAZARDS[h.kind].ticksPerTile;
}

/** Her column on `tick`, wrapped onto the field (0..COLS-1). */
export function witchColumn(h: Hazard, tick: number): number {
  const x = h.startX + h.dir * Math.floor(tick / HAZARDS[h.kind].ticksPerTile);
  return ((x % COLS) + COLS) % COLS;
}

/**
 * Where and when a pass in the air crosses row `row`: the tick it's over the
 * row (the first tick at or after the crossing) and its column there. Null
 * if the pass never crosses the row. Passes fly straight from the QB to the
 * target, evenly over their flight ticks.
 */
export function passCrossing(ball: BallState, row: number): { tick: number; x: number } | null {
  if (ball.at !== 'flight') return null;
  const { from, target } = ball;
  const rise = target.y - from.y;
  const t = (row - from.y) / rise;
  if (rise <= 0 || t <= 0 || t > 1) return null;
  return {
    tick: ball.releasedOn + Math.ceil(t * (ball.landsOn - ball.releasedOn)),
    x: from.x + (target.x - from.x) * t,
  };
}

/** Whether a hazard hits the pass in the air on `tick`. */
export function snatches(h: Hazard, ball: BallState, tick: number): boolean {
  const crossing = passCrossing(ball, h.row);
  if (!crossing || crossing.tick !== tick) return false;
  return Math.abs(witchColumn(h, tick) - crossing.x) <= HAZARDS[h.kind].reach;
}
