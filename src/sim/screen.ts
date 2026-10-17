/**
 * Screen generation. A placeholder for M1.2: a seeded scatter of defenders
 * that ramps with the screen index. Strip-based generation with hazards and a
 * solvability check replaces it in M2/M3 (TECHNICAL.md §10).
 */
import { DEFENDER_STATS } from '../content/defenders';
import { COLS, END_ROW, SETUP_ROWS, eq, vec } from './grid';
import { createRng, deriveSeed } from './rng';
import type { Defender, DefenderKind, Vec } from './types';

export interface DefenderSpawn {
  readonly kind: DefenderKind;
  readonly pos: Vec;
}

/** Which defenders a screen has and where they start. Deterministic per (seed, index). */
export function generateSpawns(seed: number, index: number): DefenderSpawn[] {
  const rng = createRng(deriveSeed(seed, 'screen', index));
  const spawns: DefenderSpawn[] = [];
  const taken: Vec[] = [];

  const place = (kind: DefenderKind, minRow: number, maxRow: number): void => {
    for (let tries = 0; tries < 50; tries++) {
      const pos = vec(rng.int(0, COLS - 1), rng.int(minRow, maxRow));
      if (taken.some((t) => eq(t, pos))) continue;
      taken.push(pos);
      spawns.push({ kind, pos });
      return;
    }
  };

  const low = SETUP_ROWS + 2;
  place('blitzer', low, low + 3);
  place('waller', low + 3, low + 6);
  place('picker', END_ROW - 5, END_ROW - 3);
  place('chaser', END_ROW - 3, END_ROW - 1);
  // Ramp: one extra defender every two screens, cycling through the kinds.
  const extras: DefenderKind[] = ['chaser', 'blitzer', 'waller', 'picker'];
  for (let i = 0; i < Math.floor(index / 2); i++) {
    place(extras[i % extras.length] as DefenderKind, low, END_ROW - 1);
  }
  return spawns;
}

export function createDefenders(spawns: readonly DefenderSpawn[], firstId: number): Defender[] {
  return spawns.map((spawn, i) => {
    const patrol = spawn.kind === 'picker' ? boxCircuit(spawn.pos) : null;
    const start = patrol?.[0] ?? spawn.pos;
    return {
      id: firstId + i,
      side: 'defender',
      kind: spawn.kind,
      pos: start,
      home: start,
      stats: DEFENDER_STATS[spawn.kind],
      alive: true,
      downBeats: 0,
      hitsTaken: 0,
      intent: null,
      patrol,
      patrolIndex: 0,
    };
  });
}

/** The size of a Picker's square patrol. */
const BOX = 4;

/**
 * A 4×4 box of tiles, walked clockwise around its edge (12 tiles), with its
 * bottom-left corner near `near` but kept on the field and out of the setup
 * zone and end zone.
 */
export function boxCircuit(near: Vec): Vec[] {
  const x0 = Math.max(0, Math.min(COLS - BOX, near.x));
  const y0 = Math.max(SETUP_ROWS, Math.min(END_ROW - BOX, near.y));
  const out: Vec[] = [];
  for (let y = y0; y < y0 + BOX - 1; y++) out.push(vec(x0, y)); // up the left side
  for (let x = x0; x < x0 + BOX - 1; x++) out.push(vec(x, y0 + BOX - 1)); // along the top
  for (let y = y0 + BOX - 1; y > y0; y--) out.push(vec(x0 + BOX - 1, y)); // down the right side
  for (let x = x0 + BOX - 1; x > x0; x--) out.push(vec(x, y0)); // back along the bottom
  return out;
}
