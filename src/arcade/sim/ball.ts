/**
 * The sweep and the bullet (GAMEPLAY.md, A Down and Catching).
 *
 * On a pass play an aim line sweeps from the QB, sideline to sideline and
 * back; THROW fires a bullet along it, straight and fast. As it flies, the
 * first thing that can reach it decides it:
 *   - your player nearest to it (within its reach, not right by the QB, and
 *     not a Blocker: linemen aren't eligible) catches it, unless a defender reaching it too has more Hands (ties go
 *     to you): then it's batted;
 *   - with only a defender reaching it, it's batted down (a Rhino Beetle
 *     locked up with one of your players can't: the ball goes past the scrum);
 *   - at the end of its range with nobody there, it's incomplete.
 */
import { arcadeTuning } from '../content/tuning';
import type { Defender, Player, RunState, Vec } from './types';
import { dist, lerp, v } from './vec';

const { sweep, throw: t, field } = arcadeTuning;

/** How fast the line sweeps this drive (degrees a second): faster each area, and on the Boss. */
export function sweepSpeed(state: RunState): number {
  const { area, kind } = state.drive;
  const base =
    sweep.degreesPerSecond * (1 + sweep.perArea * area + (kind === 'boss' ? sweep.boss : 0));
  // Slow-Mo Sweep (a perk) slows it.
  return base * state.perks.sweepScale;
}

/** How long one pass of the line across the field takes. */
export function scanTime(state: RunState): number {
  return (2 * sweep.halfAngle) / sweepSpeed(state);
}

/** How long the pocket holds this drive: its sweeps. */
export function pocketTime(state: RunState): number {
  // Extra Sweep (a perk) holds it longer.
  return (sweep.scans + state.perks.extraScans) * scanTime(state);
}

/**
 * The aim line's angle right now (radians; 0 is straight upfield, positive
 * is toward the right sideline). It starts at the left sideline at the snap
 * and sweeps back and forth.
 */
export function sweepAngle(state: RunState): number {
  const h = (sweep.halfAngle * Math.PI) / 180;
  const p = ((state.time - state.snappedAt) / scanTime(state)) % 2;
  return p < 1 ? -h + 2 * h * p : h - 2 * h * (p - 1);
}

/** Where a bullet along `angle` from `from` would go: as far as its range, or the sideline. */
export function bulletEnd(state: RunState, from: Vec, angle: number): Vec {
  const dx = Math.sin(angle);
  const dy = Math.cos(angle);
  const ahead = (state.drive.los + t.maxAhead - from.y) / Math.max(1e-6, dy);
  const across = dx === 0 ? Infinity : (field.halfWidth - Math.sign(dx) * from.x) / Math.abs(dx);
  const length = Math.max(0, Math.min(ahead, across));
  return v(from.x + dx * length, from.y + dy * length);
}

/** How long a bullet takes to get from `from` to `to` (`scale` is Hot Arm's, a perk). */
export function flightTime(from: Vec, to: Vec, scale = 1): number {
  return Math.max(0.1, dist(from, to) / (t.speed * scale));
}

export type FlightOutcome =
  | { readonly kind: 'caught'; readonly by: Player; readonly contested: boolean }
  | { readonly kind: 'batted'; readonly by: number; readonly at: Vec; readonly contested: boolean }
  | { readonly kind: 'incomplete'; readonly at: Vec }
  | null;

/** What happens to the bullet this step, if anything. */
export function resolveFlight(state: RunState): FlightOutcome {
  const ball = state.field.ball;
  if (ball.at !== 'flight') return null;
  const u = Math.min(1, (state.time - ball.thrownAt) / (ball.landsAt - ball.thrownAt));
  return contact(state, ball.from, lerp(ball.from, ball.target, u), u >= 1, ball.target);
}

/**
 * Who gets a bullet at `at` (on its way from `from`), if anyone: shared by
 * the flight and by anything that wants to know what a throw would do.
 */
export function contact(
  state: RunState,
  from: Vec,
  at: Vec,
  last: boolean,
  end: Vec,
): FlightOutcome {
  const catcher = state.field.players
    .filter(
      (p) =>
        // Linemen aren't eligible: the ball goes past the Blockers (and the QB).
        p.role !== 'qb' &&
        p.role !== 'blocker' &&
        p.down <= 0 &&
        dist(p.pos, from) >= t.minDistance &&
        dist(p.pos, at) <= p.reach,
    )
    .sort((a, b) => dist(a.pos, at) - dist(b.pos, at) || a.id - b.id)[0];
  const defender = state.field.defenders
    .filter((d) => d.down <= 0 && !engaged(state, d) && dist(d.pos, at) <= d.reach)
    .sort(byHands(at))[0];
  if (catcher && defender && defender.stats.hands > catcher.stats.hands) {
    return { kind: 'batted', by: defender.id, at: defender.pos, contested: true };
  }
  if (catcher) return { kind: 'caught', by: catcher, contested: defender !== undefined };
  if (defender) return { kind: 'batted', by: defender.id, at: defender.pos, contested: false };
  if (last) {
    // Candy Corn Magnet (a perk): a ball about to fall incomplete gets twice the reach.
    const magnet = state.perks.magnet
      ? state.field.players
          .filter(
            (p) =>
              p.role !== 'qb' &&
              p.role !== 'blocker' &&
              p.down <= 0 &&
              dist(p.pos, from) >= t.minDistance &&
              dist(p.pos, at) <= 2 * p.reach,
          )
          .sort((a, b) => dist(a.pos, at) - dist(b.pos, at) || a.id - b.id)[0]
      : undefined;
    if (magnet) return { kind: 'caught', by: magnet, contested: false };
    return { kind: 'incomplete', at: end };
  }
  return null;
}

/** How finely aimContact looks along the line (yards). */
const AIM_STEP = 0.25;

/**
 * What a bullet thrown along the line right now would meet first, with
 * everyone frozen where they stand (no looking ahead in time): the aim line
 * stops there, and a receiver who'd catch it lights up. `at` is where along
 * the line it happens (the line's end for an incomplete).
 */
export function aimContact(
  state: RunState,
  from: Vec,
  end: Vec,
): { readonly outcome: NonNullable<FlightOutcome>; readonly at: Vec } {
  const length = dist(from, end);
  const steps = Math.max(1, Math.ceil(length / AIM_STEP));
  for (let i = 1; i <= steps; i++) {
    const at = lerp(from, end, i / steps);
    const outcome = contact(state, from, at, i === steps, end);
    if (outcome) return { outcome, at };
  }
  return { outcome: { kind: 'incomplete', at: end }, at: end };
}

/** A rusher locked up with one of your players: it can't get a hand to the ball, which goes past it. */
export function engaged(state: RunState, d: Defender): boolean {
  return (
    d.kind === 'rusher' &&
    state.field.players.some(
      (p) => p.role !== 'qb' && p.down <= 0 && dist(p.pos, d.pos) <= p.radius + d.radius + 0.15,
    )
  );
}

/** The best hands first; then the nearest. */
const byHands =
  (at: Vec) =>
  (a: Defender, b: Defender): number =>
    b.stats.hands - a.stats.hands || dist(a.pos, at) - dist(b.pos, at) || a.id - b.id;
