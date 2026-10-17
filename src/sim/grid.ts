import { tuning } from '../content/tuning';
import type { Vec } from './types';

export const COLS = tuning.grid.cols;
export const ROWS = tuning.grid.rows;
export const SETUP_ROWS = tuning.grid.setupRows;
/** The top row. A carrier reaching it scores. */
export const END_ROW = ROWS - 1;

/** The QB stands at the middle of the bottom row and never moves. */
export const QB_POS: Vec = { x: Math.floor(COLS / 2), y: 0 };

export const vec = (x: number, y: number): Vec => ({ x, y });
export const eq = (a: Vec | null | undefined, b: Vec | null | undefined): boolean =>
  !!a && !!b && a.x === b.x && a.y === b.y;
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const key = (v: Vec): string => `${v.x},${v.y}`;

export const UP: Vec = { x: 0, y: 1 };

export function inBounds(v: Vec): boolean {
  return v.x >= 0 && v.x < COLS && v.y >= 0 && v.y < ROWS;
}

export function inSetupZone(v: Vec): boolean {
  return inBounds(v) && v.y < SETUP_ROWS && !eq(v, QB_POS);
}

/** Manhattan distance: units hop in the four directions. */
export function dist(a: Vec, b: Vec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Whether a tile touches the QB (up, left or right). A Blitzer standing there attacks it. */
export function nextToQb(v: Vec): boolean {
  return dist(v, QB_POS) === 1;
}

/**
 * One hop from `from` toward `to`, in one of the four directions. Closes the
 * larger gap first; ties go vertical. Returns `from` if already there.
 */
export function stepToward(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return from;
  if (Math.abs(dy) >= Math.abs(dx)) return vec(from.x, from.y + Math.sign(dy));
  return vec(from.x + Math.sign(dx), from.y);
}
