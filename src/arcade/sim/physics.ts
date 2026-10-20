/**
 * Moving and colliding (GAMEPLAY.md, Your Team: stats are physics). Every
 * body accelerates toward its target at its own top speed; overlapping
 * bodies are pushed apart in proportion to their weight, so the heavier one
 * moves the lighter one. Your players pass through each other; bodies lying
 * on the turf collide with nothing; Scarecrows can't be moved at all.
 */
import { arcadeTuning, DT } from '../content/tuning';
import { defenderTarget, playerTarget } from './ai';
import type { Body, RunState } from './types';
import { add, clampLen, dist, len, norm, scale, sub, v } from './vec';

const { body: bodyTuning, field } = arcadeTuning;

export function allBodies(state: RunState): Body[] {
  return [...state.field.players, ...state.field.defenders];
}

/** Everyone moves one step toward their target. */
export function moveBodies(state: RunState): void {
  const carrierId = state.field.ball.at === 'carried' ? state.field.ball.by : null;
  const carrier = state.field.players.find((p) => p.id === carrierId);
  const hanging = state.field.defenders.filter((d) => d.latch !== null);
  for (const b of allBodies(state)) {
    // Tacklers hanging on ride along with the carrier (below).
    if (b.side === 'defense' && b.latch) continue;
    if (b.down > 0) {
      b.down = Math.max(0, b.down - DT);
      const slow = Math.max(0, 1 - bodyTuning.friction * DT);
      b.vel = scale(b.vel, slow);
      b.pos = add(b.pos, scale(b.vel, DT));
      continue;
    }
    if (b.side === 'defense' && b.planted) {
      b.vel = v(0, 0);
      continue;
    }
    const target = b.side === 'team' ? playerTarget(state, b) : defenderTarget(state, b);
    let desired = v(0, 0);
    if (target) {
      const to = sub(target, b.pos);
      const speed =
        b.side === 'defense'
          ? b.speed * blockedShare(state, b, carrierId)
          : b.id === carrierId
            ? b.speed * (b.mass / (b.mass + hanging.reduce((m, d) => m + d.mass, 0)))
            : b.speed;
      // Arrive: ease off over the last stretch so nobody orbits its target.
      desired = scale(norm(to), speed * Math.min(1, len(to) / 0.6));
    }
    b.vel = add(b.vel, clampLen(sub(desired, b.vel), bodyTuning.accel * DT));
    b.pos = add(b.pos, scale(b.vel, DT));
    // Everyone but the carrier stays on the field (the carrier can run out of bounds).
    if (b.id !== carrierId) {
      b.pos = v(Math.max(-field.halfWidth, Math.min(field.halfWidth, b.pos.x)), b.pos.y);
    }
  }
  for (const d of hanging) {
    if (!carrier || !d.latch) continue;
    d.pos = add(carrier.pos, d.latch);
    d.vel = carrier.vel;
  }
}

/**
 * A defender being blocked: touched by one of your players who isn't the
 * carrier or the QB. It moves at a share of its speed, held by a Blocker at
 * least as heavy, slowed by a lighter one.
 */
function blockedShare(state: RunState, d: Body, carrierId: number | null): number {
  let share = 1;
  for (const p of state.field.players) {
    if (p.down > 0 || p.role === 'qb' || p.id === carrierId || !touching(p, d)) continue;
    const s = p.mass >= d.mass ? arcadeTuning.contact.held : arcadeTuning.contact.slowed;
    share = Math.min(share, s);
  }
  return share;
}

/** Whether two bodies collide with each other at all. */
function collides(a: Body, b: Body): boolean {
  if (a.down > 0 || b.down > 0) return false;
  if ((a.side === 'defense' && a.latch) || (b.side === 'defense' && b.latch)) return false;
  return !(a.side === 'team' && b.side === 'team');
}

const weight = (b: Body): number => (b.side === 'defense' && b.planted ? Infinity : b.mass);

/** Push every overlapping pair apart, the lighter one further. A few passes settle crowds. */
export function separate(state: RunState): void {
  const bodies = allBodies(state);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (!a || !b || !collides(a, b)) continue;
        const d = dist(a.pos, b.pos);
        const overlap = a.radius + b.radius - d;
        if (overlap <= 0) continue;
        const n = d === 0 ? v(a.id < b.id ? -1 : 1, 0) : norm(sub(b.pos, a.pos));
        const wa = weight(a);
        const wb = weight(b);
        // How much of the overlap each one gives: in proportion to the other's weight.
        const shareA = wa === Infinity ? 0 : wb === Infinity ? 1 : wb / (wa + wb);
        a.pos = sub(a.pos, scale(n, overlap * shareA));
        b.pos = add(b.pos, scale(n, overlap * (1 - shareA)));
      }
    }
  }
}

/** Whether two bodies are touching (for tackles, sacks and pancakes). */
export function touching(a: Body, b: Body): boolean {
  return dist(a.pos, b.pos) <= a.radius + b.radius + arcadeTuning.contact.slop;
}
