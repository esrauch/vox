import { smallKind, WALK_ON } from '../../src/content/smalls';
import { updateIntents } from '../../src/sim/ai';
import { createRun } from '../../src/sim/run';
import { createDefenders } from '../../src/sim/screen';
import { step } from '../../src/sim/step';
import type { DefenderKind, RunState, SimEvent, SmallUnit, Vec } from '../../src/sim/types';

export interface SmallSpec {
  pos: Vec;
  kindId?: string;
}

/**
 * A run already in play (beat 0, just hiked) with exactly the given Smalls
 * and defenders, so a test can set up one situation precisely.
 */
export function playState(
  smalls: SmallSpec[],
  defenders: { kind: DefenderKind; pos: Vec }[] = [],
): RunState {
  const state = createRun(1);
  state.slots = smalls.map((s) => ({ kindId: s.kindId ?? WALK_ON.id }));
  const units: SmallUnit[] = smalls.map((spec, i) => {
    const kind = smallKind(spec.kindId ?? WALK_ON.id);
    return {
      id: 100 + i,
      side: 'small',
      slot: i,
      kindId: kind.id,
      stats: kind.stats,
      pos: spec.pos,
      fendOff: 0,
      alive: true,
      downBeats: 0,
      hitsTaken: 0,
      intent: null,
    };
  });
  state.screen = {
    index: 0,
    smalls: units,
    defenders: createDefenders(defenders, 200),
    ball: { at: 'qb' },
  };
  state.phase = 'play';
  state.beat = 0;
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

export const small = (state: RunState, id: number): SmallUnit => {
  const s = state.screen.smalls.find((u) => u.id === id);
  if (!s) throw new Error(`no small ${id}`);
  return s;
};

export const ofType = <T extends SimEvent['type']>(events: SimEvent[], type: T) =>
  events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

/** Pin every defender in place (no patrol), for tests that need a stationary one. */
export function standStill(state: RunState): RunState {
  for (const d of state.screen.defenders) Object.assign(d, { patrol: null });
  updateIntents(state.screen);
  return state;
}
