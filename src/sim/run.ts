/**
 * Creating a run, setting up screens, and the non-beat actions (place, hike,
 * next screen). Beats are advanced by step() in step.ts.
 */
import { smallKind, WALK_ON } from '../content/smalls';
import { tuning } from '../content/tuning';
import { updateIntents } from './ai';
import { eq, inSetupZone, vec } from './grid';
import { createDefenders, generateSpawns } from './screen';
import type { Action, RunState, SimEvent, SmallUnit, Vec } from './types';

/** Where each slot starts if the player hasn't placed it. */
export const DEFAULT_FORMATION: readonly Vec[] = [
  vec(1, 2),
  vec(3, 2),
  vec(5, 2),
  vec(7, 2),
  vec(4, 1),
  vec(0, 1),
  vec(8, 1),
  vec(2, 1),
  vec(6, 1),
];

export function createRun(seed: number): RunState {
  const state: RunState = {
    seed,
    beat: 0,
    phase: 'setup',
    balls: tuning.run.startingBalls,
    screensCleared: 0,
    slots: Array.from({ length: tuning.run.startingSlots }, () => ({ kindId: WALK_ON.id })),
    formation: [],
    screen: { index: 0, smalls: [], defenders: [], ball: { at: 'qb' }, idleBeat: 0 },
    nextId: 1,
  };
  setUpScreen(state, 0);
  return state;
}

/** (Re)build a screen in the setup phase: every slot's Small back, defenders at their spawns. */
export function setUpScreen(state: RunState, index: number): void {
  const smalls: SmallUnit[] = state.slots.map((slot, i) => {
    const kind = smallKind(slot.kindId);
    const pos = formationTile(state, i);
    return {
      id: state.nextId++,
      side: 'small',
      slot: i,
      kindId: kind.id,
      stats: kind.stats,
      pos,
      fendOff: 0,
      alive: true,
      downBeats: 0,
      hitsTaken: 0,
      intent: null,
    };
  });
  const defenders = createDefenders(generateSpawns(state.seed, index), state.nextId);
  state.nextId += defenders.length;
  state.screen = {
    index,
    smalls,
    defenders,
    ball: { at: 'qb' },
    idleBeat: 0,
  };
  state.phase = 'setup';
  state.beat = 0;
}

function formationTile(state: RunState, slot: number): Vec {
  return state.formation[slot] ?? DEFAULT_FORMATION[slot] ?? vec(slot % 9, 2);
}

/** Apply a setup or between-screen action. Invalid actions are ignored. */
export function dispatch(state: RunState, action: Action): SimEvent[] {
  switch (action.type) {
    case 'place':
      return place(state, action.slot, action.tile);
    case 'hike':
      return hike(state);
    case 'nextScreen':
      return nextScreen(state);
  }
}

function place(state: RunState, slot: number, tile: Vec): SimEvent[] {
  if (state.phase !== 'setup' || !inSetupZone(tile)) return [];
  const small = state.screen.smalls.find((s) => s.slot === slot);
  if (!small) return [];
  // Placing onto another Small swaps the two.
  const other = state.screen.smalls.find((s) => s !== small && eq(s.pos, tile));
  if (other) {
    other.pos = small.pos;
    state.formation[other.slot] = other.pos;
  }
  small.pos = tile;
  state.formation[slot] = tile;
  return [];
}

function hike(state: RunState): SimEvent[] {
  if (state.phase !== 'setup') return [];
  state.phase = 'play';
  state.beat = 0;
  updateIntents(state.screen);
  return [{ type: 'hiked' }];
}

function nextScreen(state: RunState): SimEvent[] {
  if (state.phase !== 'cleared') return [];
  const index = state.screen.index + 1;
  setUpScreen(state, index);
  return [{ type: 'screenStarted', index }];
}

export function yards(state: RunState): number {
  return state.screensCleared * tuning.run.yardsPerScreen;
}
