/**
 * The beat step: advance a run in play by exactly one beat (TECHNICAL.md §3).
 * Pure: the input state is never modified, and the same state plus the same
 * throw always gives the same result.
 *
 * Order within a beat:
 *   1. Knocked-down units recover a little.
 *   2. A throw tapped for this beat leaves the QB's hand.
 *   3. Units hop (on their hop beats) and collisions resolve.
 *   4. Blitzers next to the QB attack it (only while it holds the ball).
 *   5. A ball due this beat lands: catch, interception or miss.
 *   6. Touchdown and wipeout checks.
 *   7. Everyone decides next beat's hop (the telegraph).
 */
import { smallKind } from '../content/smalls';
import { tuning } from '../content/tuning';
import { updateIntents } from './ai';
import { QB_POS, END_ROW, dist, eq, inBounds, key, nextToQb } from './grid';
import { setUpScreen, yards } from './run';
import { actsOn, catchTiles, facingOf, hitsSurvived } from './stats';
import type {
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
  if (state.phase !== 'play') return { state, events };

  state.beat += 1;
  for (const u of liveUnits(state)) if (u.downBeats > 0) u.downBeats--;

  if (throwTarget) tryThrow(state, throwTarget, events);
  resolveMoves(state, events);
  if (state.phase === 'play') resolveAttacks(state, events);
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
  if (!inBounds(target)) return 'off the field';
  if (eq(target, QB_POS)) return 'that is the QB';
  if (target.y > tuning.throw.maxRow) return 'out of range';
  if (target.y < tuning.throw.minRow) return 'too close';
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
  const { screen, beat } = state;
  const units = liveUnits(state).sort(byId);
  const moving = new Map<number, Vec>();
  for (const u of units) {
    if (u.downBeats > 0 || !u.intent || !inBounds(u.intent) || !actsOn(u.stats, beat)) continue;
    if (u.side === 'defender' && u.engagedSince !== null) continue;
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
    cancelSameSideConflicts(units, moving);
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
  }

  // A Blitzer that reaches a tile next to the QB stays there and attacks it.
  for (const d of screen.defenders) {
    if (d.alive && d.kind === 'blitzer' && d.engagedSince === null && nextToQb(d.pos)) {
      d.engagedSince = beat;
      events.push({ type: 'engaged', id: d.id });
    }
  }
}

/**
 * Two defenders can't share a tile or swap places. Defenders that aren't
 * moving keep their tile; among movers, the lower id wins. Smalls never block
 * each other: they can share a tile and hop past one another.
 */
function cancelSameSideConflicts(units: readonly Unit[], moving: Map<number, Vec>): void {
  for (let changed = true; changed;) {
    changed = false;
    for (const side of ['defender'] as const) {
      const sideUnits = units.filter((u) => u.side === side && u.alive);
      const claimed = new Set(sideUnits.filter((u) => !moving.has(u.id)).map((u) => key(u.pos)));
      for (const u of sideUnits) {
        const to = moving.get(u.id);
        if (!to) continue;
        const swapper = sideUnits.find(
          (v) => v.id < u.id && eq(moving.get(v.id), u.pos) && eq(to, v.pos),
        );
        if (claimed.has(key(to)) || swapper) {
          moving.delete(u.id);
          changed = true;
          break;
        }
        claimed.add(key(to));
      }
      if (changed) break;
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
  const result = hit(state, s, d.kind === 'blitzer' ? 'blitzer' : 'defender', events);
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

// ── Blitzer attacks ─────────────────────────────────────────────────────────

function resolveAttacks(state: RunState, events: SimEvent[]): void {
  const { screen, beat } = state;
  for (const d of [...screen.defenders].sort(byId)) {
    // Blitzers only threaten a QB that's still holding the ball; once it's thrown they're irrelevant.
    if (state.phase !== 'play' || screen.ball.at !== 'qb') return;
    if (d.engagedSince === null || d.engagedSince === beat || !isUp(d) || !actsOn(d.stats, beat)) {
      continue;
    }
    screen.qbHold = Math.max(0, screen.qbHold - 1);
    events.push({ type: 'attack', id: d.id, holdLeft: screen.qbHold });
    if (screen.qbHold === 0) {
      fumble(state, 'sack', events);
      return; // A sack ends this beat's attacks; the next ball starts fresh.
    }
  }
}

// ── The ball landing ───────────────────────────────────────────────────────

function resolveLanding(state: RunState, events: SimEvent[]): void {
  const { screen, beat } = state;
  const ball = screen.ball;
  if (ball.at !== 'flight' || ball.landsOn !== beat) return;
  const target = ball.target;

  const onTile = screen.smalls.filter((s) => isUp(s) && eq(s.pos, target)).sort(byId)[0];
  if (onTile) {
    catchBall(state, onTile, true, events);
    return;
  }
  if (screen.defenders.some((d) => isUp(d) && eq(d.pos, target))) {
    fumble(state, 'interception', events);
    return;
  }
  const tileFree = !liveUnits(state).some((u) => eq(u.pos, target));
  const lunger = screen.smalls
    .filter(
      (s) =>
        tileFree &&
        isUp(s) &&
        catchTiles(s.pos, facingOf(s.pos, s.intent), s.stats)
          .slice(1)
          .some((t) => eq(t, target)),
    )
    .sort((a, b) => dist(a.pos, target) - dist(b.pos, target) || a.id - b.id)[0];
  if (lunger) {
    events.push({ type: 'hop', id: lunger.id, from: lunger.pos, to: target });
    lunger.pos = target;
    catchBall(state, lunger, false, events);
    return;
  }
  fumble(state, 'miss', events);
}

/** A catch. On the exact tile it's a Clean Catch, and the receiver can fend off one defender. */
function catchBall(state: RunState, s: SmallUnit, clean: boolean, events: SimEvent[]): void {
  state.screen.ball = { at: 'carried', by: s.id };
  if (clean) s.fendOff += 1;
  events.push({ type: 'caught', id: s.id, clean });
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
