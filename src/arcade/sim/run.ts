/**
 * Creating a run, setting up drives and downs, and the actions between
 * steps (the snap, moving on after a drive). Steps are advanced by step()
 * in step.ts. See GAMEPLAY.md, The Run, A Drive and A Down.
 */
import { FOREST, type DefenseSpec } from '../content/defense';
import { PLAYS } from '../content/plays';
import { ROSTER_ROLES } from '../content/team';
import { arcadeTuning } from '../content/tuning';
import { rngFor } from './random';
import { assignMarks } from './ai';
import { lineUpDefense, lineUpTeam } from './bodies';
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

/** Seven plain humans: 2 Blockers, 2 Runners, 3 Catchers. */
export function startingRoster(): RosterPlayer[] {
  return ROSTER_ROLES.map((role) => ({
    role,
    form: 'human',
    training: { hustle: 0, hands: 0, heft: 0 },
  }));
}

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
    play: { index: 0, flipped: false },
    roster,
    field: { players: [], defenders: [], witches: [], ball: { at: 'qb' }, lane: 0 },
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

/** Line up the next down: a random play (randomly mirrored), both teams in place, waiting for the snap. */
export function setUpDown(state: RunState, events: ArcadeEvent[]): void {
  const { drive } = state;
  const rng = rngFor(state.seed, 'play', state.drivesWon, drive.down, state.nextId);
  state.play = { index: rng.int(0, PLAYS.length - 1), flipped: rng.next() < 0.5 };
  const play = PLAYS[state.play.index] ?? PLAYS[0];
  if (!play) throw new Error('No plays defined');
  const players = lineUpTeam(state.roster, play, state.play.flipped, drive.los, state.nextId);
  state.nextId += players.length;
  const spec = defenseFor(state.seed, drive.area, drive.index);
  const boost = defenseBoost(drive.area, drive.kind, spec);
  const defenders = lineUpDefense(spec, drive, boost, state.nextId);
  state.nextId += defenders.length;
  state.field = { players, defenders, witches: state.field.witches, ball: { at: 'qb' }, lane: 0 };
  state.phase = 'setup';
  state.result = null;
  events.push({
    type: 'downStarted',
    down: drive.down,
    toGo: drive.firstDown - drive.los,
    play: play.name,
  });
}

/** Apply an action between steps. Pure, like step(). Invalid actions change nothing. */
export function dispatch(prev: RunState, action: Action): ArcadeResult {
  const state = structuredClone(prev);
  const events: ArcadeEvent[] = [];
  switch (action.type) {
    case 'snap':
      snap(state, events);
      break;
    case 'skipDraft':
      if (state.phase === 'draft') state.phase = 'setup';
      break;
  }
  return { state, events };
}

/** The snap: Covers pick their marks; a handoff play gives its Runner the ball. */
function snap(state: RunState, events: ArcadeEvent[]): void {
  if (state.phase !== 'setup') return;
  state.phase = 'play';
  state.snappedAt = state.time;
  assignMarks(state);
  events.push({ type: 'snapped' });
  const play = PLAYS[state.play.index];
  const runner =
    play?.handoff !== undefined
      ? state.field.players.find((p) => p.slot === play.handoff)
      : undefined;
  if (runner) {
    runner.job = { kind: 'carry' };
    state.field.ball = { at: 'carried', by: runner.id };
    state.field.lane = runner.pos.x;
    events.push({ type: 'handoff', id: runner.id });
  }
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
    if (lastDrive) setUpDrive(state, drive.area + 1, 0, events, false);
    else setUpDrive(state, drive.area, drive.index + 1, events, false);
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
