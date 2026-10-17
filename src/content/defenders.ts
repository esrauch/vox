import type { DefenderKind, Stats } from '../sim/types';

/** Defender stats per kind. All 0 for now; tuned in M2 (MILESTONES: "what 1+ means"). */
export const DEFENDER_STATS: Readonly<Record<DefenderKind, Stats>> = {
  chaser: { hustle: 0, hands: 0, heft: 0 },
  blitzer: { hustle: 0, hands: 0, heft: 0 },
  waller: { hustle: 0, hands: 0, heft: 0 },
  picker: { hustle: 0, hands: 0, heft: 0 },
};
