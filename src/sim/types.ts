/**
 * Simulation types. The simulation is pure data: a RunState advanced once per
 * tick by step(), with actions between ticks through dispatch() (TECHNICAL.md
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

/** Hustle / Hands / Heft. Small whole numbers around 0, which can go negative (GAMEPLAY.md, Checks). */
export interface Stats {
  readonly hustle: number;
  readonly hands: number;
  readonly heft: number;
}

/**
 * The three checks (sim/checks.ts): shaking a mark or a tackler (Hustle),
 * winning a contested catch (Hands), breaking a tackle (Heft).
 */
export type CheckKind = 'shake' | 'catch' | 'break';

/** What one of your players is: everyone starts human (content/roster.ts). */
export type Form = 'human' | 'ghost' | 'werewolf' | 'golem';

/** One of your four players, for the whole run (GAMEPLAY.md, Your Roster). */
export interface RosterPlayer {
  readonly name: string;
  form: Form;
  /** Stats gained from training, on top of the form's. */
  training: Stats;
  /** The safety net: failures in a row, per kind of check. */
  streak: Record<CheckKind, number>;
}

/** Your four players' forms as a hand (GAMEPLAY.md, Team Hands). */
export type TeamHand =
  | { readonly kind: 'mash' }
  | { readonly kind: 'finalGirls' }
  | { readonly kind: 'four'; readonly form: Form }
  | null;

/** A draft pick: a random human becomes a monster, or a random player trains a stat. */
export type DraftOffer =
  | { readonly kind: 'transform'; readonly form: Form }
  | { readonly kind: 'train'; readonly stat: keyof Stats };

interface UnitBase {
  readonly id: number;
  pos: Vec;
  readonly stats: Stats;
  /** Ticks left lying knocked down (0 = up). */
  downTicks: number;
  /** The tile this unit will hop to on its next hop tick: the hop-arrow telegraph. */
  intent: Vec | null;
}

export interface PlayerUnit extends UnitBase {
  readonly side: 'player';
  /** Which roster player this is (0-3, left to right as the play lines up). */
  readonly slot: number;
  readonly form: Form;
  /** Its route from the play card: one move per hop (content/cards.ts). */
  readonly route: string;
  /** How many of its route's moves it has used. */
  routeStep: number;
  /** Failed checks of these kinds are rolled again (its form's skill, or the team hand's). */
  readonly rerolls: readonly CheckKind[];
  /** Frenzy: after a success on these kinds, the next check of the kind gets an edge… */
  readonly frenzy: readonly CheckKind[];
  /** …and these have it waiting. */
  frenzyReady: CheckKind[];
}

export type DefenderKind = 'cover' | 'zone' | 'safety' | 'bat';

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

/** A hazard: a pure tick pattern (sim/hazards.ts). It has no state that changes. */
export interface Hazard {
  readonly id: number;
  readonly kind: HazardKind;
  /** The row it flies along. */
  readonly row: number;
  /** Its column on tick 0. */
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
  /** The down is over: the ball came down here, and how (the renderer bounces it differently). */
  | { readonly at: 'dead'; readonly pos: Vec; readonly how: DeadBall };

/** How a ball went dead: batted off a defender (or a hazard), landing with nobody there, or the QB sacked with it. */
export type DeadBall = 'blocked' | 'incomplete' | 'sacked';

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
  /** The down just ended; it stays on screen for a few ticks. */
  | 'downOver'
  /** A drive was won: pick a card. */
  | 'draft'
  /** A drive was lost: the run is over. */
  | 'over'
  /** Every drive of the last area was won. */
  | 'won';

export interface RunState {
  readonly seed: number;
  /** The global tick (the last tick step() resolved). It ticks in every phase, with the music, and never resets. */
  tick: number;
  phase: Phase;
  drive: DriveState;
  deck: Deck;
  /** The play called for this down (an index into the hand), and whether it's flipped. */
  called: { readonly hand: number; readonly flipped: boolean } | null;
  /** Your four players. */
  roster: RosterPlayer[];
  /** What the draft offers. */
  offer: DraftOffer[];
  screen: ScreenState;
  /** Ticks since the snap (in play). */
  downTick: number;
  /**
   * The pocket clock while the QB holds the ball on a pass play: ticks it
   * holds for, and ticks left. At zero it's a sack. Null otherwise. The
   * linemen and rushers are drawn from it (render/pocket.ts); they aren't units.
   */
  pocket: { readonly total: number; left: number } | null;
  /** Ticks left before the next down (in downOver). */
  pause: number;
  /** How the last down ended, and the yards it gained. */
  result: { readonly result: DownResult; readonly gained: number } | null;
  drivesWon: number;
  /** Net yards gained over the run. */
  yards: number;
  nextId: number;
}

/** Actions outside the tick: calling a play, the snap, the draft. Throws go to step() as BeatInput. */
export type Action =
  | { readonly type: 'call'; readonly hand: number }
  | { readonly type: 'flip' }
  | { readonly type: 'hike' }
  | { readonly type: 'draft'; readonly offer: number }
  | { readonly type: 'skipDraft' };

/** What the player does on a tick. */
export interface BeatInput {
  /** Throw the ball to this free point (tile units), if the QB has it. */
  readonly throwAt?: Vec;
}

/** Why a throw isn't allowed. The UI turns these into words. */
export type ThrowProblem = 'notInPlay' | 'noBall' | 'offField' | 'tooFar' | 'tooClose';

/** The result of a tick step or an action: the new state (the old one is untouched) and what happened. */
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
      readonly quality: CatchQuality;
      /** Whether it was won on a Hands check. */
      readonly contested: boolean;
    }
  /** A contested catch lost: the ball is knocked away. */
  | { readonly type: 'dropped'; readonly id: number; readonly by: number }
  /** A Hustle check won: a mark or a tackler shaken off. */
  | { readonly type: 'shook'; readonly id: number; readonly defender: number }
  /** A Heft check won: the tackler goes down instead. */
  | { readonly type: 'brokeTackle'; readonly id: number; readonly defender: number }
  | { readonly type: 'transformed'; readonly slot: number; readonly form: Form }
  | { readonly type: 'trained'; readonly slot: number; readonly stat: keyof Stats }
  /** A pass bounced off a defender (or a hazard). */
  | { readonly type: 'blocked'; readonly by: number; readonly at: Vec }
  | { readonly type: 'incomplete'; readonly at: Vec }
  | { readonly type: 'knockedDown'; readonly id: number }
  | { readonly type: 'tackled'; readonly id: number; readonly by: number }
  | { readonly type: 'sacked'; readonly by: number | null }
  | { readonly type: 'downEnded'; readonly result: DownResult; readonly gained: number }
  | { readonly type: 'driveWon'; readonly drive: number }
  | { readonly type: 'driveStarted'; readonly drive: number; readonly name: string }
  | { readonly type: 'gameOver'; readonly drivesWon: number; readonly yards: number }
  | { readonly type: 'areaCleared'; readonly area: number };
