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
  /** Planted: never moves, and nothing can shove it. */
  readonly planted: boolean;
}

export const DEFENDERS: Readonly<Record<DefenderKind, DefenderDef>> = {
  rusher: {
    name: 'Rusher',
    creature: 'Rhino Beetle',
    stats: { hustle: -1, hands: -1, heft: 2 },
    radius: 0.6,
    planted: false,
  },
  cover: {
    name: 'Cover',
    creature: 'Garden Gnome',
    stats: { hustle: 0, hands: 0, heft: -1 },
    radius: 0.4,
    planted: false,
  },
  zone: {
    name: 'Zone',
    creature: 'Scarecrow',
    stats: { hustle: 0, hands: 1, heft: 3 },
    radius: 0.55,
    planted: true,
  },
  safety: {
    name: 'Safety',
    creature: 'Owl',
    stats: { hustle: 1, hands: 1, heft: 0 },
    radius: 0.5,
    planted: false,
  },
  bat: {
    name: 'Bat',
    creature: 'Bat',
    stats: { hustle: -1, hands: 1, heft: -2 },
    radius: 0.4,
    planted: false,
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
}

const d = (kind: DefenderKind, x: number, y: number): DefenseSpot => ({ kind, x, y });
/** The Owl always hangs deep (sim/run.ts places it at least past the first-down line). */
const owl = d('safety', 0, 12);

export interface ArcadeArea {
  readonly name: string;
  readonly intro: DefenseSpec;
  readonly challenge: DefenseSpec;
  readonly gimmicks: readonly DefenseSpec[];
  readonly boss: DefenseSpec;
}

export const FOREST: ArcadeArea = {
  name: 'The Haunted Forest',
  intro: {
    name: 'A Quiet Clearing',
    witches: 0,
    boost: -1,
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
    name: "The Treant's Guard",
    witches: 1,
    boost: 0,
    defenders: [
      d('rusher', -1.8, 1),
      d('rusher', 1.8, 1),
      d('cover', -6.3, 4),
      d('cover', 6.3, 4),
      d('cover', 3.5, 6),
      d('zone', -2.8, 9),
      d('bat', 1.4, 7),
      owl,
    ],
  },
};
