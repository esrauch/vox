/**
 * The fixed step: advance a run by one step of 1/60 s. Pure: the input
 * state is never modified, and the same state plus the same input always
 * gives the same result.
 *
 * Order within a step in play:
 *   1. A throw or a swipe from the player.
 *   2. Everyone moves toward their target (ai.ts, physics.ts).
 *   3. Overlaps are pushed apart by weight.
 *   4. Contact: a Blocker much heavier than a defender flattens it (a
 *      pancake); a defender reaching the carrier grabs on and the carrier
 *      drags it, slowed, until the weight on it brings it down (unless the
 *      carrier is much heavier and sheds it); a defender touching the QB
 *      while it holds the ball sacks it.
 *   5. The pass in the air (ball.ts).
 *   6. The carrier over the first-down line wins the drive; over the
 *      sideline, it's down there.
 * Before the snap and between drives only the Bats move.
 */
import { arcadeTuning, DT } from '../content/tuning';
import { carrierOf, qbOf } from './ai';
import { flightTime, resolveFlight } from './ball';
import { moveBodies, separate, touching } from './physics';
import { endDown, nextDown } from './run';
import type { ArcadeEvent, ArcadeResult, RunState, StepInput, ThrowProblem, Vec } from './types';
import { dist, norm, scale, sub } from './vec';

const { contact, field, throw: throwTuning } = arcadeTuning;

export function step(prev: RunState, input: StepInput = {}): ArcadeResult {
  const state = structuredClone(prev);
  const events: ArcadeEvent[] = [];
  state.step += 1;
  state.time = state.step * DT;

  if (state.phase === 'downOver') {
    moveBodies(state);
    state.pause -= DT;
    if (state.pause <= 0) nextDown(state, events);
    return { state, events };
  }
  if (state.phase !== 'play') {
    moveBodies(state);
    separate(state);
    return { state, events };
  }

  if (input.throwAt) tryThrow(state, input.throwAt, events);
  if (input.steer && carrierOf(state)) {
    const lane = state.field.lane + input.steer * arcadeTuning.carrier.steerStep;
    state.field.lane = Math.max(-field.halfWidth - 1, Math.min(field.halfWidth + 1, lane));
  }
  moveBodies(state);
  separate(state);
  if (resolveContact(state, events)) return { state, events };
  if (flight(state, events)) return { state, events };
  checkCarrier(state, events);
  return { state, events };
}

// ── Throwing ────────────────────────────────────────────────────────────────

/** Why a throw to `target` isn't allowed right now, or null if it is. */
export function throwProblem(state: RunState, target: Vec): ThrowProblem | null {
  if (state.phase !== 'play') return 'notInPlay';
  const qb = qbOf(state);
  if (state.field.ball.at !== 'qb' || !qb) return 'noBall';
  if (Math.abs(target.x) > field.halfWidth) return 'offField';
  const { los } = state.drive;
  if (target.y > los + throwTuning.maxAhead) return 'tooFar';
  if (target.y < los + throwTuning.minAhead || dist(qb.pos, target) < throwTuning.minDistance) {
    return 'tooClose';
  }
  return null;
}

function tryThrow(state: RunState, target: Vec, events: ArcadeEvent[]): void {
  const problem = throwProblem(state, target);
  const qb = qbOf(state);
  if (problem || !qb) {
    events.push({ type: 'throwRejected', reason: problem ?? 'noBall' });
    return;
  }
  const landsAt = state.time + flightTime(qb.pos, target);
  state.field.ball = { at: 'flight', from: qb.pos, target, thrownAt: state.time, landsAt };
  events.push({ type: 'thrown', target, landsAt });
}

// ── Contact ─────────────────────────────────────────────────────────────────

/** Pancakes, tackles and sacks. Returns whether the down ended. */
function resolveContact(state: RunState, events: ArcadeEvent[]): boolean {
  const { players, defenders, ball } = state.field;
  const upDefenders = defenders.filter((d) => d.down <= 0).sort((a, b) => a.id - b.id);
  const carrier = carrierOf(state);

  // A player blocking, much heavier than the defender it's on, flattens it.
  for (const p of players) {
    const blocking =
      p.job.kind === 'block' || (carrier !== null && p !== carrier && p.role !== 'qb');
    if (p.down > 0 || !blocking) continue;
    for (const d of upDefenders) {
      if (d.planted || d.down > 0 || !touching(p, d)) continue;
      if (p.mass < contact.pancakeRatio * d.mass) continue;
      d.down = contact.pancakeTime;
      d.vel = scale(norm(sub(d.pos, p.pos)), 4);
      events.push({ type: 'pancake', blocker: p.id, defender: d.id });
    }
  }

  if (carrier) {
    // A defender reaching the carrier grabs on, unless the carrier is much heavier and sheds it.
    for (const d of upDefenders) {
      if (d.down > 0 || d.latch || !touching(carrier, d)) continue;
      if (carrier.mass >= contact.breakRatio * d.mass) {
        d.down = contact.brokenTime;
        d.vel = scale(norm(sub(d.pos, carrier.pos)), 4);
        events.push({ type: 'brokeTackle', id: carrier.id, defender: d.id });
        continue;
      }
      d.latch = scale(norm(sub(d.pos, carrier.pos)), carrier.radius + d.radius);
      events.push({ type: 'wrapped', id: carrier.id, defender: d.id });
    }
    // The weight hanging on brings it down: faster the heavier it is.
    const hanging = defenders.filter((d) => d.latch !== null).sort((a, b) => a.id - b.id);
    const weight = hanging.reduce((m, d) => m + d.mass, 0);
    state.field.wrap += (DT * weight) / carrier.mass;
    const first = hanging[0];
    if (first && state.field.wrap >= contact.wrapTime) {
      events.push({ type: 'tackled', id: carrier.id, by: first.id });
      carrier.down = 1;
      for (const d of hanging) d.latch = null;
      state.field.ball = { at: 'dead', pos: carrier.pos, how: 'tackled' };
      endDown(state, 'tackled', carrier.pos.y, events);
      return true;
    }
  }

  const qb = qbOf(state);
  if (qb && ball.at === 'qb') {
    const rusher = upDefenders.find((d) => d.down <= 0 && touching(qb, d));
    if (rusher) {
      events.push({ type: 'sacked', by: rusher.id });
      qb.down = 1;
      state.field.ball = { at: 'dead', pos: qb.pos, how: 'sacked' };
      endDown(state, 'sacked', state.drive.los - arcadeTuning.drive.sackLoss, events);
      return true;
    }
  }
  return false;
}

// ── The pass, and the carrier ────────────────────────────────────────────────

function flight(state: RunState, events: ArcadeEvent[]): boolean {
  const outcome = resolveFlight(state);
  if (!outcome) return false;
  if (outcome.kind === 'caught') {
    const p = outcome.by;
    p.job = { kind: 'carry' };
    state.field.ball = { at: 'carried', by: p.id };
    state.field.lane = p.pos.x;
    state.field.wrap = 0;
    events.push({ type: 'caught', id: p.id, contested: outcome.contested });
    return checkCarrier(state, events);
  }
  if (outcome.kind === 'batted') {
    events.push({ type: 'batted', by: outcome.by, at: outcome.at, contested: outcome.contested });
    state.field.ball = { at: 'dead', pos: outcome.at, how: 'batted' };
    endDown(state, 'batted', state.drive.los, events);
    return true;
  }
  events.push({ type: 'incomplete', at: outcome.at });
  state.field.ball = { at: 'dead', pos: outcome.at, how: 'incomplete' };
  endDown(state, 'incomplete', state.drive.los, events);
  return true;
}

/** The carrier over the first-down line wins the drive; over the sideline, it's down there. */
function checkCarrier(state: RunState, events: ArcadeEvent[]): boolean {
  const carrier = carrierOf(state);
  if (!carrier) return false;
  if (carrier.pos.y >= state.drive.firstDown) {
    endDown(state, 'firstDown', carrier.pos.y, events);
    return true;
  }
  if (Math.abs(carrier.pos.x) > field.halfWidth) {
    events.push({ type: 'outOfBounds', id: carrier.id });
    state.field.ball = { at: 'dead', pos: carrier.pos, how: 'tackled' };
    endDown(state, 'outOfBounds', carrier.pos.y, events);
    return true;
  }
  return false;
}
