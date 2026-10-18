import type { Stats } from '../sim/types';

export interface PlayerKind {
  readonly id: string;
  readonly name: string;
  readonly stats: Stats;
}

/** The plain player on every play (GAMEPLAY.md, Words used here). Special players arrive with cards (M4). */
export const WALK_ON: PlayerKind = {
  id: 'walkOn',
  name: 'Walk-on',
  stats: { hustle: 0, hands: 0, heft: 0 },
};

export const PLAYER_KINDS: Readonly<Record<string, PlayerKind>> = {
  [WALK_ON.id]: WALK_ON,
};

export function playerKind(id: string): PlayerKind {
  const kind = PLAYER_KINDS[id];
  if (!kind) throw new Error(`Unknown player kind "${id}"`);
  return kind;
}
