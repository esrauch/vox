import { DEFENDERS } from '../../src/content/defenders';
import { updateIntents } from '../../src/sim/ai';
import { qbTile } from '../../src/sim/drive';
import { createRun } from '../../src/sim/run';
import { step } from '../../src/sim/step';
import type {
  CheckKind,
  Defender,
  DefenderKind,
  Form,
  PlayerUnit,
  RunState,
  SimEvent,
  Stats,
  Vec,
} from '../../src/sim/types';

export interface PlayerSpec {
  pos: Vec;
  /** One move per hop (U D L R .); default: straight up for a while. */
  route?: string;
  /** Default: a human, 0 / 0 / 0, no skills. */
  stats?: Partial<Stats>;
  form?: Form;
  rerolls?: CheckKind[];
  frenzy?: CheckKind[];
}

const ZERO: Stats = { hustle: 0, hands: 0, heft: 0 };

/**
 * A down already in play (tick 0, just snapped) with exactly the given
 * players and defenders: line of scrimmage on row 3, first-down line on row
 * 23 (rows are half-yards), the QB on (5, 0) with the ball, no hazards and no
 * pocket clock (set `state.pocket` to test one). Player ids start at 100
 * (roster slot 0 up) and defender ids at 200; defenders get their kind's
 * stats unless given others. Everyone hops every tick.
 */
export function playState(
  players: PlayerSpec[],
  defenders: { kind: DefenderKind; pos: Vec; marking?: number; stats?: Partial<Stats> }[] = [],
  seed = 1,
): RunState {
  const state = createRun(seed);
  const units: PlayerUnit[] = players.map((spec, i) => ({
    id: 100 + i,
    side: 'player',
    slot: i,
    form: spec.form ?? 'human',
    stats: { ...ZERO, ...spec.stats },
    pos: spec.pos,
    route: spec.route ?? 'UUUUUUUUUUUU',
    routeStep: 0,
    rerolls: spec.rerolls ?? [],
    frenzy: spec.frenzy ?? [],
    frenzyReady: [],
    downTicks: 0,
    intent: null,
  }));
  const defs: Defender[] = defenders.map((d, i) => ({
    id: 200 + i,
    side: 'defender',
    kind: d.kind,
    pos: d.pos,
    home: d.pos,
    stats: { ...DEFENDERS[d.kind].stats, ...d.stats },
    downTicks: 0,
    intent: null,
    patrol: null,
    patrolIndex: 0,
    marking: d.marking ?? null,
  }));
  state.drive = { ...state.drive, los: 3, start: 3, firstDown: 23, down: 1 };
  state.screen = {
    players: units,
    defenders: defs,
    hazards: [],
    ball: { at: 'qb' },
    qb: qbTile(3),
  };
  state.phase = 'play';
  state.tick = 0;
  state.downTick = 0;
  updateIntents(state.screen);
  return state;
}

/** Step `n` ticks with no throws, collecting events. */
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

/** Stats so far ahead that every check succeeds (an edge of +4 or more is certain). */
export const STAR: Stats = { hustle: 9, hands: 9, heft: 9 };
/** Stats so far behind that a check almost always fails (a 10% long shot). */
export const DUD: Stats = { hustle: -9, hands: -9, heft: -9 };

/**
 * The first seed (from 1) whose run of `make(seed)` gives what `want`
 * checks for: for testing a check's unlikely side, with the dice fixed.
 */
export function seedWhere<T>(make: (seed: number) => T, want: (result: T) => boolean): T {
  for (let seed = 1; seed < 500; seed++) {
    const result = make(seed);
    if (want(result)) return result;
  }
  throw new Error('no seed gives that');
}
