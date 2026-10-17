import { createRun, dispatch } from './run';
import { step } from './step';
import type { Action, BeatInput, RunState, SimEvent } from './types';

/** One recorded input: a setup/screen action, or one beat (with an optional throw). */
export type Input =
  { readonly kind: 'action'; readonly action: Action } | ({ readonly kind: 'beat' } & BeatInput);

/** Rebuild a run from its seed and inputs. The same inputs always give the same run. */
export function replay(
  seed: number,
  inputs: readonly Input[],
): { state: RunState; events: SimEvent[] } {
  let state = createRun(seed);
  const events: SimEvent[] = [];
  for (const input of inputs) {
    const result = input.kind === 'action' ? dispatch(state, input.action) : step(state, input);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}
