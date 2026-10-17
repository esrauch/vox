/**
 * Simulation types. The simulation is pure data: a RunState advanced once per
 * beat by step() (TECHNICAL.md §3). Nothing here knows about rendering or audio.
 *
 * Coordinates: x is the column (0 = left), y is the row (0 = bottom, where the
 * QB stands; the top row is the end zone).
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
  alive: boolean;
  /** Beats left lying knocked down (0 = up). */
  downBeats: number;
  /** Hits taken so far this screen. Heft decides how many it survives. */
  hitsTaken: number;
  /** The tile this unit will hop to on its next hop beat: the "faces where it'll hop" telegraph. */
  intent: Vec | null;
}

export interface PlayerUnit extends UnitBase {
  readonly side: 'player';
  /** Which squad slot this player fills. */
  readonly slot: number;
  readonly kindId: string;
  /** Defenders this player can still fend off (e.g. from a Clean Catch). */
  fendOff: number;
}

export type DefenderKind = 'chaser' | 'blitzer' | 'waller' | 'picker';

export interface Defender extends UnitBase {
  readonly side: 'defender';
  readonly kind: DefenderKind;
  /** Where it started. A Wall-er holds this row. */
  readonly home: Vec;
  /** A fixed circuit of tiles this defender loops around (Pickers: a 4×4 box), or null. */
  readonly patrol: readonly Vec[] | null;
  /** Which tile of the patrol it's on. */
  patrolIndex: number;
}

export type Unit = PlayerUnit | Defender;

export type BallState =
  | { readonly at: 'qb' }
  | {
      readonly at: 'flight';
      readonly target: Vec;
      readonly releasedOn: number;
      readonly landsOn: number;
    }
  | { readonly at: 'carried'; readonly by: number }
  | { readonly at: 'none' };

/** What fills a squad slot: a Walk-on, or a recruit (TECHNICAL.md content: players.ts). */
export interface Slot {
  kindId: string;
}

export type Phase = 'setup' | 'play' | 'cleared' | 'over';

export interface ScreenState {
  /** Which screen of the run this is (0-based). */
  readonly index: number;
  readonly players: PlayerUnit[];
  readonly defenders: Defender[];
  ball: BallState;
}

export interface RunState {
  readonly seed: number;
  /** The global beat (the last beat step() resolved). It ticks in every phase, with the music, and never resets. */
  beat: number;
  phase: Phase;
  balls: number;
  screensCleared: number;
  slots: Slot[];
  /** Where each slot's player starts at setup. Remembered between screens. */
  formation: (Vec | null)[];
  screen: ScreenState;
  nextId: number;
}

/** Actions outside the beat: setup and moving between screens. Throws go to step(). */
export type Action =
  | { readonly type: 'place'; readonly slot: number; readonly tile: Vec }
  | { readonly type: 'hike' }
  | { readonly type: 'nextScreen' };

/** How close the receiver was to where the ball came down. A perfect catch is a Clean Catch. */
export type CatchQuality = 'perfect' | 'good' | 'ok';

export type FumbleReason = 'sack' | 'miss' | 'interception' | 'tackle';
/** What killed a unit: a defender, or (for defenders) a Walk-on trading itself. */
export type DeathCause = 'defender' | 'walkOn';
export type HitResult = 'down' | 'dead';

/** Everything that happened during a step, for the renderer, audio and tests. */
export type SimEvent =
  | { readonly type: 'hiked' }
  | { readonly type: 'hop'; readonly id: number; readonly from: Vec; readonly to: Vec }
  | { readonly type: 'thrown'; readonly target: Vec; readonly landsOn: number }
  | { readonly type: 'throwRejected'; readonly target: Vec; readonly reason: string }
  | {
      readonly type: 'caught';
      readonly id: number;
      readonly clean: boolean;
      readonly quality: CatchQuality;
    }
  | { readonly type: 'fumble'; readonly reason: FumbleReason; readonly ballsLeft: number }
  | { readonly type: 'fendedOff'; readonly id: number; readonly defender: number }
  | { readonly type: 'knockedDown'; readonly id: number }
  | { readonly type: 'died'; readonly id: number; readonly cause: DeathCause }
  | { readonly type: 'touchdown'; readonly id: number; readonly yards: number }
  | { readonly type: 'wipeout'; readonly ballsLeft: number }
  | { readonly type: 'screenStarted'; readonly index: number }
  | { readonly type: 'gameOver'; readonly yards: number };
