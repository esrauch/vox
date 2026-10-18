import { tuning } from '../content/tuning';
import type { Vec } from './types';

export const COLS = tuning.grid.cols;
export const ROWS = tuning.grid.rows;
/** The top row. */
export const END_ROW = ROWS - 1;
/** The middle column: plays are drawn around it, and the QB stands in it. */
export const MID_COL = Math.floor(COLS / 2);

export const vec = (x: number, y: number): Vec => ({ x, y });
export const eq = (a: Vec | null | undefined, b: Vec | null | undefined): boolean =>
  !!a && !!b && a.x === b.x && a.y === b.y;
export const key = (v: Vec): string => `${v.x},${v.y}`;

export function inBounds(v: Vec): boolean {
  return v.x >= 0 && v.x < COLS && v.y >= 0 && v.y < ROWS;
}

/** Manhattan distance: units hop in the four directions. */
export function dist(a: Vec, b: Vec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Straight-line distance between tile centres (or free points). */
export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Whether a tile touches another (up, down, left or right). */
export function touches(a: Vec, b: Vec): boolean {
  return dist(a, b) === 1;
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
