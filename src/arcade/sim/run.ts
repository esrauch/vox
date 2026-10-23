/**
 * Creating a run, setting up drives and downs, and the actions between
 * steps (the snap, moving on after a drive). Steps are advanced by step()
 * in step.ts. See GAMEPLAY.md, The Run, A Drive and A Down.
 */
import { FOREST, type DefenseSpec } from '../content/defense';
import { PLAYS } from '../content/plays';
import { arcadeTuning } from '../content/tuning';
import { rngFor } from './random';
import { assignMarks } from './ai';
import { plus } from './stats';
import { lineUpDefense, lineUpTeam } from './bodies';
import { BENCH_SIZE } from '../content/team';
import {
  BENCH_START,
  applyPerk,
  atSpot,
  noPerks,
  rollOffer,
  setSpot,
  startingRoster,
} from './team';
import type {
  Action,
  ArcadeEvent,
  ArcadeResult,
  DownResult,
  DriveKind,
  RosterPlayer,
  RunState,
  Witch,
} from './types';

export const DRIVE_KINDS: readonly DriveKind[] = ['intro', 'challenge', 'gimmick', 'boss'];

/** Seven plain humans (sim/team.ts). */
export { startingRoster };

/** The defense for a drive: the area's Intro, Challenge, a seeded Gimmick, or its Boss. */
export function defenseFor(seed: number, area: number, index: number): DefenseSpec {
  switch (DRIVE_KINDS[index]) {
    case 'intro':
      return FOREST.intro;
    case 'challenge':
      return FOREST.challenge;
    case 'gimmick':
      return rngFor(seed, 'gimmick', area).pick(FOREST.gimmicks);
    default:
      return FOREST.boss;
  }
}

/** How much stiffer a drive's defense is than its spec: more each area, more on the Boss. */
export function defenseBoost(area: number, kind: DriveKind, spec: DefenseSpec): number {
  const d = arcadeTuning.defense;
  return area * d.perArea + (kind === 'boss' ? d.boss : 0) + spec.boost;
}

export function createRun(seed: number, roster: RosterPlayer[] = startingRoster()): RunState {
  const state: RunState = {
    seed,
    step: 0,
    time: 0,
    phase: 'setup',
    drive: { area: 0, index: 0, kind: 'intro', name: '', start: 0, firstDown: 0, down: 1, los: 0 },
    hand: [],
    called: null,
    flipped: false,
    play: { index: 0, flipped: false },
    tackle: null,
    roster,
    bench: [],
    perks: noPerks(),
    offer: [],
    recruit: null,
    field: { players: [], defenders: [], witches: [], ball: { at: 'qb' }, lane: 0, drag: null },
    snappedAt: 0,
    pause: 0,
    result: null,
    drivesWon: 0,
    yards: 0,
    nextId: 1,
  };
  setUpDrive(state, 0, 0, [], true);
  return state;
}

/**
 * Start a drive: the line of scrimmage at 0, 1st & 10, the defense lined up.
 * With `ready`, the first down is set up straight away; without, it waits
 * for the player to move on (after a won drive: the upgrade pick comes first).
 */
export function setUpDrive(
  state: RunState,
  area: number,
  index: number,
  events: ArcadeEvent[],
  ready: boolean,
): void {
  const spec = defenseFor(state.seed, area, index);
  const start = 0;
  state.perks.secondWindUsed = false;
  state.drive = {
    area,
    index,
    kind: DRIVE_KINDS[index] ?? 'boss',
    name: spec.name,
    start,
    firstDown: start + arcadeTuning.drive.distance,
    down: 1,
    los: start,
  };
  state.field = { ...state.field, witches: witches(state, spec) };
  events.push({ type: 'driveStarted', drive: index, name: spec.name });
  setUpDown(state, events);
  if (!ready) state.phase = 'draft';
}

/** A drive's Witches, each on its own row between the line and the first-down line. */
function witches(state: RunState, spec: DefenseSpec): Witch[] {
  const rng = rngFor(state.seed, 'witches', state.drivesWon);
  const hw = arcadeTuning.field.halfWidth;
  return Array.from({ length: spec.witches }, (_, i) => ({
    id: state.nextId++,
    y: 3 + i * 3 + rng.next() * 2,
    startX: -hw + rng.next() * 2 * hw,
    dir: rng.next() < 0.5 ? 1 : -1,
  }));
}

/** How many play cards are dealt each down. */
const HAND = 3;

/**
 * Line up the next down: three play cards dealt at random, both teams in
 * place (the line-up is the same for every play), waiting for the call.
 */
export function setUpDown(state: RunState, events: ArcadeEvent[]): void {
  const { drive } = state;
  const rng = rngFor(state.seed, 'hand', state.drivesWon, drive.down, state.nextId);
  const deck = PLAYS.map((_, i) => i);
  state.hand = [];
  while (state.hand.length < Math.min(HAND, PLAYS.length)) {
    state.hand.push(deck.splice(rng.int(0, deck.length - 1), 1)[0] ?? 0);
  }
  state.called = null;
  state.play = { index: state.hand[0] ?? 0, flipped: state.flipped };
  const play = PLAYS[state.play.index] ?? PLAYS[0];
  if (!play) throw new Error('No plays defined');
  const players = lineUpTeam(state, play, state.flipped, drive.los, state.nextId);
  state.nextId += players.length;
  const spec = defenseFor(state.seed, drive.area, drive.index);
  const boost = defenseBoost(drive.area, drive.kind, spec);
  const defenders = lineUpDefense(spec, drive, boost, state.nextId);
  state.nextId += defenders.length;
  state.field = {
    players,
    defenders,
    witches: state.field.witches,
    ball: { at: 'qb' },
    lane: 0,
    drag: null,
  };
  state.phase = 'setup';
  state.result = null;
  state.tackle = null;
  events.push({ type: 'downStarted', down: drive.down, toGo: drive.firstDown - drive.los });
}

/** Apply an action between steps. Pure, like step(). Invalid actions change nothing. */
export function dispatch(prev: RunState, action: Action): ArcadeResult {
  const state = structuredClone(prev);
  const events: ArcadeEvent[] = [];
  switch (action.type) {
    case 'call':
      call(state, action.hand, events);
      break;
    case 'flip':
      if (state.phase !== 'setup') break;
      state.flipped = !state.flipped;
      // A called play is mirrored where it stands.
      if (state.called !== null) call(state, state.called, events);
      break;
    case 'hike':
      hike(state, events);
      break;
    case 'skipDraft':
      if (state.phase === 'draft') leaveDraft(state);
      break;
    case 'pick':
      pick(state, action.offer, events);
      break;
    case 'place':
      place(state, action.slot, events);
      break;
    case 'swap':
      swap(state, action.a, action.b);
      break;
  }
  return { state, events };
}

/**
 * Call a play card (mirrored if Flip is on): your players take its
 * assignments where they stand, so its routes show on the field. Another
 * card can still be called instead, until the hike.
 */
function call(state: RunState, hand: number, events: ArcadeEvent[]): void {
  const index = state.hand[hand];
  const play = index === undefined ? undefined : PLAYS[index];
  if (state.phase !== 'setup' || index === undefined || !play) return;
  state.called = hand;
  state.play = { index, flipped: state.flipped };
  const firstId = state.field.players[0]?.id ?? state.nextId;
  state.field.players.splice(
    0,
    state.field.players.length,
    ...lineUpTeam(state, play, state.flipped, state.drive.los, firstId),
  );
  events.push({ type: 'called', play: play.name, flipped: state.flipped });
}

/** The hike: the called play starts, Covers pick their marks, and a handoff play gives its Runner the ball. */
function hike(state: RunState, events: ArcadeEvent[]): void {
  const play = PLAYS[state.play.index];
  if (state.phase !== 'setup' || state.called === null || !play) return;
  state.phase = 'play';
  state.snappedAt = state.time;
  assignMarks(state);
  events.push({ type: 'snapped' });
  const runner =
    play.handoff === undefined
      ? undefined
      : state.field.players.find((p) => p.slot === play.handoff);
  if (!runner) return;
  const hole = runner.job.kind === 'route' ? runner.job.to[runner.job.to.length - 1] : undefined;
  runner.job = { kind: 'carry' };
  state.field.ball = { at: 'carried', by: runner.id };
  state.field.lane = hole?.x ?? runner.pos.x;
  events.push({ type: 'handoff', id: runner.id });
}

// ── TRICK OR TREAT! ─────────────────────────────────────────────────────────

/**
 * Take a perk on offer. A recruit takes a seat on the bench and the roster
 * stays open (swap it in, then Done); with the bench full it waits for you to
 * choose who it replaces.
 */
function pick(state: RunState, index: number, events: ArcadeEvent[]): void {
  const perk = state.offer[index];
  if (state.phase !== 'draft' || state.recruit || !perk) return;
  events.push({ type: 'perk', perk });
  if (perk.kind === 'recruit') {
    state.offer = [];
    if (state.bench.length < BENCH_SIZE) {
      state.bench.push(perk.player);
      events.push({
        type: 'joined',
        name: perk.player.name,
        slot: BENCH_START + state.bench.length - 1,
        replaced: null,
      });
    } else {
      state.recruit = perk.player;
    }
    return;
  }
  if (perk.kind === 'playerStat') {
    // The boost is the player's own, wherever it plays from now on.
    const p = atSpot(state, perk.spot);
    if (p)
      setSpot(state, perk.spot, {
        ...p,
        stats: plus(p.stats, perk.boost),
      });
  } else {
    applyPerk(state.perks, perk);
  }
  leaveDraft(state);
}

/** The bench is full: put the recruit in a spot (field or bench); whoever was there leaves. */
function place(state: RunState, slot: number, events: ArcadeEvent[]): void {
  const recruit = state.recruit;
  const replaced = atSpot(state, slot);
  if (state.phase !== 'draft' || !recruit || !replaced) return;
  setSpot(state, slot, recruit);
  state.recruit = null;
  events.push({ type: 'joined', name: recruit.name, slot, replaced: replaced.name });
  relineTeam(state);
}

/** Swap two players' spots, field or bench (any player can play any position). */
function swap(state: RunState, a: number, b: number): void {
  const pa = atSpot(state, a);
  const pb = atSpot(state, b);
  if (state.phase !== 'draft' || state.recruit || !pa || !pb || a === b) return;
  setSpot(state, a, pb);
  setSpot(state, b, pa);
  // A stat boost on offer follows its player to the new spot.
  state.offer = state.offer.map((o) =>
    o.kind !== 'playerStat' ? o : { ...o, spot: o.spot === a ? b : o.spot === b ? a : o.spot },
  );
  relineTeam(state);
}

/** On to the next drive (its defense is already lined up): your team, as it now is, lines up too. */
function leaveDraft(state: RunState): void {
  state.offer = [];
  state.recruit = null;
  state.phase = 'setup';
  relineTeam(state);
}

/** Line your players up again where they stand, with the roster and perks as they now are. */
function relineTeam(state: RunState): void {
  const play = PLAYS[state.play.index];
  const firstId = state.field.players[0]?.id;
  if (!play || firstId === undefined) return;
  state.field.players.splice(
    0,
    state.field.players.length,
    ...lineUpTeam(state, play, state.flipped, state.drive.los, firstId),
  );
}

/** End the down: move the line of scrimmage, and show what happened for a moment. */
export function endDown(
  state: RunState,
  result: DownResult,
  newLos: number,
  events: ArcadeEvent[],
): void {
  const { drive } = state;
  const wanted = result === 'firstDown' ? Math.max(newLos, drive.firstDown) : newLos;
  // Never behind the drive's start (there's no room for the QB).
  const los = Math.max(drive.start, wanted);
  const gained = los - drive.los;
  drive.los = los;
  state.yards += gained;
  state.result = { result, gained };
  state.phase = 'downOver';
  state.pause = arcadeTuning.drive.pause;
  events.push({ type: 'downEnded', result, gained });
}

/** After a finished down: a won drive moves on (or wins the run), a 4th-down failure ends it, otherwise the next down. */
export function nextDown(state: RunState, events: ArcadeEvent[]): void {
  const { drive, result } = state;
  if (result?.result === 'firstDown') {
    state.drivesWon++;
    events.push({ type: 'driveWon', drive: drive.index });
    const lastDrive = drive.index >= DRIVE_KINDS.length - 1;
    if (lastDrive) events.push({ type: 'areaCleared', area: drive.area });
    if (lastDrive && drive.area >= arcadeTuning.run.areas - 1) {
      state.phase = 'won';
      return;
    }
    // TRICK OR TREAT! happens in front of the next drive, already lined up (its zone sets the offer).
    if (lastDrive) setUpDrive(state, drive.area + 1, 0, events, false);
    else setUpDrive(state, drive.area, drive.index + 1, events, false);
    state.offer = rollOffer(state);
    return;
  }
  if (drive.down >= arcadeTuning.drive.downs) {
    state.phase = 'over';
    events.push({ type: 'gameOver', drivesWon: state.drivesWon, yards: state.yards });
    return;
  }
  drive.down++;
  setUpDown(state, events);
}

/** Down and distance, e.g. "3rd & 4", or "3rd & Goal" on the Boss drive. Yards round up. */
export function downAndDistance(state: RunState): string {
  const { down, firstDown, los, kind } = state.drive;
  const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1] ?? `${down}th`;
  return `${ordinal} & ${kind === 'boss' ? 'Goal' : Math.max(1, Math.ceil(firstDown - los))}`;
}
