import { createRun, dispatch } from './run';
import { step } from './step';
import type { Action, RunState, SimEvent, Vec } from './types';

/** One recorded input: a setup/screen action, or one beat (with an optional throw). */
export type Input =
  | { readonly kind: 'action'; readonly action: Action }
  | { readonly kind: 'beat'; readonly throwAt?: Vec };

/** Rebuild a run from its seed and inputs. The same inputs always give the same run. */
export function replay(
  seed: number,
  inputs: readonly Input[],
): { state: RunState; events: SimEvent[] } {
  let state = createRun(seed);
  const events: SimEvent[] = [];
  for (const input of inputs) {
    if (input.kind === 'action') {
      state = structuredClone(state);
      events.push(...dispatch(state, input.action));
    } else {
      const result = step(state, input.throwAt ?? null);
      state = result.state;
      events.push(...result.events);
    }
  }
  return { state, events };
}
