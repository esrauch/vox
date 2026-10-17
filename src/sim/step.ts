/**
 * The beat step: advance a run by exactly one beat (TECHNICAL.md §3). Pure:
 * the input state is never modified, and the same state plus the same throw
 * always gives the same result.
 *
 * The beat is global: it ticks in every phase, in time with the music, and
 * never resets. What changes is who acts on it. Outside play (before HIKE and
 * between screens) only defenders that ignore the snap move (the Bats; see
 * content/defenders.ts), and nothing collides; everyone else waits.
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
import { DEFENDERS } from '../content/defenders';
import { playerKind } from '../content/players';
import { tuning } from '../content/tuning';
import { updateIntents } from './ai';
import { COLS, END_ROW, eq, inBounds, key, nextToQb } from './grid';
import { setUpScreen, yards } from './run';
import { actsOn, hitsSurvived } from './stats';
import type {
  BeatInput,
  CatchQuality,
  DeathCause,
  Defender,
  FumbleReason,
  HitResult,
  RunState,
  SimEvent,
  SimResult,
  ThrowProblem,
  PlayerUnit,
  Unit,
  Vec,
} from './types';

export function step(prev: RunState, input: BeatInput = {}): SimResult {
  const state = structuredClone(prev);
  const events: SimEvent[] = [];
  state.beat += 1;
  if (state.phase !== 'play') {
    resolveMoves(state, events);
    updateIntents(state.screen);
    return { state, events };
  }
  for (const u of liveUnits(state)) if (u.downBeats > 0) u.downBeats--;

  if (input.throwAt) tryThrow(state, input.throwAt, events);
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
  return [...state.screen.players, ...state.screen.defenders].filter((u) => u.alive);
}

const byId = (a: { id: number }, b: { id: number }): number => a.id - b.id;
const isUp = (u: Unit): boolean => u.alive && u.downBeats === 0;

// ── Throwing ────────────────────────────────────────────────────────────────

/** Why a throw to `target` isn't allowed right now, or null if it is. */
export function throwProblem(state: RunState, target: Vec): ThrowProblem | null {
  if (state.phase !== 'play') return 'notInPlay';
  if (state.screen.ball.at !== 'qb') return 'noBall';
  // Targets are free points in tile units (not grid-locked); the band is rows minRow..maxRow inclusive.
  if (target.x < -0.5 || target.x > COLS - 0.5) return 'offField';
  if (target.y > tuning.throw.maxRow + 0.5) return 'tooFar';
  if (target.y < tuning.throw.minRow - 0.5) return 'tooClose';
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

/** Whether a unit moves in the current phase: everyone in play, only snap-ignorers outside it. */
function movesNow(state: RunState, u: Unit): boolean {
  return state.phase === 'play' || (u.side === 'defender' && DEFENDERS[u.kind].ignoresSnap);
}

/**
 * Everyone due to hop this beat hops. In play, players and defenders that
 * meet collide; outside play only snap-ignoring defenders move, and they pass
 * through players without contact.
 */
function resolveMoves(state: RunState, events: SimEvent[]): void {
  const { beat, screen } = state;
  const contact = state.phase === 'play';
  const units = liveUnits(state).sort(byId);
  const moving = new Map<number, Vec>();
  for (const u of units) {
    if (u.downBeats > 0 || !u.intent || !inBounds(u.intent)) continue;
    if (!actsOn(u.stats, beat) || !movesNow(state, u)) continue;
    moving.set(u.id, u.intent);
  }
  const finalOf = (u: Unit): Vec => moving.get(u.id) ?? u.pos;

  // Players against defenders. A cancelled hop can cause a new conflict, so
  // repeat until nothing changes (each pair resolves at most once).
  const players = units.filter((u): u is PlayerUnit => u.side === 'player');
  const defenders = units.filter((u): u is Defender => u.side === 'defender');
  const resolved = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    cancelDefenderConflicts(units, moving);
    for (const d of defenders) {
      for (const s of players) {
        const pair = `${s.id}:${d.id}`;
        if (!contact || !s.alive || !d.alive || resolved.has(pair) || state.screen !== screen) {
          continue;
        }
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
  if (state.screen !== screen) return;

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

/**
 * Two defenders can't share a tile or swap places. Defenders that aren't
 * moving keep their tile; among movers, the lower id wins. Players never block
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
 * A player and a defender collide. The defender wins, unless the player can
 * fend it off. A player that trades (a Walk-on) without the ball takes the
 * defender down with it.
 */
function collide(
  state: RunState,
  s: PlayerUnit,
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
  const trades = !carrying && playerKind(s.kindId).trades;
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
  if (u.side === 'player') {
    // A dead recruit is gone for good: its slot reverts to a Walk-on.
    if (!playerKind(u.kindId).returns) {
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
  const receiver = screen.players
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
export function catchRadius(s: PlayerUnit, quality: CatchQuality): number {
  return tuning.catch[quality] + s.stats.hands * tuning.catch.perHands;
}

/** A catch. A perfect one is a Clean Catch: the receiver can fend off one defender. */
function catchBall(
  state: RunState,
  s: PlayerUnit,
  quality: CatchQuality,
  events: SimEvent[],
): void {
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
  loseBall(state, events, (ballsLeft) => ({ type: 'fumble', reason, ballsLeft }));
}

/** Take a ball off the pile, report why, then reset the screen (or end the run on the last one). */
function loseBall(
  state: RunState,
  events: SimEvent[],
  lost: (ballsLeft: number) => SimEvent,
): void {
  state.balls = Math.max(0, state.balls - 1);
  events.push(lost(state.balls));
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
  const carrier = state.screen.players.find((s) => s.id === ball.by);
  if (!carrier?.alive || carrier.pos.y < END_ROW) return;
  state.screensCleared++;
  state.phase = 'cleared';
  events.push({ type: 'touchdown', id: carrier.id, yards: yards(state) });
}

/** If every player on the field is dead: lose a ball and restart the screen from setup. */
function checkWipeout(state: RunState, events: SimEvent[]): void {
  if (state.screen.players.some((s) => s.alive)) return;
  loseBall(state, events, (ballsLeft) => ({ type: 'wipeout', ballsLeft }));
}

function endRun(state: RunState, events: SimEvent[]): void {
  state.phase = 'over';
  state.screen.ball = { at: 'none' };
  events.push({ type: 'gameOver', yards: yards(state) });
}
