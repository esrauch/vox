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
  return spawns.map((spawn, i) => ({
    id: firstId + i,
    side: 'defender',
    kind: spawn.kind,
    pos: spawn.pos,
    home: spawn.pos,
    stats: DEFENDER_STATS[spawn.kind],
    alive: true,
    downBeats: 0,
    hitsTaken: 0,
    intent: null,
    engagedSince: null,
  }));
}
