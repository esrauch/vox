import { DEFENDERS } from '../../src/arcade/content/defense';
import { ROLE_RADIUS, ROLE_STATS } from '../../src/arcade/content/team';
import { defenderPhysics, physicsOf } from '../../src/arcade/sim/bodies';
import { createRun } from '../../src/arcade/sim/run';
import { step } from '../../src/arcade/sim/step';
import type {
  ArcadeEvent,
  Defender,
  DefenderKind,
  Job,
  Player,
  Role,
  RunState,
  Stats,
  StepInput,
  Vec,
} from '../../src/arcade/sim/types';
import { v } from '../../src/arcade/sim/vec';

export interface PlayerSpec {
  role?: Role;
  pos: Vec;
  stats?: Partial<Stats>;
  job?: Job;
}

export interface DefenderSpec {
  kind: DefenderKind;
  pos: Vec;
  stats?: Partial<Stats>;
  mark?: number;
}

/**
 * A down already snapped, with exactly these bodies: the QB on (0, -4) with
 * the ball, then the given players (ids 2 up) and defenders (ids 100 up).
 * Line of scrimmage 0, first-down line 10, no Witches. Stats default to the
 * role's or kind's base.
 */
export function playState(players: PlayerSpec[], defenders: DefenderSpec[] = []): RunState {
  const state = createRun(1);
  const qbStats = ROLE_STATS.qb;
  const qb: Player = {
    id: 1,
    side: 'team',
    role: 'qb',
    slot: -1,
    form: 'human',
    pos: v(0, -4),
    vel: v(0, 0),
    radius: ROLE_RADIUS.qb,
    stats: qbStats,
    ...physicsOf(qbStats),
    down: 0,
    job: { kind: 'qb' },
  };
  const team = players.map((spec, i): Player => {
    const role = spec.role ?? 'catcher';
    const stats = { ...ROLE_STATS[role], ...spec.stats };
    return {
      id: 2 + i,
      side: 'team',
      role,
      slot: i,
      form: 'human',
      pos: spec.pos,
      vel: v(0, 0),
      radius: ROLE_RADIUS[role],
      stats,
      ...physicsOf(stats),
      down: 0,
      job: spec.job ?? { kind: 'route', to: [v(spec.pos.x, spec.pos.y + 30)], index: 0 },
    };
  });
  const defs = defenders.map((spec, i): Defender => {
    const def = DEFENDERS[spec.kind];
    const stats = { ...def.stats, ...spec.stats };
    return {
      id: 100 + i,
      side: 'defense',
      kind: spec.kind,
      planted: def.planted,
      pos: spec.pos,
      vel: v(0, 0),
      radius: def.radius,
      stats,
      ...defenderPhysics(stats, def.reachBonus),
      down: 0,
      home: spec.pos,
      mark: spec.mark ?? null,
      latch: null,
      patrol: null,
      patrolIndex: 0,
    };
  });
  state.drive = { ...state.drive, los: 0, start: 0, firstDown: 10, down: 1 };
  state.field = {
    players: [qb, ...team],
    defenders: defs,
    witches: [],
    ball: { at: 'qb' },
    lane: 0,
    wrap: 0,
  };
  state.phase = 'play';
  state.snappedAt = state.time;
  return state;
}

/** Step `seconds` of sim time (60 steps a second), feeding `input` on the first step only. */
export function run(
  state: RunState,
  seconds: number,
  input: StepInput = {},
): { state: RunState; events: ArcadeEvent[] } {
  const events: ArcadeEvent[] = [];
  let s = state;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    const r = step(s, i === 0 ? input : {});
    s = r.state;
    events.push(...r.events);
    if (s.phase !== 'play' && state.phase === 'play') break;
  }
  return { state: s, events };
}

export const body = (state: RunState, id: number) => {
  const b = [...state.field.players, ...state.field.defenders].find((u) => u.id === id);
  if (!b) throw new Error(`no body ${id}`);
  return b;
};

export const ofType = <T extends ArcadeEvent['type']>(events: ArcadeEvent[], type: T) =>
  events.filter((e): e is Extract<ArcadeEvent, { type: T }> => e.type === type);

/** Give the ball to a player, as if it had just caught it. */
export function carry(state: RunState, id: number): RunState {
  const p = state.field.players.find((u) => u.id === id);
  if (!p) throw new Error(`no player ${id}`);
  p.job = { kind: 'carry' };
  state.field.ball = { at: 'carried', by: id };
  state.field.lane = p.pos.x;
  state.field.wrap = 0;
  return state;
}

/** A job that holds its spot (a one-waypoint route to where it stands). */
export const stand = (at: Vec): Job => ({ kind: 'route', to: [at], index: 0 });
