/**
 * Where everyone is heading this step (GAMEPLAY.md, A Down and The Defense).
 * Each body gets a target point (or null to stand); physics.ts moves it
 * there at its own speed. Nobody but Bats moves before the snap.
 *
 * - **Blockers** (and anyone on a block assignment) get between a rusher and
 *   the QB; after a catch or handoff, between the nearest defender and the carrier.
 * - **Route runners** run their waypoints; whoever is nearest to where a pass
 *   will land goes for the ball.
 * - **The carrier** charges upfield in its lane (moved by your swipes).
 * - **Rushers** charge the QB. **Covers** trail their mark. **Scarecrows** are
 *   planted. **The Owl** hangs deep, level with your deepest player, and
 *   comes down to meet the carrier. **Bats** loop their square. After the
 *   catch, everyone who moves chases the carrier.
 */
import { arcadeTuning } from '../content/tuning';
import type { Defender, Player, RunState, Vec } from './types';
import { add, dist, norm, scale, sub, v } from './vec';

const { defense, carrier: carrierTuning } = arcadeTuning;

export function carrierOf(state: RunState): Player | null {
  const ball = state.field.ball;
  if (ball.at !== 'carried') return null;
  return state.field.players.find((p) => p.id === ball.by) ?? null;
}

export function qbOf(state: RunState): Player | null {
  return state.field.players.find((p) => p.role === 'qb') ?? null;
}

/** Where a pass in the air will come down, if one is. */
function landing(state: RunState): Vec | null {
  const ball = state.field.ball;
  return ball.at === 'flight' ? ball.target : null;
}

const up = (b: { down: number }): boolean => b.down <= 0;

export function playerTarget(state: RunState, p: Player): Vec | null {
  if (state.phase !== 'play') return null;
  const carrier = carrierOf(state);
  switch (p.job.kind) {
    case 'qb':
      return null;
    case 'carry':
      return v(state.field.lane, p.pos.y + carrierTuning.lookAhead);
    case 'block':
      return blockTarget(state, p, carrier);
    case 'route': {
      // Go for the ball if it's coming down nearest to us.
      const land = landing(state);
      if (land) {
        const nearest = state.field.players
          .filter((q) => q.role !== 'qb' && up(q))
          .sort((a, b) => dist(a.pos, land) - dist(b.pos, land) || a.id - b.id)[0];
        if (nearest?.id === p.id) return land;
      }
      if (carrier) return blockTarget(state, p, carrier);
      const job = p.job;
      const to = job.to[job.index];
      if (!to) return null;
      if (dist(p.pos, to) < 0.5 && job.index < job.to.length - 1) job.index++;
      return job.to[job.index] ?? null;
    }
  }
}

/** Get between a defender and the one you protect: the QB before the catch, the carrier after. */
function blockTarget(state: RunState, p: Player, carrier: Player | null): Vec | null {
  const defenders = state.field.defenders.filter((d) => up(d) && !d.planted);
  if (carrier) {
    if (carrier.id === p.id) return null;
    const threat = defenders.sort(
      (a, b) => dist(a.pos, carrier.pos) - dist(b.pos, carrier.pos) || a.id - b.id,
    )[0];
    return threat ? between(threat, carrier.pos, p) : null;
  }
  const qb = qbOf(state);
  if (!qb) return null;
  const rushers = defenders
    .filter((d) => d.kind === 'rusher')
    .sort((a, b) => a.pos.x - b.pos.x || a.id - b.id);
  const blockers = state.field.players
    .filter((q) => q.job.kind === 'block')
    .sort((a, b) => a.pos.x - b.pos.x || a.id - b.id);
  const rusher = rushers[blockers.indexOf(p) % Math.max(1, rushers.length)];
  // Nobody to block: hold a spot just in front of the QB.
  if (!rusher) return add(qb.pos, v(p.pos.x > qb.pos.x ? 1.2 : -1.2, 2.5));
  return between(rusher, qb.pos, p);
}

/** The point touching `d` on the side facing `guard`: stepping there shoves `d` away from it. */
function between(d: Defender, guard: Vec, p: Player): Vec {
  return add(d.pos, scale(norm(sub(guard, d.pos)), d.radius + p.radius * 0.5));
}

export function defenderTarget(state: RunState, d: Defender): Vec | null {
  if (d.planted) return null;
  if (d.kind === 'bat') {
    const corner = d.patrol?.[d.patrolIndex];
    if (!corner || !d.patrol) return null;
    if (dist(d.pos, corner) < 0.3) d.patrolIndex = (d.patrolIndex + 1) % d.patrol.length;
    return d.patrol[d.patrolIndex] ?? null;
  }
  if (state.phase !== 'play') return null;
  const carrier = carrierOf(state);
  if (carrier) return add(carrier.pos, scale(carrier.vel, defense.chaseLead));
  const qb = qbOf(state);
  const land = landing(state);
  switch (d.kind) {
    case 'rusher':
      return qb ? qb.pos : null;
    case 'cover': {
      if (land && dist(d.pos, land) < 8) return land;
      const mark = state.field.players.find((p) => p.id === d.mark);
      if (!mark) return null;
      // Trail the mark: aim a little behind where it's going.
      const heading = norm(mark.vel);
      const behind = heading.x === 0 && heading.y === 0 ? v(0, -1) : scale(heading, -1);
      return add(mark.pos, scale(behind, defense.coverTrail));
    }
    case 'safety': {
      if (land) return land;
      const deepest = state.field.players
        .filter((p) => p.role !== 'qb')
        .sort((a, b) => b.pos.y - a.pos.y || a.id - b.id)[0];
      return v(deepest ? deepest.pos.x : d.home.x, d.home.y);
    }
    default:
      return null;
  }
}

/** At the snap: each Cover marks the nearest route runner nobody's marking yet (Covers choose in id order). */
export function assignMarks(state: RunState): void {
  const taken = new Set<number>();
  const runners = state.field.players.filter((p) => p.job.kind === 'route');
  for (const d of [...state.field.defenders].sort((a, b) => a.id - b.id)) {
    if (d.kind !== 'cover') continue;
    const mark = runners
      .filter((p) => !taken.has(p.id))
      .sort((a, b) => dist(a.pos, d.pos) - dist(b.pos, d.pos) || a.id - b.id)[0];
    d.mark = mark?.id ?? null;
    if (mark) taken.add(mark.id);
  }
}
