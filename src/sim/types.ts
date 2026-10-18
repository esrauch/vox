/**
 * Simulation types. The simulation is pure data: a RunState advanced once per
 * beat by step(), with actions between beats through dispatch() (TECHNICAL.md
 * §3). Nothing here knows about rendering or audio.
 *
 * Coordinates: x is the column (0 = left), y is the row (0 = bottom, nearest
 * the camera). Your team plays up the field, toward higher rows.
 *
 * The rules are GAMEPLAY.md's core loop: areas of four drives; a drive is
 * four downs to gain 10 yards; each down you call a play card and throw.
 */

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Hustle / Hands / Heft. Whole numbers from 0 (GAMEPLAY.md, How the Attributes Show Up). */
export interface Stats {
  readonly hustle: number;
  readonly hands: number;
  readonly heft: number;
}

interface UnitBase {
  readonly id: number;
  pos: Vec;
  readonly stats: Stats;
  /** Beats left lying knocked down (0 = up). */
  downBeats: number;
  /** The tile this unit will hop to on its next hop beat: the hop-arrow telegraph. */
  intent: Vec | null;
}

export interface PlayerUnit extends UnitBase {
  readonly side: 'player';
  readonly kindId: string;
  /** Its route from the play card: one move per hop (content/cards.ts). */
  readonly route: string;
  /** How many of its route's moves it has used. */
  routeStep: number;
  /** Tackles this player can still break (from a Clean Catch). */
  fendOff: number;
}

export type DefenderKind = 'cover' | 'zone' | 'blitzer' | 'safety' | 'bat';

export interface Defender extends UnitBase {
  readonly side: 'defender';
  readonly kind: DefenderKind;
  /** Where it lined up for this down. */
  readonly home: Vec;
  /** The circuit a patrolling defender loops (a 4×4 box), or null. */
  readonly patrol: readonly Vec[] | null;
  /** Which tile of the patrol it's on. */
  patrolIndex: number;
  /** The player a Cover is marking (chosen at the snap), or null. */
  marking: number | null;
}

export type Unit = PlayerUnit | Defender;

export type HazardKind = 'witch';

/** A hazard: a pure beat pattern (sim/hazards.ts). It has no state that changes. */
export interface Hazard {
  readonly id: number;
  readonly kind: HazardKind;
  /** The row it flies along. */
  readonly row: number;
  /** Its column on beat 0. */
  readonly startX: number;
  /** Which way it flies: +1 is right, -1 is left. */
  readonly dir: 1 | -1;
}

export type BallState =
  | { readonly at: 'qb' }
  | {
      readonly at: 'flight';
      /** Where it was thrown from (the QB's tile). */
      readonly from: Vec;
      readonly target: Vec;
      readonly releasedOn: number;
      readonly landsOn: number;
    }
  | { readonly at: 'carried'; readonly by: number }
  /** The down is over: the ball lies (or bounced) here. */
  | { readonly at: 'dead'; readonly pos: Vec; readonly bounced: boolean };

export interface ScreenState {
  readonly players: PlayerUnit[];
  readonly defenders: Defender[];
  readonly hazards: readonly Hazard[];
  ball: BallState;
  /** Where the QB stands this down: a little behind the line of scrimmage. */
  readonly qb: Vec;
}

export type DriveKind = 'intro' | 'challenge' | 'gimmick' | 'boss';

export interface DriveState {
  /** Which area of the run (0-based). */
  readonly area: number;
  /** Which drive of the area (0-3): intro, challenge, gimmick, boss. */
  readonly index: number;
  readonly kind: DriveKind;
  /** The defense's name, for the drive banner. */
  readonly name: string;
  /** The row the drive started on, and the first-down line it has to cross. */
  readonly start: number;
  readonly firstDown: number;
  /** 1 to 4. */
  down: number;
  /** The line of scrimmage for this down (a row). */
  los: number;
}

/** How a down ended. */
export type DownResult = 'tackled' | 'incomplete' | 'blocked' | 'sacked' | 'firstDown';

export interface Deck {
  /** Every card in the run's deck. */
  owned: string[];
  draw: string[];
  discard: string[];
  /** The cards drawn for this down. */
  hand: string[];
}

export type Phase =
  /** Before the snap: call a play. */
  | 'setup'
  | 'play'
  /** The down just ended; it stays on screen for a few beats. */
  | 'downOver'
  /** A drive was won: pick a card. */
  | 'draft'
  /** A drive was lost: the run is over. */
  | 'over'
  /** Every drive of the last area was won. */
  | 'won';

export interface RunState {
  readonly seed: number;
  /** The global beat (the last beat step() resolved). It ticks in every phase, with the music, and never resets. */
  beat: number;
  phase: Phase;
  drive: DriveState;
  deck: Deck;
  /** The play called for this down (an index into the hand), and whether it's flipped. */
  called: { readonly hand: number; readonly flipped: boolean } | null;
  /** Cards offered in the draft. */
  offer: string[];
  screen: ScreenState;
  /** Beats since the snap (in play). */
  downBeat: number;
  /** Beats left before the next down (in downOver). */
  pause: number;
  /** How the last down ended, and the yards it gained. */
  result: { readonly result: DownResult; readonly gained: number } | null;
  drivesWon: number;
  /** Net yards gained over the run. */
  yards: number;
  nextId: number;
}

/** Actions outside the beat: calling a play, the snap, the draft. Throws go to step() as BeatInput. */
export type Action =
  | { readonly type: 'call'; readonly hand: number }
  | { readonly type: 'flip' }
  | { readonly type: 'hike' }
  | { readonly type: 'draft'; readonly offer: number }
  | { readonly type: 'remove'; readonly owned: number }
  | { readonly type: 'skipDraft' };

/** What the player does on a beat. */
export interface BeatInput {
  /** Throw the ball to this free point (tile units), if the QB has it. */
  readonly throwAt?: Vec;
}

/** Why a throw isn't allowed. The UI turns these into words. */
export type ThrowProblem = 'notInPlay' | 'noBall' | 'offField' | 'tooFar' | 'tooClose';

/** The result of a beat step or an action: the new state (the old one is untouched) and what happened. */
export interface SimResult {
  readonly state: RunState;
  readonly events: SimEvent[];
}

/** How close the receiver was to where the ball came down. A perfect catch is a Clean Catch. */
export type CatchQuality = 'perfect' | 'good' | 'ok';

/** Everything that happened during a step or action, for the renderer, audio and tests. */
export type SimEvent =
  | { readonly type: 'downStarted'; readonly down: number; readonly toGo: number }
  | { readonly type: 'called'; readonly card: string; readonly flipped: boolean }
  | { readonly type: 'hiked' }
  | { readonly type: 'hop'; readonly id: number; readonly from: Vec; readonly to: Vec }
  | { readonly type: 'thrown'; readonly target: Vec; readonly landsOn: number }
  | { readonly type: 'throwRejected'; readonly target: Vec; readonly reason: ThrowProblem }
  | {
      readonly type: 'caught';
      readonly id: number;
      readonly clean: boolean;
      readonly quality: CatchQuality;
    }
  /** A pass bounced off a defender (or a hazard). */
  | { readonly type: 'blocked'; readonly by: number; readonly at: Vec }
  | { readonly type: 'incomplete'; readonly at: Vec }
  | { readonly type: 'fendedOff'; readonly id: number; readonly defender: number }
  | { readonly type: 'knockedDown'; readonly id: number }
  | { readonly type: 'tackled'; readonly id: number; readonly by: number }
  | { readonly type: 'sacked'; readonly by: number | null }
  | { readonly type: 'downEnded'; readonly result: DownResult; readonly gained: number }
  | { readonly type: 'driveWon'; readonly drive: number }
  | { readonly type: 'driveStarted'; readonly drive: number; readonly name: string }
  | { readonly type: 'gameOver'; readonly drivesWon: number; readonly yards: number }
  | { readonly type: 'areaCleared'; readonly area: number };
