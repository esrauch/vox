/**
 * Creating a run, setting up drives and downs, and the actions between ticks
 * (calling a play, Flip, the snap, the draft). Beats are advanced by step()
 * in step.ts. See GAMEPLAY.md, The Run, A Drive and A Down.
 */
import { DRAFT_POOL, STARTER_DECK, playCard } from '../content/cards';
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { assignMarks, updateIntents } from './ai';
import {
  DRIVE_KINDS,
  defenseFor,
  driveHazards,
  formation,
  lineUpDefense,
  pocketTicks,
  qbTile,
} from './drive';
import { END_ROW } from './grid';
import { createRng, deriveSeed } from './rng';
import type { Action, DownResult, RunState, SimEvent, SimResult } from './types';

export function createRun(seed: number): RunState {
  const state: RunState = {
    seed,
    tick: 0,
    phase: 'setup',
    drive: {
      area: 0,
      index: 0,
      kind: 'intro',
      name: '',
      start: 0,
      firstDown: 0,
      down: 1,
      los: 0,
    },
    deck: { owned: [...STARTER_DECK], draw: [], discard: [], hand: [] },
    called: null,
    offer: [],
    screen: { players: [], defenders: [], hazards: [], ball: { at: 'qb' }, qb: qbTile(0) },
    downTick: 0,
    pocket: null,
    pause: 0,
    result: null,
    drivesWon: 0,
    yards: 0,
    nextId: 1,
  };
  setUpDrive(state, 0, 0, []);
  return state;
}

/** Start a drive: a fresh shuffle of the deck, the line of scrimmage at the start row, 1st & 10. */
export function setUpDrive(state: RunState, area: number, index: number, events: SimEvent[]): void {
  const spec = defenseFor(state.seed, area, index);
  const start = tuning.drive.startRow;
  const firstDown = Math.min(END_ROW, start + tuning.drive.distance);
  state.drive = {
    area,
    index,
    kind: DRIVE_KINDS[index] ?? 'boss',
    name: spec.name,
    start,
    firstDown,
    down: 1,
    los: start,
  };
  state.deck.draw = shuffle(state, [...state.deck.owned]);
  state.deck.discard = [];
  state.deck.hand = [];
  const hazards = driveHazards(state.seed, state.drivesWon, spec, start, firstDown, state.nextId);
  state.nextId += hazards.length;
  state.screen = { ...state.screen, hazards };
  events.push({ type: 'driveStarted', drive: index, name: spec.name });
  setUpDown(state, events);
}

/** Line up the next down: the defense against the line of scrimmage, a fresh hand of three cards. */
export function setUpDown(state: RunState, events: SimEvent[]): void {
  const { drive } = state;
  const spec = defenseFor(state.seed, drive.area, drive.index);
  const defenders = lineUpDefense(spec, drive.los, drive.firstDown, state.nextId);
  state.nextId += defenders.length;
  state.screen = {
    players: [],
    defenders,
    hazards: state.screen.hazards,
    ball: { at: 'qb' },
    qb: qbTile(drive.los),
  };
  state.called = null;
  state.result = null;
  state.downTick = 0;
  state.pocket = null;
  state.phase = 'setup';
  drawHand(state);
  updateIntents(state.screen);
  events.push({ type: 'downStarted', down: drive.down, toGo: drive.firstDown - drive.los });
}

function drawHand(state: RunState): void {
  const { deck } = state;
  deck.hand = [];
  for (let i = 0; i < tuning.cards.handSize; i++) {
    if (deck.draw.length === 0) {
      deck.draw = shuffle(state, deck.discard);
      deck.discard = [];
    }
    const card = deck.draw.shift();
    if (card) deck.hand.push(card);
  }
}

/** A seeded shuffle (Fisher–Yates). Salted with nextId so every shuffle in a run differs. */
function shuffle(state: RunState, cards: string[]): string[] {
  const rng = createRng(deriveSeed(state.seed, 'shuffle', state.nextId++));
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j] as string, out[i] as string];
  }
  return out;
}

/**
 * Apply an action between ticks. Pure, like step(): returns the new state
 * and what happened. Invalid actions change nothing.
 */
export function dispatch(prev: RunState, action: Action): SimResult {
  const state = structuredClone(prev);
  return { state, events: apply(state, action) };
}

function apply(state: RunState, action: Action): SimEvent[] {
  switch (action.type) {
    case 'call':
      return call(state, action.hand, false);
    case 'flip':
      return state.called ? call(state, state.called.hand, !state.called.flipped) : [];
    case 'hike':
      return hike(state);
    case 'draft':
      return draft(state, action.offer);
    case 'remove':
      return removeCard(state, action.owned);
    case 'skipDraft':
      return state.phase === 'draft' ? nextDrive(state) : [];
  }
}

/** Call a play from the hand: your players line up for it, routes and all. */
function call(state: RunState, hand: number, flipped: boolean): SimEvent[] {
  const card = state.deck.hand[hand];
  if (state.phase !== 'setup' || !card) return [];
  state.called = { hand, flipped };
  const players = formation(card, flipped, state.drive.los, state.nextId);
  state.nextId += players.length;
  state.screen = { ...state.screen, players };
  updateIntents(state.screen);
  return [{ type: 'called', card, flipped }];
}

/** The snap: the hand goes to the discard pile, Covers pick their marks, a handoff gives the runner the ball. */
function hike(state: RunState): SimEvent[] {
  const called = state.called;
  if (state.phase !== 'setup' || !called) return [];
  const card = playCard(state.deck.hand[called.hand] ?? '');
  state.deck.discard.push(...state.deck.hand);
  state.deck.hand = [];
  state.phase = 'play';
  state.downTick = 0;
  assignMarks(state.screen);
  const runner = card.handoff !== undefined ? state.screen.players[card.handoff] : undefined;
  if (runner) {
    state.screen.ball = { at: 'carried', by: runner.id };
    // The line ties the rush up for a while, so the runner can get going.
    state.pocket = { total: tuning.pocket.runHold, left: tuning.pocket.runHold, run: true };
  } else {
    // A pass play: the pocket clock starts. Players left home to block buy time.
    const blockers = state.screen.players.filter((p) => /^[.]*$/.test(p.route)).length;
    const blitzers = state.screen.defenders.filter((d) => DEFENDERS[d.kind].job === 'rush').length;
    const total = pocketTicks(blockers, blitzers);
    state.pocket = { total, left: total };
  }
  updateIntents(state.screen);
  return [{ type: 'hiked' }];
}

/**
 * End the down: move the line of scrimmage and show what happened for a few
 * ticks (step() then calls nextDown).
 */
export function endDown(
  state: RunState,
  result: DownResult,
  newLos: number,
  events: SimEvent[],
): void {
  const { drive } = state;
  const wanted = result === 'firstDown' ? Math.max(newLos, drive.firstDown) : newLos;
  // Never behind the drive's starting line (there's no room for the QB), never off the field.
  const los = Math.max(drive.start, Math.min(END_ROW, wanted));
  const gained = los - drive.los;
  drive.los = los;
  state.yards += gained;
  state.result = { result, gained };
  state.phase = 'downOver';
  state.pause = tuning.drive.pauseTicks;
  for (const u of [...state.screen.players, ...state.screen.defenders]) u.intent = null;
  events.push({ type: 'downEnded', result, gained });
}

/** After a finished down: a won drive goes to the draft, a 4th-down failure ends the run, otherwise the next down. */
export function nextDown(state: RunState, events: SimEvent[]): void {
  const { drive, result } = state;
  if (result?.result === 'firstDown') {
    state.drivesWon++;
    events.push({ type: 'driveWon', drive: drive.index });
    if (drive.index >= DRIVE_KINDS.length - 1) {
      state.phase = 'won';
      events.push({ type: 'areaCleared', area: drive.area });
      return;
    }
    state.phase = 'draft';
    state.offer = draftOffer(state);
    return;
  }
  if (drive.down >= tuning.drive.downs) {
    state.phase = 'over';
    events.push({ type: 'gameOver', drivesWon: state.drivesWon, yards: state.yards });
    return;
  }
  drive.down++;
  setUpDown(state, events);
}

function draftOffer(state: RunState): string[] {
  const rng = createRng(deriveSeed(state.seed, 'draft', state.drivesWon));
  const pool = [...DRAFT_POOL];
  const offer: string[] = [];
  while (offer.length < tuning.cards.draftOffer && pool.length > 0) {
    offer.push(pool.splice(rng.int(0, pool.length - 1), 1)[0] as string);
  }
  return offer;
}

function draft(state: RunState, offer: number): SimEvent[] {
  const card = state.offer[offer];
  if (state.phase !== 'draft' || !card) return [];
  state.deck.owned.push(card);
  return nextDrive(state);
}

/** Thin the deck instead of adding to it (never below one hand). */
function removeCard(state: RunState, owned: number): SimEvent[] {
  if (state.phase !== 'draft' || state.deck.owned.length <= tuning.cards.handSize) return [];
  if (owned < 0 || owned >= state.deck.owned.length) return [];
  state.deck.owned.splice(owned, 1);
  return nextDrive(state);
}

function nextDrive(state: RunState): SimEvent[] {
  const events: SimEvent[] = [];
  state.offer = [];
  setUpDrive(state, state.drive.area, state.drive.index + 1, events);
  return events;
}

/** Rows (half-yards) as yards, e.g. 9 → "4½". */
export function yardsText(rows: number): string {
  const sign = rows < 0 ? '-' : '';
  const r = Math.abs(rows);
  const whole = Math.floor(r / 2);
  return `${sign}${whole === 0 && r % 2 ? '' : whole}${r % 2 ? '½' : ''}`;
}

/** Down and distance, e.g. "3rd & 4½". */
export function downAndDistance(state: RunState): string {
  const { down, firstDown, los } = state.drive;
  const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1] ?? `${down}th`;
  return `${ordinal} & ${yardsText(firstDown - los)}`;
}
