/**
 * The ball in the air (GAMEPLAY.md, Catching). The arc rises the further you
 * throw, and comes down at catching height, so it can only be touched near
 * its two ends: at the line, and where it comes down. While it's low, the
 * first thing that can reach it decides it:
 *   - your player nearest to it (within its reach) catches it, unless a
 *     defender reaching it too has more Hands (ties go to you): then it's batted;
 *   - with only a defender reaching it, it's batted down;
 *   - a Witch it passes near knocks it down, however high it is;
 *   - landing with nobody there, it's incomplete.
 */
import { arcadeTuning } from '../content/tuning';
import type { Defender, Player, RunState, Vec, Witch } from './types';
import { dist, lerp, v } from './vec';

const t = arcadeTuning.throw;

export const flightDistance = dist;

/** How long a throw of this distance takes. */
export function flightTime(from: Vec, to: Vec): number {
  return Math.max(t.minFlight, dist(from, to) / t.speed);
}

/** The arc's peak above the straight line, for a throw this long. */
export function arcPeak(distance: number): number {
  return Math.min(t.maxArc, t.arcPerYard2 * distance * distance);
}

/** The ball's height `u` (0 to 1) of the way through a throw this long. */
export function ballHeight(distance: number, u: number): number {
  return t.releaseHeight * (1 - u) + t.catchHeight * u + 4 * arcPeak(distance) * u * (1 - u);
}

/** Where a Witch is at a moment: she sweeps across her row and wraps at the sidelines. */
export function witchX(w: Witch, time: number): number {
  const width = 2 * arcadeTuning.field.halfWidth;
  const raw = w.startX + w.dir * arcadeTuning.witch.speed * time + arcadeTuning.field.halfWidth;
  return (((raw % width) + width) % width) - arcadeTuning.field.halfWidth;
}

export type FlightOutcome =
  | { readonly kind: 'caught'; readonly by: Player; readonly contested: boolean }
  | { readonly kind: 'batted'; readonly by: number; readonly at: Vec; readonly contested: boolean }
  | { readonly kind: 'incomplete'; readonly at: Vec }
  | null;

/** What happens to the pass in the air this step, if anything. */
export function resolveFlight(state: RunState): FlightOutcome {
  const ball = state.field.ball;
  if (ball.at !== 'flight') return null;
  const u = Math.min(1, (state.time - ball.thrownAt) / (ball.landsAt - ball.thrownAt));
  const ground = lerp(ball.from, ball.target, u);

  for (const w of state.field.witches) {
    const at = v(witchX(w, state.time), w.y);
    if (dist(at, ground) < arcadeTuning.witch.radius) {
      return { kind: 'batted', by: w.id, at, contested: false };
    }
  }

  const low = ballHeight(dist(ball.from, ball.target), u) < t.reachHeight;
  if (low) {
    const catcher = state.field.players
      .filter((p) => p.role !== 'qb' && p.down <= 0 && dist(p.pos, ground) <= p.reach)
      .sort((a, b) => dist(a.pos, ground) - dist(b.pos, ground) || a.id - b.id)[0];
    const defender = state.field.defenders
      .filter((d) => d.down <= 0 && dist(d.pos, ground) <= d.reach)
      .sort(byHands(ground))[0];
    if (catcher && defender && defender.stats.hands > catcher.stats.hands) {
      return { kind: 'batted', by: defender.id, at: defender.pos, contested: true };
    }
    if (catcher) return { kind: 'caught', by: catcher, contested: defender !== undefined };
    if (defender) return { kind: 'batted', by: defender.id, at: defender.pos, contested: false };
  }
  if (u >= 1) return { kind: 'incomplete', at: ball.target };
  return null;
}

/** The best hands first; then the nearest. */
const byHands =
  (at: Vec) =>
  (a: Defender, b: Defender): number =>
    b.stats.hands - a.stats.hands || dist(a.pos, at) - dist(b.pos, at) || a.id - b.id;
