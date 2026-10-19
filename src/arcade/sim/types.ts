/**
 * The arcade simulation's types (GAMEPLAY.md, rewritten 2026-10-19). The
 * simulation is pure data: a RunState advanced one fixed step at a time by
 * step(), with actions between steps through dispatch(). Nothing here knows
 * about rendering or audio.
 *
 * Coordinates are yards: x across the field (0 is the middle, negative is
 * left), y upfield. Each drive starts its line of scrimmage at y = 0 and its
 * first-down line at y = 10. Times are seconds.
 */

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Hustle (speed), Hands (reach), Heft (weight). Small whole numbers around 0. */
export interface Stats {
  readonly hustle: number;
  readonly hands: number;
  readonly heft: number;
}

export type Role = 'qb' | 'blocker' | 'runner' | 'catcher';
export type Form = 'human' | 'golem' | 'werewolf' | 'ghost';
export type DefenderKind = 'rusher' | 'cover' | 'zone' | 'safety' | 'bat';

/** Everything that moves and collides: a circle with stats turned into physics. */
interface BodyBase {
  readonly id: number;
  pos: Vec;
  vel: Vec;
  readonly radius: number;
  readonly stats: Stats;
  /** From Heft. */
  readonly mass: number;
  /** From Hustle: top speed. */
  readonly speed: number;
  /** From Hands: how far it can reach for the ball. */
  readonly reach: number;
  /** Seconds left lying on the turf (0 = up). */
  down: number;
}

/** What one of your players is doing this down. */
export type Job =
  | { readonly kind: 'qb' }
  | { readonly kind: 'route'; readonly to: readonly Vec[]; index: number }
  | { readonly kind: 'block' }
  | { readonly kind: 'carry' };

export interface Player extends BodyBase {
  readonly side: 'team';
  readonly role: Role;
  /** Which roster player (0-6), or -1 for the QB. */
  readonly slot: number;
  readonly form: Form;
  job: Job;
}

export interface Defender extends BodyBase {
  readonly side: 'defense';
  readonly kind: DefenderKind;
  readonly planted: boolean;
  readonly home: Vec;
  /** The player a Cover marks (picked at the snap). */
  mark: number | null;
  /** A Bat's loop, and the corner it's heading for. */
  readonly patrol: readonly Vec[] | null;
  patrolIndex: number;
}

export type Body = Player | Defender;

/** A Witch sweeping across her row, wrapping at the sidelines. A pure pattern of time. */
export interface Witch {
  readonly id: number;
  readonly y: number;
  readonly startX: number;
  readonly dir: 1 | -1;
}

export type Ball =
  | { readonly at: 'qb' }
  | {
      readonly at: 'flight';
      readonly from: Vec;
      readonly target: Vec;
      /** When it was thrown and when it comes down (sim time). */
      readonly thrownAt: number;
      readonly landsAt: number;
    }
  | { readonly at: 'carried'; readonly by: number }
  | { readonly at: 'dead'; readonly pos: Vec; readonly how: DeadBall };

export type DeadBall = 'batted' | 'incomplete' | 'sacked' | 'tackled';

export interface Field {
  readonly players: Player[];
  readonly defenders: Defender[];
  readonly witches: readonly Witch[];
  ball: Ball;
  /** The carrier's lane: the x it steers for (set at the catch, moved by swipes). */
  lane: number;
}

export type DriveKind = 'intro' | 'challenge' | 'gimmick' | 'boss';

export interface Drive {
  readonly area: number;
  /** 0-3: Intro, Challenge, Gimmick, Boss. */
  readonly index: number;
  readonly kind: DriveKind;
  readonly name: string;
  /** Where the drive started (always 0) and the line it has to cross (10). */
  readonly start: number;
  readonly firstDown: number;
  down: number;
  /** The line of scrimmage (yards upfield). */
  los: number;
}

export type DownResult =
  'tackled' | 'incomplete' | 'batted' | 'sacked' | 'outOfBounds' | 'firstDown';

/** One of your seven players, for the whole run. */
export interface RosterPlayer {
  readonly role: Role;
  form: Form;
  training: Stats;
}

export type Phase = 'setup' | 'play' | 'downOver' | 'draft' | 'over' | 'won';

export interface RunState {
  readonly seed: number;
  /** Fixed steps since the run began, and the time they add up to. */
  step: number;
  time: number;
  phase: Phase;
  drive: Drive;
  /** This down's play (an index into PLAYS) and whether it's mirrored. */
  play: { readonly index: number; readonly flipped: boolean };
  roster: RosterPlayer[];
  field: Field;
  /** When this down was snapped (sim time). */
  snappedAt: number;
  /** Seconds left before the next down (in downOver). */
  pause: number;
  result: { readonly result: DownResult; readonly gained: number } | null;
  drivesWon: number;
  /** Net yards over the run. */
  yards: number;
  nextId: number;
}

/** What the player does on a step. */
export interface StepInput {
  /** Throw to this point, if the QB has the ball. */
  readonly throwAt?: Vec;
  /** A swipe: nudge the carrier's lane one step left (-1) or right (+1). */
  readonly steer?: -1 | 1;
}

export type Action =
  | { readonly type: 'snap' }
  /** Tap a Runner: hand it the ball (snapping first, if it's before the snap). */
  | { readonly type: 'handoff'; readonly id: number }
  | { readonly type: 'skipDraft' };

export type ThrowProblem = 'notInPlay' | 'noBall' | 'offField' | 'tooFar' | 'tooClose';

export type ArcadeEvent =
  | {
      readonly type: 'downStarted';
      readonly down: number;
      readonly toGo: number;
      readonly play: string;
    }
  | { readonly type: 'snapped' }
  | { readonly type: 'handoff'; readonly id: number }
  | { readonly type: 'thrown'; readonly target: Vec; readonly landsAt: number }
  | { readonly type: 'throwRejected'; readonly reason: ThrowProblem }
  | { readonly type: 'caught'; readonly id: number; readonly contested: boolean }
  | { readonly type: 'batted'; readonly by: number; readonly at: Vec }
  | { readonly type: 'incomplete'; readonly at: Vec }
  | { readonly type: 'pancake'; readonly blocker: number; readonly defender: number }
  | { readonly type: 'brokeTackle'; readonly id: number; readonly defender: number }
  | { readonly type: 'tackled'; readonly id: number; readonly by: number }
  | { readonly type: 'sacked'; readonly by: number }
  | { readonly type: 'outOfBounds'; readonly id: number }
  | { readonly type: 'downEnded'; readonly result: DownResult; readonly gained: number }
  | { readonly type: 'driveWon'; readonly drive: number }
  | { readonly type: 'driveStarted'; readonly drive: number; readonly name: string }
  | { readonly type: 'areaCleared'; readonly area: number }
  | { readonly type: 'gameOver'; readonly drivesWon: number; readonly yards: number };

export interface ArcadeResult {
  readonly state: RunState;
  readonly events: ArcadeEvent[];
}
