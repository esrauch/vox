/**
 * The beat step: advance a run by exactly one beat (TECHNICAL.md §3). Pure:
 * the input state is never modified, and the same state plus the same throw
 * always gives the same result.
 *
 * The beat is global: it ticks in every phase, in time with the music, and
 * never resets. What changes is who acts on it. Before HIKE (and between
 * screens) only the patrols move: Bats circle whatever the play is doing,
 * while your players and the other defenders wait for the snap.
 *
 * Order within a beat in play:
 *   1. Knocked-down units recover a little.
 *   2. A throw tapped for this beat leaves the QB's hand.
 *   3. Units hop (on their hop beats) and collisions resolve.
 *   4. A defender next to the QB sacks it (only while it holds the ball).
 *   5. A ball due this beat lands: catch, interception or miss.
 *   6. Touchdown and wipeout checks.
 *   7. Everyone decides next beat's hop (the telegraph).
 */
import { smallKind } from '../content/smalls';
import { tuning } from '../content/tuning';
import { patrolNext, updateIntents } from './ai';
import { COLS, END_ROW, eq, inBounds, key, nextToQb } from './grid';
import { setUpScreen, yards } from './run';
import { actsOn, hitsSurvived } from './stats';
import type {
  CatchQuality,
  DeathCause,
  Defender,
  FumbleReason,
  HitResult,
  RunState,
  SimEvent,
  SmallUnit,
  Unit,
  Vec,
} from './types';

export interface StepResult {
  readonly state: RunState;
  readonly events: SimEvent[];
}

export function step(prev: RunState, throwTarget: Vec | null = null): StepResult {
  const state = structuredClone(prev);
  const events: SimEvent[] = [];
  state.beat += 1;
  if (state.phase !== 'play') {
    patrolStep(state, events);
    return { state, events };
  }
  for (const u of liveUnits(state)) if (u.downBeats > 0) u.downBeats--;

  if (throwTarget) tryThrow(state, throwTarget, events);
  resolveMoves(state, events);
  if (state.phase === 'play') checkSack(state, events);
  updateIntents(state.screen);
  if (state.phase === 'play') resolveLanding(state, events);
  if (state.phase === 'play') checkTouchdown(state, events);
  if (state.phase === 'play') checkWipeout(state, events);
  if (state.phase === 'play') updateIntents(state.screen);
  return { state, events };
}

function liveUnits(state: RunState): Unit[] {
  return [...state.screen.smalls, ...state.screen.defenders].filter((u) => u.alive);
}

const byId = (a: { id: number }, b: { id: number }): number => a.id - b.id;
const isUp = (u: Unit): boolean => u.alive && u.downBeats === 0;

// ── Throwing ────────────────────────────────────────────────────────────────

/** Why a throw to `target` isn't allowed right now, or null if it is. */
export function throwProblem(state: RunState, target: Vec): string | null {
  if (state.phase !== 'play') return 'not in play';
  if (state.screen.ball.at !== 'qb') return 'the QB has no ball';
  // Targets are free points in tile units (not grid-locked); the band is rows minRow..maxRow inclusive.
  if (target.x < -0.5 || target.x > COLS - 0.5) return 'off the field';
  if (target.y > tuning.throw.maxRow + 0.5) return 'out of range';
  if (target.y < tuning.throw.minRow - 0.5) return 'too close';
  return null;
}

function tryThrow(state: RunState, target: Vec, events: SimEvent[]): void {
  const problem = throwProblem(state, target);
  if (problem) {
    events.push({ type: 'throwRejected', target, reason: problem });
    return;
  }
  const landsOn = state.beat + tuning.throw.flightBeats;
  state.screen.ball = { at: 'flight', target, releasedOn: state.beat, landsOn };
  events.push({ type: 'thrown', target, landsOn });
}

// ── Movement and collisions ────────────────────────────────────────────────

function resolveMoves(state: RunState, events: SimEvent[]): void {
  const { beat } = state;
  const units = liveUnits(state).sort(byId);
  const moving = new Map<number, Vec>();
  for (const u of units) {
    if (u.downBeats > 0 || !u.intent || !inBounds(u.intent) || !actsOn(u.stats, beat)) continue;
    moving.set(u.id, u.intent);
  }
  const finalOf = (u: Unit): Vec => moving.get(u.id) ?? u.pos;

  // Smalls against defenders. A cancelled hop can cause a new conflict, so
  // repeat until nothing changes (each pair resolves at most once).
  const smalls = units.filter((u): u is SmallUnit => u.side === 'small');
  const defenders = units.filter((u): u is Defender => u.side === 'defender');
  const resolved = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    cancelDefenderConflicts(units, moving);
    for (const d of defenders) {
      for (const s of smalls) {
        const pair = `${s.id}:${d.id}`;
        if (!s.alive || !d.alive || resolved.has(pair) || state.phase !== 'play') continue;
        const sMoves = moving.has(s.id);
        const dMoves = moving.has(d.id);
        const meet = eq(finalOf(s), finalOf(d));
        const swap = sMoves && dMoves && eq(finalOf(s), d.pos) && eq(finalOf(d), s.pos);
        if (!meet && !swap) continue;
        resolved.add(pair);
        changed = true;

        // A knocked-down unit is just an obstacle: whoever hopped into it stays put.
        if (s.downBeats > 0 || d.downBeats > 0) {
          moving.delete(s.id);
          moving.delete(d.id);
          continue;
        }
        collide(state, s, d, moving, events);
      }
    }
  }

  // A tackle fumble resets the screen; the old units are gone, so stop here.
  if (state.phase !== 'play') return;

  for (const u of units) {
    const to = moving.get(u.id);
    if (!u.alive || !to) continue;
    events.push({ type: 'hop', id: u.id, from: u.pos, to });
    u.pos = to;
    if (u.side === 'defender') advancePatrol(u);
  }
}

/** After a hop, a patrolling defender moves on to the next tile of its circuit. */
function advancePatrol(d: Defender): void {
  if (!d.patrol) return;
  const next = (d.patrolIndex + 1) % d.patrol.length;
  if (eq(d.patrol[next], d.pos)) d.patrolIndex = next;
}

/** Outside play, only patrolling defenders (the Bats) hop. Nothing collides: they stay out of the setup rows. */
function patrolStep(state: RunState, events: SimEvent[]): void {
  const screen = state.screen;
  for (const d of screen.defenders) {
    if (!d.alive || !d.patrol || !actsOn(d.stats, state.beat)) continue;
    const to = patrolNext(d);
    if (!to) continue;
    events.push({ type: 'hop', id: d.id, from: d.pos, to });
    d.pos = to;
    advancePatrol(d);
  }
  updateIntents(screen);
}

/**
 * Two defenders can't share a tile or swap places. Defenders that aren't
 * moving keep their tile; among movers, the lower id wins. Smalls never block
 * each other: they can share a tile and hop past one another.
 */
function cancelDefenderConflicts(units: readonly Unit[], moving: Map<number, Vec>): void {
  const defenders = units.filter((u) => u.side === 'defender' && u.alive);
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
        changed = true;
        break;
      }
      claimed.add(key(to));
    }
  }
}

/**
 * A Small and a defender collide. The defender wins, unless the Small can
 * fend it off. A Small that trades (a Walk-on) without the ball takes the
 * defender down with it.
 */
function collide(
  state: RunState,
  s: SmallUnit,
  d: Defender,
  moving: Map<number, Vec>,
  events: SimEvent[],
): void {
  if (s.fendOff > 0) {
    s.fendOff--;
    events.push({ type: 'fendedOff', id: s.id, defender: d.id });
    knockDown(d, events);
    moving.delete(d.id);
    return;
  }
  const carrying = state.screen.ball.at === 'carried' && state.screen.ball.by === s.id;
  const trades = !carrying && smallKind(s.kindId).trades;
  const result = hit(state, s, 'defender', events);
  const defenderResult = trades ? hit(state, d, 'walkOn', events) : null;
  if (result === 'down') moving.delete(s.id);
  if (result === 'down' || defenderResult === 'down') moving.delete(d.id);
  if (carrying) fumble(state, 'tackle', events);
}

/** A unit takes a hit. Heft decides whether it's knocked down or killed (Heft 0: killed). */
function hit(state: RunState, u: Unit, cause: DeathCause, events: SimEvent[]): HitResult {
  u.hitsTaken++;
  if (u.hitsTaken <= hitsSurvived(u.stats)) {
    knockDown(u, events);
    return 'down';
  }
  u.alive = false;
  u.intent = null;
  events.push({ type: 'died', id: u.id, cause });
  if (u.side === 'small') {
    // A dead recruit is gone for good: its slot reverts to a Walk-on.
    if (!smallKind(u.kindId).returns) {
      const slot = state.slots[u.slot];
      if (slot) slot.kindId = 'walkOn';
    }
  }
  return 'dead';
}

function knockDown(u: Unit, events: SimEvent[]): void {
  u.downBeats = tuning.units.knockdownBeats;
  events.push({ type: 'knockedDown', id: u.id });
}

// ── Sacks ───────────────────────────────────────────────────────────────────

/**
 * Any defender that's up and next to the QB while it still holds the ball
 * sacks it, on the beat it gets there. Once the ball is thrown, the QB is safe.
 */
function checkSack(state: RunState, events: SimEvent[]): void {
  const { screen } = state;
  if (screen.ball.at !== 'qb') return;
  if (screen.defenders.some((d) => isUp(d) && nextToQb(d.pos))) fumble(state, 'sack', events);
}

// ── The ball landing ───────────────────────────────────────────────────────

function resolveLanding(state: RunState, events: SimEvent[]): void {
  const { screen, beat } = state;
  const ball = screen.ball;
  if (ball.at !== 'flight' || ball.landsOn !== beat) return;
  const target = ball.target;
  const away = (p: Vec): number => Math.hypot(p.x - target.x, p.y - target.y);

  // The best receiver: the closest of your players within its catch radius.
  const receiver = screen.smalls
    .filter((s) => isUp(s) && away(s.pos) <= catchRadius(s, 'ok'))
    .sort((a, b) => away(a.pos) - away(b.pos) || a.id - b.id)[0];
  // A defender right under the ball, and closer than the receiver, picks it off.
  const picker = screen.defenders
    .filter((d) => isUp(d) && away(d.pos) <= tuning.catch.intercept)
    .sort((a, b) => away(a.pos) - away(b.pos) || a.id - b.id)[0];
  if (picker && (!receiver || away(picker.pos) < away(receiver.pos))) {
    fumble(state, 'interception', events);
    return;
  }
  if (!receiver) {
    fumble(state, 'miss', events);
    return;
  }
  const d = away(receiver.pos);
  const quality: CatchQuality =
    d <= catchRadius(receiver, 'perfect')
      ? 'perfect'
      : d <= catchRadius(receiver, 'good')
        ? 'good'
        : 'ok';
  catchBall(state, receiver, quality, events);
}

/** How far from a receiver a ball can land and still be caught at a given quality (Hands widens it). */
export function catchRadius(s: SmallUnit, quality: CatchQuality): number {
  return tuning.catch[quality] + s.stats.hands * tuning.catch.perHands;
}

/** A catch. A perfect one is a Clean Catch: the receiver can fend off one defender. */
function catchBall(state: RunState, s: SmallUnit, quality: CatchQuality, events: SimEvent[]): void {
  state.screen.ball = { at: 'carried', by: s.id };
  const clean = quality === 'perfect';
  if (clean) s.fendOff += 1;
  events.push({ type: 'caught', id: s.id, clean, quality });
}

// ── Fumbles, touchdowns, wipeouts ─────────────────────────────────────────

/**
 * Lose the ball in play for good. If any are left on the pile, the whole
 * screen resets to setup: every Walk-on back, the defenders back at their
 * starting tiles, and the QB holding the next ball. Dead recruits stay dead.
 */
function fumble(state: RunState, reason: FumbleReason, events: SimEvent[]): void {
  state.balls = Math.max(0, state.balls - 1);
  events.push({ type: 'fumble', reason, ballsLeft: state.balls });
  if (state.balls === 0) {
    endRun(state, events);
    return;
  }
  setUpScreen(state, state.screen.index);
  events.push({ type: 'screenStarted', index: state.screen.index });
}

function checkTouchdown(state: RunState, events: SimEvent[]): void {
  const ball = state.screen.ball;
  if (ball.at !== 'carried') return;
  const carrier = state.screen.smalls.find((s) => s.id === ball.by);
  if (!carrier?.alive || carrier.pos.y < END_ROW) return;
  state.screensCleared++;
  state.phase = 'cleared';
  events.push({ type: 'touchdown', id: carrier.id, yards: yards(state) });
}

/** If every Small on the field is dead: lose a ball and restart the screen from setup. */
function checkWipeout(state: RunState, events: SimEvent[]): void {
  if (state.screen.smalls.some((s) => s.alive)) return;
  state.balls = Math.max(0, state.balls - 1);
  events.push({ type: 'wipeout', ballsLeft: state.balls });
  if (state.balls === 0) {
    endRun(state, events);
    return;
  }
  setUpScreen(state, state.screen.index);
  events.push({ type: 'screenStarted', index: state.screen.index });
}

function endRun(state: RunState, events: SimEvent[]): void {
  state.phase = 'over';
  state.screen.ball = { at: 'none' };
  events.push({ type: 'gameOver', yards: yards(state) });
}
