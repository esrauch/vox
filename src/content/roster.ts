/**
 * Your roster (GAMEPLAY.md, Your Roster): the four players who run every
 * play, and the forms they can be transformed into. Each form shifts the
 * stats and brings one skill that bends the dice (sim/checks.ts).
 */
import type { CheckKind, Form, Stats } from '../sim/types';

/** The four players every run starts with: identical humans, in a fixed order. */
export const STARTING_NAMES: readonly string[] = [
  'Gus Grimsby',
  'Lefty Graves',
  'Big Bert Barrow',
  'Kid Carver',
];

export interface FormDef {
  readonly name: string;
  /** The transform's name in the draft. */
  readonly offer: string;
  /** Stats added to a human's. */
  readonly stats: Stats;
  /** Failed checks of these kinds are rolled again. */
  readonly rerolls: readonly CheckKind[];
  /** After a success on a check of these kinds, the next one of the kind gets the frenzy edge. */
  readonly frenzy: readonly CheckKind[];
  /** The skill's name and one line, for the roster. */
  readonly skill: string;
  /** The stat a Four of a Kind of this form raises. */
  readonly main: keyof Stats;
}

export const FORMS: Readonly<Record<Form, FormDef>> = {
  human: {
    name: 'Human',
    offer: '',
    stats: { hustle: 0, hands: 0, heft: 0 },
    rerolls: [],
    frenzy: [],
    skill: '',
    main: 'hands',
  },
  ghost: {
    name: 'Ghost',
    offer: 'Ghostly Touch',
    stats: { hustle: 3, hands: 0, heft: -2 },
    rerolls: ['shake'],
    frenzy: [],
    skill: 'Phase: rerolls a failed shake',
    main: 'hustle',
  },
  werewolf: {
    name: 'Werewolf',
    offer: 'Werewolf Bite',
    stats: { hustle: 1, hands: -1, heft: 1 },
    rerolls: [],
    frenzy: ['break'],
    skill: 'Frenzy: after a broken tackle, the next break is +2',
    main: 'heft',
  },
  golem: {
    name: 'Golem',
    offer: 'Golem Clay',
    stats: { hustle: -2, hands: 0, heft: 4 },
    rerolls: ['break'],
    frenzy: [],
    skill: 'Stand Firm: rerolls a failed break',
    main: 'heft',
  },
};

/** The forms a human can be transformed into. */
export const MONSTERS: readonly Form[] = ['ghost', 'werewolf', 'golem'];

/** What a Four of a Kind adds to its form's main stat. */
export const FOUR_OF_A_KIND_BONUS = 2;
/** What a Monster Mash adds to every stat (on top of every player having every skill). */
export const MASH_BONUS = 1;
/** Final Girls: four humans with at least this many training picks between them… */
export const FINAL_GIRLS_TRAINING = 2;
/** …get this on every stat. */
export const FINAL_GIRLS_BONUS = 1;
