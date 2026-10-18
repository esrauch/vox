/**
 * Themed areas (GAMEPLAY.md, The Run): four drives each, Balatro-style:
 * Intro, Challenge, Gimmick, Boss. Each drive's defense is listed here.
 *
 * Defender spots are relative: `x` is a column (0-8), `y` is rows past the
 * line of scrimmage. The Safety always lines up deep (sim/drive.ts).
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

const safety: DefenseSpot = { kind: 'safety', x: 4, y: 0 };

export const FOREST: AreaDef = {
  id: 'forest',
  name: 'The Haunted Forest',
  intro: {
    name: 'A Quiet Clearing',
    witches: 0,
    defenders: [
      { kind: 'cover', x: 1, y: 2 },
      { kind: 'cover', x: 7, y: 2 },
      { kind: 'zone', x: 4, y: 5 },
      { kind: 'blitzer', x: 3, y: 2 },
      safety,
    ],
  },
  challenge: {
    name: 'Gnome Country',
    witches: 0,
    defenders: [
      { kind: 'cover', x: 0, y: 2 },
      { kind: 'cover', x: 3, y: 3 },
      { kind: 'cover', x: 8, y: 2 },
      { kind: 'zone', x: 6, y: 5 },
      { kind: 'blitzer', x: 5, y: 2 },
      { kind: 'bat', x: 1, y: 4 },
      safety,
    ],
  },
  gimmicks: [
    {
      name: 'Witching Hour: two Witches over the field',
      witches: 2,
      defenders: [
        { kind: 'cover', x: 1, y: 2 },
        { kind: 'cover', x: 7, y: 2 },
        { kind: 'zone', x: 4, y: 5 },
        { kind: 'blitzer', x: 3, y: 2 },
        safety,
      ],
    },
    {
      name: 'Bat Cave: three Bats on patrol',
      witches: 0,
      defenders: [
        { kind: 'cover', x: 1, y: 2 },
        { kind: 'cover', x: 7, y: 2 },
        { kind: 'blitzer', x: 4, y: 2 },
        { kind: 'bat', x: 0, y: 3 },
        { kind: 'bat', x: 3, y: 5 },
        { kind: 'bat', x: 5, y: 3 },
        safety,
      ],
    },
    {
      name: 'Scarecrow Field: three Scarecrows planted',
      witches: 0,
      defenders: [
        { kind: 'cover', x: 2, y: 2 },
        { kind: 'cover', x: 6, y: 2 },
        { kind: 'zone', x: 1, y: 5 },
        { kind: 'zone', x: 4, y: 7 },
        { kind: 'zone', x: 7, y: 5 },
        { kind: 'blitzer', x: 4, y: 2 },
        safety,
      ],
    },
  ],
  boss: {
    name: "The Treant's Guard",
    witches: 1,
    defenders: [
      { kind: 'cover', x: 0, y: 2 },
      { kind: 'cover', x: 3, y: 3 },
      { kind: 'cover', x: 8, y: 2 },
      { kind: 'zone', x: 2, y: 6 },
      { kind: 'zone', x: 6, y: 6 },
      { kind: 'blitzer', x: 3, y: 2 },
      { kind: 'blitzer', x: 5, y: 2 },
      { kind: 'bat', x: 4, y: 4 },
      safety,
    ],
  },
};

export const AREAS: readonly AreaDef[] = [FOREST];
