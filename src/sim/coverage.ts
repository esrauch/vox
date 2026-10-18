/**
 * Coverage rings (GAMEPLAY.md, Coverage): every covering defender has a
 * purple ring, and every one of your players is green, yellow or red.
 *
 * - **Red (covered):** inside a ring. A pass arriving now is blocked.
 * - **Yellow (tight):** within `tuning.coverage.nearBand` tiles outside a
 *   ring. A pass arriving now is caught, but it may not be by the time it lands.
 * - **Green (open):** clear.
 */
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { distance } from './grid';
import type { Defender, ScreenState, Vec } from './types';

export type Openness = 'open' | 'tight' | 'covered';

/** A defender's coverage ring radius right now: 0 while it's knocked down, or if it doesn't cover. */
export function coverageRadius(d: Defender): number {
  return d.downTicks > 0 ? 0 : DEFENDERS[d.kind].coverage;
}

/**
 * How open a tile is for a ball thrown right at it: covered if a defender is
 * close enough to bat a low ball there, or it's inside a Scarecrow's (or
 * Bat's) ring; tight if one is nearly that close.
 */
export function openness(screen: ScreenState, at: Vec): Openness {
  let worst: Openness = 'open';
  for (const d of screen.defenders) {
    if (d.downTicks > 0) continue;
    const reach = Math.max(coverageRadius(d), tuning.throw.blockRadius);
    const gap = distance(d.pos, at) - reach;
    if (gap <= 0) return 'covered';
    if (gap <= tuning.coverage.nearBand) worst = 'tight';
  }
  return worst;
}

/** The nearest defender whose ring covers a tile (the one a blocked pass bounces off), or null. */
export function coveringDefender(screen: ScreenState, at: Vec): Defender | null {
  let best: Defender | null = null;
  let bestDist = Infinity;
  for (const d of screen.defenders) {
    const r = coverageRadius(d);
    const dd = distance(d.pos, at);
    if (r > 0 && dd <= r && dd < bestDist) {
      best = d;
      bestDist = dd;
    }
  }
  return best;
}
