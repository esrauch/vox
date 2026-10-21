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
  /** Hanging on to the carrier, at this offset from it (null when it isn't). */
  latch: Vec | null;
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
  /** The carrier's lane: the x it runs for (it picks the emptiest one itself, every moment). */
  lane: number;
  /** A carrier dragging tacklers after a close Break it!: it goes down when it reaches this row. */
  drag: { readonly to: number } | null;
}

/**
 * Break it! (GAMEPLAY.md): a defender has grabbed the carrier and the play
 * is frozen for one of three quick tests, picked at random. Each ends in a
 * break, a drag (`dragYards`), or a tackle (sim/breakit.ts).
 *
 * - **bar:** a marker crosses a meter once; tap in `sweet` (never in the
 *   first third of its trip) to break, within `near` of it to drag. `sweet`
 *   is measured along the trip; `dir` is which way it runs on screen.
 * - **mash:** tap as fast as you can: every tap adds `perTap` to `fill`;
 *   full breaks it, half full by the end drags.
 * - **juke:** at `showAt` (the end of the countdown) an arrow points to
 *   `side`; tap that side within `window` (the first half breaks, the rest
 *   drags). The wrong side, or too late, is a tackle.
 *
 * Each opens with a countdown (tuning.breakit.ready), when taps don't count.
 */
export type Tackle = {
  readonly startedAt: number;
  readonly tacklers: readonly number[];
  /** Yards a drag gets. */
  readonly dragYards: number;
} & (
  | {
      readonly kind: 'bar';
      readonly dir: 1 | -1;
      readonly sweet: { readonly from: number; readonly to: number };
      readonly near: number;
    }
  | { readonly kind: 'mash'; fill: number; readonly perTap: number }
  | {
      readonly kind: 'juke';
      readonly showAt: number;
      readonly side: 1 | -1;
      readonly window: number;
    }
);

export type BreakKind = Tackle['kind'];

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

export type Phase =
  | 'setup'
  | 'play'
  /** Break it!: the play is frozen while you time the tap. */
  | 'breakit'
  | 'downOver'
  | 'draft'
  | 'over'
  | 'won';

export interface RunState {
  readonly seed: number;
  /** Fixed steps since the run began, and the time they add up to. */
  step: number;
  time: number;
  phase: Phase;
  drive: Drive;
  /** The three play cards on offer this down (indices into PLAYS), which one is called (null until one is), and whether Flip is on. */
  hand: number[];
  called: number | null;
  flipped: boolean;
  /** The play called (or, before the call, the first card's), and whether it's mirrored. */
  play: { readonly index: number; readonly flipped: boolean };
  /** Break it!, while it's on. */
  tackle: Tackle | null;
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

/** What the player does on a step: the two buttons, and the Break it! tap. */
export interface StepInput {
  /** THROW: a bullet along the sweeping line. */
  readonly throw?: boolean;
  /** RUN: the QB keeps it. */
  readonly scramble?: boolean;
  /** A tap in Break it! (the bar, and each tap of a mash). */
  readonly breakTap?: boolean;
  /** A juke: a tap on the left (-1) or right (+1) side of the screen. */
  readonly juke?: -1 | 1;
}

export type Action =
  /** Tap a play card: call it (its routes show), or switch to it. */
  | { readonly type: 'call'; readonly hand: number }
  /** Mirror the cards (and the called play). */
  | { readonly type: 'flip' }
  /** HIKE: start the called play. */
  | { readonly type: 'hike' }
  | { readonly type: 'skipDraft' };

export type ArcadeEvent =
  | { readonly type: 'downStarted'; readonly down: number; readonly toGo: number }
  | { readonly type: 'called'; readonly play: string; readonly flipped: boolean }
  | { readonly type: 'snapped' }
  | { readonly type: 'handoff'; readonly id: number }
  | { readonly type: 'scrambled'; readonly id: number }
  | { readonly type: 'thrown'; readonly target: Vec; readonly landsAt: number }
  | { readonly type: 'caught'; readonly id: number; readonly contested: boolean }
  /** A pass knocked down: `contested` when your player had a hand to it too and lost it. */
  | { readonly type: 'batted'; readonly by: number; readonly at: Vec; readonly contested: boolean }
  | { readonly type: 'incomplete'; readonly at: Vec }
  | { readonly type: 'pancake'; readonly blocker: number; readonly defender: number }
  /** A defender grabbed the carrier: Break it! starts. */
  | { readonly type: 'grabbed'; readonly id: number; readonly by: readonly number[] }
  /** How a Break it! went: a break, a drag, or a tackle. */
  | { readonly type: 'breakResult'; readonly outcome: 'break' | 'drag' | 'tackle' }
  /** A tap in the sweet spot: this tackler goes flying, the carrier keeps going. */
  | { readonly type: 'brokeTackle'; readonly id: number; readonly defender: number }
  /** A close tap: the carrier drags its tacklers this far before it goes down. */
  | { readonly type: 'dragged'; readonly id: number; readonly yards: number }
  | { readonly type: 'tackled'; readonly id: number; readonly by: number }
  /** The pocket collapsed (after its sweeps) with the QB still holding the ball. */
  | { readonly type: 'sacked' }
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
