/**
 * Simulation types. The simulation is pure data: a RunState advanced once per
 * beat by step() (TECHNICAL.md §3). Nothing here knows about rendering or audio.
 *
 * Coordinates: x is the column (0 = left), y is the row (0 = bottom, where the
 * Big stands; the top row is the end zone).
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

export type SmallRole = 'runner' | 'blocker';

export interface SmallUnit extends UnitBase {
  readonly side: 'small';
  /** Which squad slot this Small fills. */
  readonly slot: number;
  readonly kindId: string;
  role: SmallRole;
  /** Defenders this Small can still fend off (e.g. from a Clean Catch). */
  fendOff: number;
  /** A Blocker's hold counter: Blitzer attacks tick it down; at 0 the Blocker is beaten. */
  hold: number;
}

export type DefenderKind = 'chaser' | 'blitzer' | 'waller' | 'picker';

/** What a Blitzer is locked onto, and the beat it engaged (attacks start on its next hop beat). */
export type Engagement =
  | { readonly target: 'big'; readonly since: number }
  | { readonly target: 'small'; readonly id: number; readonly since: number };

export interface Defender extends UnitBase {
  readonly side: 'defender';
  readonly kind: DefenderKind;
  /** Where a Picker returns to, and a Wall-er's row. */
  readonly home: Vec;
  /** A Blitzer locked onto a Blocker or the Big. */
  engaged: Engagement | null;
}

export type Unit = SmallUnit | Defender;

export type BallState =
  | { readonly at: 'big' }
  | {
      readonly at: 'flight';
      readonly target: Vec;
      readonly releasedOn: number;
      readonly landsOn: number;
    }
  | { readonly at: 'carried'; readonly by: number }
  | { readonly at: 'none' };

/** What fills a squad slot: a Walk-on, or a recruit (TECHNICAL.md content: smalls.ts). */
export interface Slot {
  kindId: string;
}

export type Phase = 'setup' | 'play' | 'cleared' | 'over';

export interface ScreenState {
  /** Which screen of the run this is (0-based). */
  readonly index: number;
  readonly smalls: SmallUnit[];
  readonly defenders: Defender[];
  ball: BallState;
  /** The Big's hold counter for the current ball. */
  bigHold: number;
}

export interface RunState {
  readonly seed: number;
  /** The current beat (the last beat step() resolved). */
  beat: number;
  phase: Phase;
  balls: number;
  screensCleared: number;
  slots: Slot[];
  /** Where each slot's Small starts at setup. Remembered between screens. */
  formation: (Vec | null)[];
  screen: ScreenState;
  nextId: number;
}

/** Actions outside the beat: setup and moving between screens. Throws go to step(). */
export type Action =
  | { readonly type: 'place'; readonly slot: number; readonly tile: Vec }
  | { readonly type: 'hike' }
  | { readonly type: 'nextScreen' };

export type FumbleReason = 'sack' | 'miss' | 'interception' | 'tackle';
export type DeathCause = 'defender' | 'blitzer';
export type HitResult = 'down' | 'dead';

/** Everything that happened during a step, for the renderer, audio and tests. */
export type SimEvent =
  | { readonly type: 'hiked' }
  | { readonly type: 'hop'; readonly id: number; readonly from: Vec; readonly to: Vec }
  | { readonly type: 'thrown'; readonly target: Vec; readonly landsOn: number }
  | { readonly type: 'throwRejected'; readonly target: Vec; readonly reason: string }
  | { readonly type: 'caught'; readonly id: number; readonly clean: boolean }
  | { readonly type: 'fumble'; readonly reason: FumbleReason; readonly ballsLeft: number }
  | { readonly type: 'engaged'; readonly id: number; readonly target: Engagement }
  | {
      readonly type: 'attack';
      readonly id: number;
      readonly target: Engagement;
      readonly holdLeft: number;
    }
  | { readonly type: 'blockerBeaten'; readonly id: number; readonly by: number }
  | { readonly type: 'fendedOff'; readonly id: number; readonly defender: number }
  | { readonly type: 'knockedDown'; readonly id: number }
  | { readonly type: 'died'; readonly id: number; readonly cause: DeathCause }
  | { readonly type: 'touchdown'; readonly id: number; readonly yards: number }
  | { readonly type: 'wipeout'; readonly ballsLeft: number }
  | { readonly type: 'screenStarted'; readonly index: number }
  | { readonly type: 'gameOver'; readonly yards: number };
