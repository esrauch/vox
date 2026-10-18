import { DEFENDERS } from '../../src/content/defenders';
import { WALK_ON } from '../../src/content/players';
import { updateIntents } from '../../src/sim/ai';
import { qbTile } from '../../src/sim/drive';
import { createRun } from '../../src/sim/run';
import { step } from '../../src/sim/step';
import type {
  Defender,
  DefenderKind,
  PlayerUnit,
  RunState,
  SimEvent,
  Vec,
} from '../../src/sim/types';

export interface PlayerSpec {
  pos: Vec;
  /** One move per hop (U D L R .); default: straight up for a while. */
  route?: string;
}

/**
 * A down already in play (beat 0, just snapped) with exactly the given
 * players and defenders: line of scrimmage on row 2, first-down line on row
 * 12, the QB on (4, 0) with the ball, no hazards. Player ids start at 100 and
 * defender ids at 200.
 */
export function playState(
  players: PlayerSpec[],
  defenders: { kind: DefenderKind; pos: Vec; marking?: number }[] = [],
): RunState {
  const state = createRun(1);
  const units: PlayerUnit[] = players.map((spec, i) => ({
    id: 100 + i,
    side: 'player',
    kindId: WALK_ON.id,
    stats: WALK_ON.stats,
    pos: spec.pos,
    route: spec.route ?? 'UUUUUUUUUUUU',
    routeStep: 0,
    fendOff: 0,
    downBeats: 0,
    intent: null,
  }));
  const defs: Defender[] = defenders.map((d, i) => ({
    id: 200 + i,
    side: 'defender',
    kind: d.kind,
    pos: d.pos,
    home: d.pos,
    stats: DEFENDERS[d.kind].stats,
    downBeats: 0,
    intent: null,
    patrol: null,
    patrolIndex: 0,
    marking: d.marking ?? null,
  }));
  state.drive = { ...state.drive, los: 2, start: 2, firstDown: 12, down: 1 };
  state.screen = {
    players: units,
    defenders: defs,
    hazards: [],
    ball: { at: 'qb' },
    qb: qbTile(2),
  };
  state.phase = 'play';
  state.beat = 0;
  state.downBeat = 0;
  updateIntents(state.screen);
  return state;
}

/** Step `n` beats with no throws, collecting events. */
export function run(state: RunState, n: number): { state: RunState; events: SimEvent[] } {
  const events: SimEvent[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = step(s);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

export const player = (state: RunState, id: number): PlayerUnit => {
  const p = state.screen.players.find((u) => u.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
};

export const defender = (state: RunState, id: number): Defender => {
  const d = state.screen.defenders.find((u) => u.id === id);
  if (!d) throw new Error(`no defender ${id}`);
  return d;
};

export const ofType = <T extends SimEvent['type']>(events: SimEvent[], type: T) =>
  events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

/** Give the ball to a player (as if it had just caught it). */
export function carry(state: RunState, id: number): RunState {
  state.screen.ball = { at: 'carried', by: id };
  updateIntents(state.screen);
  return state;
}
