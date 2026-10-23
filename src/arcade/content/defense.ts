/**
 * The forest's defenders (GAMEPLAY.md, The Defense) and each drive's
 * defense. Spots are relative to the line of scrimmage (x across, y
 * upfield). The first drive is a handful of sleepy defenders; the Boss
 * brings the whole forest. Every area adds to every defender's stats.
 */
import type { DefenderKind, Stats } from '../sim/types';

export interface DefenderDef {
  readonly name: string;
  readonly creature: string;
  readonly stats: Stats;
  readonly radius: number;
  /** Planted: never moves, and nothing can shove it. Running into one is a tackle. */
  readonly planted: boolean;
  /**
   * Extra reach for the ball beyond what its Hands give it: a Scarecrow's
   * arms cover a wide ring (drawn on the turf), so any low pass coming down
   * inside it is contested.
   */
  readonly reachBonus: number;
}

export const DEFENDERS: Readonly<Record<DefenderKind, DefenderDef>> = {
  rusher: {
    name: 'Rusher',
    creature: 'Rhino Beetle',
    stats: { hustle: 40, hands: 40, heft: 70 },
    radius: 0.6,
    planted: false,
    reachBonus: 0,
  },
  cover: {
    name: 'Cover',
    creature: 'Garden Gnome',
    stats: { hustle: 50, hands: 50, heft: 40 },
    radius: 0.4,
    planted: false,
    reachBonus: 0,
  },
  zone: {
    name: 'Zone',
    creature: 'Scarecrow',
    stats: { hustle: 50, hands: 80, heft: 80 },
    radius: 0.55,
    planted: true,
    reachBonus: 1.2,
  },
  safety: {
    name: 'Safety',
    creature: 'Owl',
    stats: { hustle: 60, hands: 60, heft: 50 },
    radius: 0.5,
    planted: false,
    reachBonus: 0,
  },
  bat: {
    name: 'Bat',
    creature: 'Bat',
    stats: { hustle: 40, hands: 60, heft: 30 },
    radius: 0.4,
    planted: false,
    reachBonus: 0.3,
  },
  misterFrog: {
    name: 'Mister Frog',
    creature: 'Frog in a top hat',
    // The Forest's Boss: twice a player's size, heavy and grabby, and slow off the mark.
    stats: { hustle: 50, hands: 70, heft: 90 },
    radius: 1.0,
    planted: false,
    reachBonus: 0.6,
  },
  queen: {
    name: 'The Queen',
    creature: 'Witch in a crown',
    // The Candy Kingdom's Boss: twice a player's size, quick and with a long reach for the ball.
    stats: { hustle: 60, hands: 90, heft: 70 },
    radius: 1.0,
    planted: false,
    reachBonus: 1.0,
  },
};

export interface DefenseSpot {
  readonly kind: DefenderKind;
  readonly x: number;
  readonly y: number;
}

export interface DefenseSpec {
  readonly name: string;
  readonly defenders: readonly DefenseSpot[];
  /** Witches sweeping across the field. */
  readonly witches: number;
  /** Added to every defender's stats on top of the area's boost (a sleepy first drive is negative). */
  readonly boost: number;
  /** Mister Frog's Frog Rain: a lane shown before each snap, frogs falling in it during the down. */
  readonly frogRain?: boolean;
  /** The Queen's Hex: the aim line shows only a short stub by the pumpkin, and receivers don't light up. */
  readonly hex?: boolean;
}

const d = (kind: DefenderKind, x: number, y: number): DefenseSpot => ({ kind, x, y });
/** The Owl always hangs deep (sim/run.ts places it at least past the first-down line). */
const owl = d('safety', 0, 12);

/** How an area looks: its turf, floor and sideline props (render/scenery.ts, render/field.ts). */
export type Biome = 'forest' | 'candy';

export interface ArcadeArea {
  readonly name: string;
  readonly biome: Biome;
  /** Its own look for a kind of defender (a model id), where it isn't the Forest's: the rule stays the kind's. */
  readonly looks: Partial<Record<DefenderKind, string>>;
  readonly intro: DefenseSpec;
  readonly challenge: DefenseSpec;
  readonly gimmicks: readonly DefenseSpec[];
  readonly boss: DefenseSpec;
}

export const FOREST: ArcadeArea = {
  name: 'The Haunted Forest',
  biome: 'forest',
  looks: {},
  intro: {
    name: 'A Quiet Clearing',
    witches: 0,
    boost: -10,
    defenders: [d('rusher', -1.8, 1), d('cover', -6.3, 4), d('cover', 4.2, 5), owl],
  },
  challenge: {
    name: 'Gnome Country',
    witches: 0,
    boost: 0,
    defenders: [
      d('rusher', -1.8, 1),
      d('cover', -6.3, 4),
      d('cover', 6.3, 5),
      d('zone', 2.8, 8),
      owl,
    ],
  },
  gimmicks: [
    {
      name: 'Witching Hour',
      witches: 2,
      boost: 0,
      defenders: [
        d('rusher', -1.8, 1),
        d('cover', -6.3, 4),
        d('cover', 5.6, 6),
        d('cover', 3.5, 4),
        owl,
      ],
    },
    {
      name: 'Bat Cave',
      witches: 0,
      boost: 0,
      defenders: [
        d('rusher', 1.8, 1),
        d('cover', -6.3, 4),
        d('cover', 6.3, 4),
        d('bat', 2.1, 5),
        d('bat', 4.2, 11),
        owl,
      ],
    },
    {
      name: 'Scarecrow Field',
      witches: 0,
      boost: 0,
      defenders: [
        d('rusher', -1.8, 1),
        d('cover', 6.3, 4),
        d('cover', -6.3, 5),
        d('zone', -4.2, 6),
        d('zone', -1.4, 10),
        owl,
      ],
    },
  ],
  boss: {
    name: "Mister Frog's Pond",
    witches: 0,
    boost: 0,
    frogRain: true,
    defenders: [
      d('rusher', -1.8, 1),
      d('rusher', 1.8, 1),
      d('cover', -6.3, 4),
      d('cover', 6.3, 4),
      d('cover', 3.5, 6),
      d('zone', -2.8, 9),
      d('bat', 1.4, 7),
      // Mister Frog plays deep, like the Owl.
      d('misterFrog', 0, 12),
    ],
  },
};

/**
 * The Candy Kingdom: the Queen's gingerbread realm. The rules are the same
 * kinds as the Forest's; Covers are Gingerbread Men and the Safety is a Witch
 * on her broom. Its Boss is the Queen, whose Hex hides the aim line.
 */
export const CANDY_KINGDOM: ArcadeArea = {
  name: 'The Candy Kingdom',
  biome: 'candy',
  looks: { cover: 'candy/gingerbreadMan', safety: 'forest/witch' },
  intro: {
    name: 'Gumdrop Lane',
    witches: 0,
    // A sleepy start, like every area's Intro.
    boost: -10,
    defenders: [d('rusher', 1.8, 1), d('cover', -6.3, 4), d('cover', 4.2, 5), d('safety', 0, 12)],
  },
  challenge: {
    name: 'Gingerbread Row',
    witches: 0,
    boost: 0,
    defenders: [
      d('rusher', 1.8, 1),
      d('cover', -6.3, 4),
      d('cover', 6.3, 5),
      d('cover', -3.5, 6),
      d('safety', 0, 12),
    ],
  },
  gimmicks: [
    {
      name: 'Broomstick Alley',
      witches: 2,
      boost: 0,
      defenders: [
        d('rusher', 1.8, 1),
        d('cover', 6.3, 4),
        d('cover', -5.6, 6),
        d('cover', -3.5, 4),
        d('safety', 0, 12),
      ],
    },
    {
      name: 'Candy Cane Grove',
      witches: 0,
      boost: 0,
      defenders: [
        d('rusher', -1.8, 1),
        d('cover', -6.3, 4),
        d('cover', 6.3, 5),
        d('zone', 4.2, 6),
        d('zone', 1.4, 10),
        d('safety', 0, 12),
      ],
    },
  ],
  boss: {
    name: "The Queen's Court",
    witches: 0,
    boost: 0,
    hex: true,
    defenders: [
      d('rusher', -1.8, 1),
      d('rusher', 1.8, 1),
      d('cover', -6.3, 4),
      d('cover', 6.3, 4),
      d('cover', -3.5, 6),
      d('zone', 2.8, 9),
      d('bat', -1.4, 7),
      // The Queen plays deep, like the Owl.
      d('queen', 0, 12),
    ],
  },
};

/** The run's areas in order. ▲ The Farm comes third; until it's built, the Forest comes round again. */
export const AREAS: readonly ArcadeArea[] = [FOREST, CANDY_KINGDOM, FOREST];

/** An area by its number (the last one for any beyond). */
export const areaAt = (area: number): ArcadeArea =>
  AREAS[Math.max(0, Math.min(area, AREAS.length - 1))] ?? FOREST;
