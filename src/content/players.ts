import type { Stats } from '../sim/types';

export interface PlayerKind {
  readonly id: string;
  readonly name: string;
  readonly stats: Stats;
  /**
   * Whether a dead one is back for the next screen. Walk-ons always return;
   * recruits don't, and their slot reverts to a Walk-on.
   */
  readonly returns: boolean;
  /**
   * Whether running into a defender without the ball takes the defender down
   * too. Walk-ons trade themselves, which lets a stacked column clear a path.
   */
  readonly trades: boolean;
}

/** The vanilla player every run starts with (GAMEPLAY.md, Walk-ons). */
export const WALK_ON: PlayerKind = {
  id: 'walkOn',
  name: 'Walk-on',
  stats: { hustle: 0, hands: 0, heft: 0 },
  returns: true,
  trades: true,
};

/** Placeholder recruit for testing the slot rules until M2 adds real ones. */
export const TEST_RECRUIT: PlayerKind = {
  id: 'testRecruit',
  name: 'Test Recruit',
  stats: { hustle: 1, hands: 1, heft: 1 },
  returns: false,
  trades: false,
};

export const PLAYER_KINDS: Readonly<Record<string, PlayerKind>> = {
  [WALK_ON.id]: WALK_ON,
  [TEST_RECRUIT.id]: TEST_RECRUIT,
};

export function playerKind(id: string): PlayerKind {
  const kind = PLAYER_KINDS[id];
  if (!kind) throw new Error(`Unknown player kind "${id}"`);
  return kind;
}
