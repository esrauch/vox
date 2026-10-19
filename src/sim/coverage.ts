/**
 * Coverage (GAMEPLAY.md, Coverage and Catching): which defenders contest a
 * pass coming down at a point, and each of your players' ring, green, yellow
 * or red by its odds of winning a catch right now.
 *
 * A defender contests a ball that comes down right beside it (it can get a
 * hand to it) or inside its purple ring (Scarecrows and Bats).
 */
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { chance, checkEdge } from './checks';
import { distance } from './grid';
import type { Defender, PlayerUnit, RunState, ScreenState, Vec } from './types';

export type Openness = 'open' | 'tight' | 'covered';

/** A defender's coverage ring radius right now: 0 while it's knocked down, or if it doesn't cover. */
export function coverageRadius(d: Defender): number {
  return d.downTicks > 0 ? 0 : DEFENDERS[d.kind].coverage;
}

/** Every defender that's up and would contest a ball coming down at `at`, nearest first. */
export function contestants(screen: ScreenState, at: Vec): Defender[] {
  return screen.defenders
    .filter(
      (d) =>
        d.downTicks === 0 &&
        distance(d.pos, at) <= Math.max(coverageRadius(d), tuning.throw.blockRadius),
    )
    .sort((a, b) => distance(a.pos, at) - distance(b.pos, at) || a.id - b.id);
}

/**
 * A player's odds of catching a good throw arriving at its tile right now:
 * 1 uncontested, otherwise its Hands check against the best contesting
 * defender (with the safety net, and −1 per extra defender).
 */
export function catchChance(state: RunState, player: PlayerUnit): number {
  const contest = contestants(state.screen, player.pos);
  const best = [...contest].sort((a, b) => b.stats.hands - a.stats.hands || a.id - b.id)[0];
  if (!best) return 1;
  const modifier = -tuning.checks.perExtraDefender * (contest.length - 1);
  return chance(checkEdge(state, 'catch', player, best, modifier));
}

/** A player's ring: green for a likely catch, yellow for about a coin flip, red for a long shot. */
export function openness(state: RunState, player: PlayerUnit): Openness {
  const p = catchChance(state, player);
  const { bands } = tuning.checks;
  return p >= bands.open ? 'open' : p >= bands.tight ? 'tight' : 'covered';
}
