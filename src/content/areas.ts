/**
 * Themed areas (GAMEPLAY.md, The Run): four drives each, Balatro-style:
 * Intro, Challenge, Gimmick, Boss. Each drive's defense is listed here.
 *
 * Defender spots are relative: `x` is a column (0-10), `y` is rows (half-yards)
 * past the line of scrimmage. The pass rush isn't placed: it's drawn against your
 * line by the pocket view, and only shortens the pocket clock. The Safety always lines up deep (sim/drive.ts).
 */
import type { DefenderKind } from '../sim/types';

export interface DefenseSpot {
  readonly kind: DefenderKind;
  readonly x: number;
  readonly y: number;
}

export interface DefenseSpec {
  /** Shown on the drive banner. */
  readonly name: string;
  readonly defenders: readonly DefenseSpot[];
  /** How many Witches fly over the field. */
  readonly witches: number;
  /** How many pass rushers it brings: each beyond the first shortens the pocket clock. */
  readonly rushers: number;
}

export interface AreaDef {
  readonly id: string;
  readonly name: string;
  readonly intro: DefenseSpec;
  readonly challenge: DefenseSpec;
  /** One is picked per run (seeded). */
  readonly gimmicks: readonly DefenseSpec[];
  readonly boss: DefenseSpec;
}

const safety: DefenseSpot = { kind: 'safety', x: 5, y: 0 };

export const FOREST: AreaDef = {
  id: 'forest',
  name: 'The Haunted Forest',
  intro: {
    name: 'A Quiet Clearing',
    witches: 0,
    rushers: 1,
    defenders: [
      { kind: 'cover', x: 1, y: 4 },
      { kind: 'cover', x: 9, y: 4 },
      { kind: 'zone', x: 5, y: 10 },
      safety,
    ],
  },
  challenge: {
    name: 'Gnome Country',
    witches: 0,
    rushers: 1,
    defenders: [
      { kind: 'cover', x: 0, y: 4 },
      { kind: 'cover', x: 4, y: 6 },
      { kind: 'cover', x: 10, y: 4 },
      { kind: 'zone', x: 7, y: 10 },
      { kind: 'bat', x: 1, y: 8 },
      safety,
    ],
  },
  gimmicks: [
    {
      name: 'Witching Hour: two Witches over the field',
      witches: 2,
      rushers: 1,
      defenders: [
        { kind: 'cover', x: 1, y: 4 },
        { kind: 'cover', x: 9, y: 4 },
        { kind: 'zone', x: 5, y: 10 },
        safety,
      ],
    },
    {
      name: 'Bat Cave: three Bats on patrol',
      witches: 0,
      rushers: 1,
      defenders: [
        { kind: 'cover', x: 1, y: 4 },
        { kind: 'cover', x: 9, y: 4 },
        { kind: 'bat', x: 0, y: 6 },
        { kind: 'bat', x: 4, y: 10 },
        { kind: 'bat', x: 7, y: 6 },
        safety,
      ],
    },
    {
      name: 'Scarecrow Field: three Scarecrows planted',
      witches: 0,
      rushers: 1,
      defenders: [
        { kind: 'cover', x: 2, y: 4 },
        { kind: 'cover', x: 8, y: 4 },
        { kind: 'zone', x: 2, y: 10 },
        { kind: 'zone', x: 5, y: 14 },
        { kind: 'zone', x: 8, y: 10 },
        safety,
      ],
    },
  ],
  boss: {
    name: "The Treant's Guard",
    witches: 1,
    rushers: 2,
    defenders: [
      { kind: 'cover', x: 0, y: 4 },
      { kind: 'cover', x: 4, y: 6 },
      { kind: 'cover', x: 10, y: 4 },
      { kind: 'zone', x: 3, y: 12 },
      { kind: 'zone', x: 7, y: 12 },
      { kind: 'bat', x: 5, y: 8 },
      safety,
    ],
  },
};

export const AREAS: readonly AreaDef[] = [FOREST];
