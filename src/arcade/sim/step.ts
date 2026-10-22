/**
 * The fixed step: advance a run by one step of 1/60 s. Pure: the input
 * state is never modified, and the same state plus the same input always
 * gives the same result. See GAMEPLAY.md, A Down and Break it!.
 *
 * Order within a step in play:
 *   1. THROW fires a bullet along the sweeping line.
 *   2. The carrier picks its lane (the emptiest), every so often.
 *   3. Everyone moves toward their target (ai.ts, physics.ts); overlaps are
 *      pushed apart by weight.
 *   4. Contact: a player blocking, much heavier than the defender it's on,
 *      flattens it (a pancake); a defender grabbing the carrier starts
 *      Break it! (running into a planted Scarecrow just stops it).
 *   5. A carrier dragging tacklers goes down when the drag runs out.
 *   6. The pocket: once its sweeps are done with the QB still holding the
 *      ball, it's a sack.
 *   7. The bullet in the air (ball.ts).
 *   8. The carrier over the first-down line wins the drive; over the
 *      sideline, it's down there.
 * In Break it! the play is frozen until it's decided (sim/breakit.ts).
 * Before the snap and between drives only the Bats move.
 */
import { arcadeTuning, DT } from '../content/tuning';
import { carrierOf, chooseLane, qbOf } from './ai';
import { bulletEnd, flightTime, pocketTime, resolveFlight, sweepAngle } from './ball';
import { moveBodies, separate, touching } from './physics';
import { judgeBreakIt, startBreakIt } from './breakit';
import { endDown, nextDown } from './run';
import type { ArcadeEvent, ArcadeResult, BreakKind, Player, RunState, StepInput } from './types';
import { norm, scale, sub } from './vec';

const { contact, field } = arcadeTuning;

/**
 * Tests can force which Break it! comes up (it's random otherwise). Not part
 * of the game: set and cleared only around a test.
 */
let forcedBreak: BreakKind | undefined;
export function forceBreakKind(kind: BreakKind | undefined): void {
  forcedBreak = kind;
}

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
  if (state.phase === 'breakit') {
    breakIt(state, input, events);
    return { state, events };
  }
  if (state.phase !== 'play') {
    moveBodies(state);
    separate(state);
    return { state, events };
  }

  if (input.throw) throwBullet(state, events);
  const carrier = carrierOf(state);
  if (carrier && state.step % Math.max(1, Math.round(arcadeTuning.carrier.laneEvery / DT)) === 0) {
    state.field.lane = chooseLane(state, carrier);
  }
  moveBodies(state);
  separate(state);
  if (resolveContact(state, events)) return { state, events };
  if (dragDone(state, events)) return { state, events };
  if (pocket(state, events)) return { state, events };
  if (flight(state, events)) return { state, events };
  checkCarrier(state, events);
  return { state, events };
}

/** Whether the QB can throw right now: in play, with the ball. */
export function canThrow(state: RunState): boolean {
  return state.phase === 'play' && state.field.ball.at === 'qb' && qbOf(state) !== null;
}

// ── THROW ───────────────────────────────────────────────────────────────────

/** THROW: a bullet along the line, as far as its range (or the sideline). */
function throwBullet(state: RunState, events: ArcadeEvent[]): void {
  const qb = qbOf(state);
  if (!qb || !canThrow(state)) return;
  const target = bulletEnd(state, qb.pos, sweepAngle(state));
  const landsAt = state.time + flightTime(qb.pos, target, state.perks.throwScale);
  state.field.ball = { at: 'flight', from: qb.pos, target, thrownAt: state.time, landsAt };
  events.push({ type: 'thrown', target, landsAt });
}

/** Someone has the ball now: it runs, and picks its lane. */
export function giveBall(state: RunState, p: Player): void {
  p.job = { kind: 'carry' };
  state.field.ball = { at: 'carried', by: p.id };
  state.field.lane = chooseLane(state, p);
  state.field.drag = null;
}

// ── Contact and Break it! ────────────────────────────────────────────────────

/** Pancakes, and a defender grabbing the carrier. Returns whether play stopped. */
function resolveContact(state: RunState, events: ArcadeEvent[]): boolean {
  const { players, defenders } = state.field;
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

  // Already dragging tacklers: it's going down, nobody new needs to grab it.
  if (!carrier || state.field.drag) return false;
  const grabbing = upDefenders.filter((d) => d.down <= 0 && !d.latch && touching(carrier, d));
  if (grabbing.length === 0) return false;
  // Running into a planted Scarecrow stops you dead.
  const scarecrow = grabbing.find((d) => d.planted);
  if (scarecrow) {
    tackle(state, carrier, scarecrow.id, events);
    return true;
  }
  startBreakIt(
    state,
    carrier,
    grabbing.map((d) => d.id),
    forcedBreak,
  );
  events.push({ type: 'grabbed', id: carrier.id, by: grabbing.map((d) => d.id) });
  return true;
}

/** Break it!: judge the input (sim/breakit.ts), and carry out a break, a drag or a tackle. */
function breakIt(state: RunState, input: StepInput, events: ArcadeEvent[]): void {
  const t = state.tackle;
  const carrier = carrierOf(state);
  if (!t || !carrier) {
    state.phase = 'play';
    state.tackle = null;
    return;
  }
  let outcome = judgeBreakIt(state, input);
  if (!outcome) return;
  // Second Wind (a perk): once a drive, a BAD one counts as OK.
  if (outcome === 'tackle' && state.perks.secondWind && !state.perks.secondWindUsed) {
    state.perks.secondWindUsed = true;
    outcome = 'drag';
  }
  events.push({ type: 'breakResult', outcome });
  const tacklers = state.field.defenders.filter((d) => t.tacklers.includes(d.id));
  state.tackle = null;
  state.phase = 'play';
  if (outcome === 'break') {
    // BREAK: they go flying, and the carrier keeps going.
    for (const d of tacklers) {
      d.down = contact.brokenTime;
      d.vel = scale(norm(sub(d.pos, carrier.pos)), 5);
      events.push({ type: 'brokeTackle', id: carrier.id, defender: d.id });
    }
    return;
  }
  if (outcome === 'drag') {
    // DRAG: it hauls them a few yards, then goes down.
    for (const d of tacklers) {
      d.latch = scale(norm(sub(d.pos, carrier.pos)), carrier.radius + d.radius);
    }
    state.field.drag = { to: carrier.pos.y + t.dragYards };
    events.push({ type: 'dragged', id: carrier.id, yards: t.dragYards });
    return;
  }
  tackle(state, carrier, t.tacklers[0] ?? -1, events);
}

/** A carrier dragging tacklers goes down once it reaches the end of the drag. */
function dragDone(state: RunState, events: ArcadeEvent[]): boolean {
  const carrier = carrierOf(state);
  const drag = state.field.drag;
  if (!carrier || !drag || carrier.pos.y < drag.to) return false;
  const by = state.field.defenders.find((d) => d.latch)?.id ?? -1;
  tackle(state, carrier, by, events);
  return true;
}

function tackle(state: RunState, carrier: Player, by: number, events: ArcadeEvent[]): void {
  events.push({ type: 'tackled', id: carrier.id, by });
  carrier.down = 1;
  for (const d of state.field.defenders) d.latch = null;
  state.field.drag = null;
  state.field.ball = { at: 'dead', pos: carrier.pos, how: 'tackled' };
  endDown(state, 'tackled', carrier.pos.y, events);
}

// ── The pocket, the bullet, and the carrier ──────────────────────────────────

/** The pocket holds for its sweeps; after that, with the QB still holding the ball, it's a sack. */
function pocket(state: RunState, events: ArcadeEvent[]): boolean {
  const qb = qbOf(state);
  if (!qb || state.field.ball.at !== 'qb') return false;
  if (state.time - state.snappedAt < pocketTime(state)) return false;
  events.push({ type: 'sacked' });
  qb.down = 1;
  state.field.ball = { at: 'dead', pos: qb.pos, how: 'sacked' };
  endDown(state, 'sacked', state.drive.los - arcadeTuning.drive.sackLoss, events);
  return true;
}

function flight(state: RunState, events: ArcadeEvent[]): boolean {
  const outcome = resolveFlight(state);
  if (!outcome) return false;
  if (outcome.kind === 'caught') {
    giveBall(state, outcome.by);
    events.push({ type: 'caught', id: outcome.by.id, contested: outcome.contested });
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
    for (const d of state.field.defenders) d.latch = null;
    state.field.drag = null;
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
