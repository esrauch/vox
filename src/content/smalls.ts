import type { Stats } from '../sim/types';

export interface SmallKind {
  readonly id: string;
  readonly name: string;
  readonly stats: Stats;
  /**
   * Whether a dead one is back for the next screen. Walk-ons always return;
   * recruits don't, and their slot reverts to a Walk-on.
   */
  readonly returns: boolean;
}

/** The vanilla Small every run starts with (GAMEPLAY.md, Walk-ons). */
export const WALK_ON: SmallKind = {
  id: 'walkOn',
  name: 'Walk-on',
  stats: { hustle: 0, hands: 0, heft: 0 },
  returns: true,
};

/** Placeholder recruit for testing the slot rules until M2 adds real ones. */
export const TEST_RECRUIT: SmallKind = {
  id: 'testRecruit',
  name: 'Test Recruit',
  stats: { hustle: 1, hands: 1, heft: 1 },
  returns: false,
};

export const SMALL_KINDS: Readonly<Record<string, SmallKind>> = {
  [WALK_ON.id]: WALK_ON,
  [TEST_RECRUIT.id]: TEST_RECRUIT,
};

export function smallKind(id: string): SmallKind {
  const kind = SMALL_KINDS[id];
  if (!kind) throw new Error(`Unknown Small kind "${id}"`);
  return kind;
}
