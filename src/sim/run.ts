/**
 * Creating a run, setting up screens, and the non-beat actions (place, hike,
 * next screen). Beats are advanced by step() in step.ts.
 */
import { playerKind, WALK_ON } from '../content/players';
import { tuning } from '../content/tuning';
import { updateIntents } from './ai';
import { eq, inSetupZone, vec } from './grid';
import { createDefenders, generateHazards, generateSpawns } from './screen';
import type { Action, RunState, SimEvent, SimResult, PlayerUnit, Steer, Vec } from './types';

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
    screen: { index: 0, players: [], defenders: [], hazards: [], ball: { at: 'qb' } },
    nextId: 1,
  };
  setUpScreen(state, 0);
  return state;
}

/** (Re)build a screen in the setup phase: every slot's player back, defenders at their spawns. */
export function setUpScreen(state: RunState, index: number): void {
  const players: PlayerUnit[] = state.slots.map((slot, i) => {
    const kind = playerKind(slot.kindId);
    const pos = formationTile(state, i);
    return {
      id: state.nextId++,
      side: 'player',
      slot: i,
      kindId: kind.id,
      stats: kind.stats,
      pos,
      fendOff: 0,
      steer: null,
      alive: true,
      downBeats: 0,
      hitsTaken: 0,
      intent: null,
    };
  });
  const defenders = createDefenders(generateSpawns(state.seed, index), state.nextId);
  state.nextId += defenders.length;
  const hazards = generateHazards(state.seed, index, state.nextId);
  state.nextId += hazards.length;
  state.screen = {
    index,
    players,
    defenders,
    hazards,
    ball: { at: 'qb' },
  };
  state.phase = 'setup';
}

function formationTile(state: RunState, slot: number): Vec {
  return state.formation[slot] ?? DEFAULT_FORMATION[slot] ?? vec(slot % 9, 2);
}

/**
 * Apply a setup or between-screen action. Pure, like step(): returns the new
 * state and what happened. Invalid actions change nothing.
 */
export function dispatch(prev: RunState, action: Action): SimResult {
  const state = structuredClone(prev);
  return { state, events: apply(state, action) };
}

function apply(state: RunState, action: Action): SimEvent[] {
  switch (action.type) {
    case 'place':
      return place(state, action.slot, action.tile);
    case 'hike':
      return hike(state);
    case 'steer':
      return steer(state, action.steer);
    case 'nextScreen':
      return nextScreen(state);
  }
}

function place(state: RunState, slot: number, tile: Vec): SimEvent[] {
  if (state.phase !== 'setup' || !inSetupZone(tile)) return [];
  const player = state.screen.players.find((s) => s.slot === slot);
  if (!player) return [];
  // Placing onto another player swaps the two.
  const other = state.screen.players.find((s) => s !== player && eq(s.pos, tile));
  if (other) {
    other.pos = player.pos;
    state.formation[other.slot] = other.pos;
  }
  player.pos = tile;
  state.formation[slot] = tile;
  return [];
}

function hike(state: RunState): SimEvent[] {
  if (state.phase !== 'setup') return [];
  state.phase = 'play';
  updateIntents(state.screen);
  return [{ type: 'hiked' }];
}

/**
 * Steer the ball carrier's next hop (null goes back to straight up). Only in
 * play, and only while one of your players is carrying the ball. Its hop arrow
 * updates at once, so you see the new route before it hops.
 */
function steer(state: RunState, steer: Steer | null): SimEvent[] {
  const { ball } = state.screen;
  if (state.phase !== 'play' || ball.at !== 'carried') return [];
  const carrier = state.screen.players.find((s) => s.id === ball.by);
  if (!carrier?.alive) return [];
  carrier.steer = steer;
  updateIntents(state.screen);
  return [];
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
