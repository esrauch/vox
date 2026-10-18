/**
 * The tick step: advance a run by exactly one tick (TECHNICAL.md §3). Pure:
 * the input state is never modified, and the same state plus the same input
 * always gives the same result.
 *
 * Ticks are eighth notes: two per beat of the music. The tick is global: it
 * ticks in every phase and never resets. What changes is who acts on it.
 * Before the snap only defenders that ignore it move (the Bats); everyone
 * else waits. After a down ends, it stays on screen for a few ticks, then the
 * next down lines up.
 *
 * Order within a tick in play (GAMEPLAY.md, A Down):
 *   1. Knocked-down units recover a little.
 *   2. A throw released for this tick leaves the QB's hand.
 *   3. Units hop. Your players and defenders can't share a tile. A defender
 *      that meets the carrier, or ends the tick right next to it (in front,
 *      behind or beside), tackles it, unless it fends off.
 *   4. The carrier crossing the first-down line wins the drive.
 *   5. The pocket clock runs down; at zero, with the ball still in the QB's
 *      hand, it's a sack. (The line and the rush are only drawn: render/pocket.ts.)
 *   6. A Witch crossing the pass blocks it.
 *   7. The pass in the air: once it's low enough to touch, a defender near
 *      it bats it down, a Scarecrow's ring knocks it away, or a player near
 *      it catches it; at the turf with nobody there, it's incomplete.
 *   8. Everyone decides next tick's hop (the telegraph).
 */
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { updateIntents } from './ai';
import { coveringDefender } from './coverage';
import { COLS, END_ROW, ROWS, dist, eq, inBounds, key, vec, distance } from './grid';
import { ballGround, catchable, flightTicks } from './flight';
import { snatches, witchColumn } from './hazards';
import { endDown, nextDown } from './run';
import { actsOn } from './stats';
import type {
  BeatInput,
  CatchQuality,
  Defender,
  PlayerUnit,
  RunState,
  SimEvent,
  SimResult,
  ThrowProblem,
  Unit,
  Vec,
} from './types';

export function step(prev: RunState, input: BeatInput = {}): SimResult {
  const state = structuredClone(prev);
  const events: SimEvent[] = [];
  state.tick += 1;

  if (state.phase === 'downOver') {
    if (--state.pause <= 0) nextDown(state, events);
    return { state, events };
  }
  if (state.phase !== 'play') {
    // Before the snap (and in the draft), only snap-ignorers move, without contact.
    resolveMoves(state, events);
    updateIntents(state.screen);
    return { state, events };
  }

  state.downTick++;
  for (const u of allUnits(state)) if (u.downTicks > 0) u.downTicks--;
  if (input.throwAt) tryThrow(state, input.throwAt, events);
  const tackled = resolveMoves(state, events) ?? checkContact(state, events);
  if (checkFirstDown(state, events)) return { state, events };
  if (tackled) {
    endDown(state, 'tackled', tackled.pos.y, events);
    return { state, events };
  }
  if (runPocket(state, events)) return { state, events };
  if (checkSnatch(state, events)) return { state, events };
  if (resolveFlight(state, events)) return { state, events };
  updateIntents(state.screen);
  return { state, events };
}

function allUnits(state: RunState): Unit[] {
  return [...state.screen.players, ...state.screen.defenders];
}

const byId = (a: { id: number }, b: { id: number }): number => a.id - b.id;
const isUp = (u: Unit): boolean => u.downTicks === 0;

function carrierOf(state: RunState): PlayerUnit | null {
  const { ball } = state.screen;
  if (ball.at !== 'carried') return null;
  return state.screen.players.find((p) => p.id === ball.by) ?? null;
}

// ── Throwing ────────────────────────────────────────────────────────────────

/** Why a throw to `target` isn't allowed right now, or null if it is. */
export function throwProblem(state: RunState, target: Vec): ThrowProblem | null {
  if (state.phase !== 'play') return 'notInPlay';
  if (state.screen.ball.at !== 'qb') return 'noBall';
  // Targets are free points in tile units (not grid-locked), measured from the line of scrimmage.
  if (target.x < -0.5 || target.x > COLS - 0.5) return 'offField';
  const { los } = state.drive;
  if (target.y > Math.min(ROWS - 0.5, los + tuning.throw.maxAhead + 0.5)) return 'tooFar';
  if (target.y < los + tuning.throw.minAhead - 0.5) return 'tooClose';
  return null;
}

function tryThrow(state: RunState, target: Vec, events: SimEvent[]): void {
  const problem = throwProblem(state, target);
  if (problem) {
    events.push({ type: 'throwRejected', target, reason: problem });
    return;
  }
  const from = state.screen.qb;
  const landsOn = state.tick + flightTicks(from, target);
  state.screen.ball = { at: 'flight', from, target, releasedOn: state.tick, landsOn };
  events.push({ type: 'thrown', target, landsOn });
}

// ── Movement, blocking and tackles ─────────────────────────────────────────

/** Whether a unit moves in the current phase: everyone in play, only snap-ignorers outside it. */
function movesNow(state: RunState, u: Unit): boolean {
  return state.phase === 'play' || (u.side === 'defender' && DEFENDERS[u.kind].ignoresSnap);
}

/**
 * Everyone due to hop this tick hops. Your players and defenders never share
 * a tile: whoever would step into the other waits (that's how blockers work).
 * The one exception is the carrier: a defender meeting it tackles it, unless
 * it has a fend-off left, which knocks the defender down instead. Returns the
 * tackled carrier, if any.
 */
function resolveMoves(state: RunState, events: SimEvent[]): PlayerUnit | null {
  const { tick } = state;
  const carrier = carrierOf(state);
  const units = allUnits(state).sort(byId);
  const moving = new Map<number, Vec>();
  for (const u of units) {
    if (!isUp(u) || !u.intent || !inBounds(u.intent)) continue;
    if (!actsOn(u.stats, tick) || !movesNow(state, u)) continue;
    moving.set(u.id, u.intent);
  }
  const finalOf = (u: Unit): Vec => moving.get(u.id) ?? u.pos;
  const players = units.filter((u): u is PlayerUnit => u.side === 'player');
  const defenders = units.filter((u): u is Defender => u.side === 'defender');
  const meets = (p: Unit, d: Unit): boolean =>
    eq(finalOf(p), finalOf(d)) ||
    (moving.has(p.id) && moving.has(d.id) && eq(finalOf(p), d.pos) && eq(finalOf(d), p.pos));

  // Blocking: a player and a defender can't end up on one tile or pass through
  // each other, except the carrier and a defender (a tackle). A cancelled hop
  // can cause a new clash, so repeat until nothing changes.
  for (let changed = true; changed;) {
    changed = cancelDefenderConflicts(defenders, moving);
    for (const p of players) {
      for (const d of defenders) {
        // The carrier meeting a defender is a tackle (below).
        if (p === carrier) continue;
        if (!meets(p, d)) continue;
        // The defender always waits; the player waits too if it would still land on it.
        if (moving.delete(d.id)) changed = true;
        if (eq(finalOf(p), finalOf(d)) && moving.delete(p.id)) changed = true;
      }
    }
  }

  let tackled: PlayerUnit | null = null;
  if (carrier && state.phase === 'play') {
    for (const d of defenders) {
      if (!isUp(d) || !meets(carrier, d)) continue;
      if (carrier.fendOff > 0) {
        carrier.fendOff--;
        d.downTicks = tuning.units.knockdownTicks;
        moving.delete(d.id);
        events.push({ type: 'fendedOff', id: carrier.id, defender: d.id });
        events.push({ type: 'knockedDown', id: d.id });
        continue;
      }
      tackled = carrier;
      events.push({ type: 'tackled', id: carrier.id, by: d.id });
      break;
    }
  }

  for (const u of units) {
    if (u.side === 'player' && state.phase === 'play' && actsOn(u.stats, tick) && isUp(u)) {
      u.routeStep++;
    }
    const to = moving.get(u.id);
    if (!to) continue;
    events.push({ type: 'hop', id: u.id, from: u.pos, to });
    u.pos = to;
    if (u.side === 'defender') advancePatrol(u);
  }
  return tackled;
}

/**
 * After everyone hops: a defender that's up and right next to the carrier (or
 * on its tile) tackles it, so a chaser one step behind catches it rather than
 * trailing it up the field. A fend-off knocks that defender down instead.
 */
function checkContact(state: RunState, events: SimEvent[]): PlayerUnit | null {
  const carrier = carrierOf(state);
  if (!carrier) return null;
  const near = state.screen.defenders
    .filter((d) => isUp(d) && dist(d.pos, carrier.pos) <= 1)
    .sort(byId);
  for (const d of near) {
    if (carrier.fendOff > 0) {
      carrier.fendOff--;
      d.downTicks = tuning.units.knockdownTicks;
      events.push({ type: 'fendedOff', id: carrier.id, defender: d.id });
      events.push({ type: 'knockedDown', id: d.id });
      continue;
    }
    events.push({ type: 'tackled', id: carrier.id, by: d.id });
    return carrier;
  }
  return null;
}

/** After a hop, a patrolling defender moves on to the next tile of its circuit. */
function advancePatrol(d: Defender): void {
  if (!d.patrol) return;
  const next = (d.patrolIndex + 1) % d.patrol.length;
  if (eq(d.patrol[next], d.pos)) d.patrolIndex = next;
}

/**
 * Two defenders can't share a tile or swap places. Defenders that aren't
 * moving keep their tile; among movers, the lower id wins. Returns whether
 * anything was cancelled.
 */
function cancelDefenderConflicts(
  defenders: readonly Defender[],
  moving: Map<number, Vec>,
): boolean {
  let any = false;
  for (let changed = true; changed;) {
    changed = false;
    const claimed = new Set(defenders.filter((u) => !moving.has(u.id)).map((u) => key(u.pos)));
    for (const u of defenders) {
      const to = moving.get(u.id);
      if (!to) continue;
      const swapper = defenders.find(
        (v) => v.id < u.id && eq(moving.get(v.id), u.pos) && eq(to, v.pos),
      );
      if (claimed.has(key(to)) || swapper) {
        moving.delete(u.id);
        changed = any = true;
        break;
      }
      claimed.add(key(to));
    }
  }
  return any;
}

// ── How a down ends ─────────────────────────────────────────────────────────

/** The carrier over the first-down line wins the drive. */
function checkFirstDown(state: RunState, events: SimEvent[]): boolean {
  const carrier = carrierOf(state);
  if (!carrier || carrier.pos.y < state.drive.firstDown) return false;
  endDown(state, 'firstDown', carrier.pos.y, events);
  return true;
}

/** A defender next to the QB while it still holds the ball sacks it; so does running out the play clock. */
function runPocket(state: RunState, events: SimEvent[]): boolean {
  const { screen, pocket } = state;
  if (!pocket) return false;
  if (screen.ball.at !== 'qb') {
    // The ball is away in time: the clock stops.
    state.pocket = null;
    return false;
  }
  pocket.left = Math.max(0, pocket.left - 1);
  if (pocket.left > 0) return false;
  events.push({ type: 'sacked', by: null });
  screen.ball = { at: 'dead', pos: screen.qb, how: 'sacked' };
  state.pocket = null;
  endDown(state, 'sacked', state.drive.los - tuning.drive.sackLoss, events);
  return true;
}

/** A pass crossing a Witch's row near her bounces off her. */
function checkSnatch(state: RunState, events: SimEvent[]): boolean {
  const { screen, tick } = state;
  const witch = screen.hazards.find((h) => snatches(h, screen.ball, tick));
  if (!witch) return false;
  const at = vec(witchColumn(witch, tick), witch.row);
  events.push({ type: 'blocked', by: witch.id, at });
  screen.ball = { at: 'dead', pos: at, how: 'blocked' };
  endDown(state, 'blocked', state.drive.los, events);
  return true;
}

/**
 * The pass in the air (sim/flight.ts): it can only be touched while it's low,
 * so for a long throw that's the stretch as it comes down toward the
 * reticle, and for a short one most of the way. This tick's stretch of the
 * path is checked in order, and the first thing within reach of the low ball
 * decides it:
 *   - a defender close to it bats it down;
 *   - inside a Scarecrow's (or Bat's) ring, it's knocked away;
 *   - one of your players close to it catches it (how close sets perfect, good or ok);
 *   - if it reaches the turf with nobody there, it's incomplete.
 */
function resolveFlight(state: RunState, events: SimEvent[]): boolean {
  const { screen, tick } = state;
  const ball = screen.ball;
  if (ball.at !== 'flight' || tick <= ball.releasedOn) return false;
  const span = ball.landsOn - ball.releasedOn;
  const STEPS = 4;
  for (let i = 1; i <= STEPS; i++) {
    const t = Math.min(1, (tick - 1 - ball.releasedOn + i / STEPS) / span);
    if (!catchable(ball.from, ball.target, t)) continue;
    const at = ballGround(ball.from, ball.target, t);
    const batter = screen.defenders
      .filter((d) => isUp(d) && distance(d.pos, at) <= tuning.throw.blockRadius)
      .sort((a, b) => distance(a.pos, at) - distance(b.pos, at) || a.id - b.id)[0];
    const by = batter ?? coveringDefender(screen, at);
    if (by) {
      events.push({ type: 'blocked', by: by.id, at: by.pos });
      screen.ball = { at: 'dead', pos: by.pos, how: 'blocked' };
      endDown(state, 'blocked', state.drive.los, events);
      return true;
    }
    const receiver = screen.players
      .filter((p) => isUp(p) && distance(p.pos, at) <= catchRadius(p, 'ok'))
      .sort((a, b) => distance(a.pos, at) - distance(b.pos, at) || a.id - b.id)[0];
    if (receiver) return catchBall(state, receiver, distance(receiver.pos, at), events);
    if (t >= 1) {
      events.push({ type: 'incomplete', at: ball.target });
      screen.ball = { at: 'dead', pos: ball.target, how: 'incomplete' };
      endDown(state, 'incomplete', state.drive.los, events);
      return true;
    }
  }
  return false;
}

/** A catch: how close the ball came to the receiver sets its quality; a perfect one is a Clean Catch. */
function catchBall(state: RunState, receiver: PlayerUnit, d: number, events: SimEvent[]): boolean {
  const { screen } = state;
  const quality: CatchQuality =
    d <= catchRadius(receiver, 'perfect')
      ? 'perfect'
      : d <= catchRadius(receiver, 'good')
        ? 'good'
        : 'ok';
  screen.ball = { at: 'carried', by: receiver.id };
  const clean = quality === 'perfect';
  if (clean) receiver.fendOff += 1;
  events.push({ type: 'caught', id: receiver.id, clean, quality });
  // A catch over the line is a first down on the spot.
  if (receiver.pos.y >= state.drive.firstDown || receiver.pos.y >= END_ROW) {
    endDown(state, 'firstDown', receiver.pos.y, events);
    return true;
  }
  updateIntents(screen);
  return false;
}

/** How far from a receiver a ball can land and still be caught at a given quality (Hands widens it). */
export function catchRadius(p: PlayerUnit, quality: CatchQuality): number {
  return tuning.catch[quality] + p.stats.hands * tuning.catch.perHands;
}
