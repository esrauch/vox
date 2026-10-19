/**
 * Your roster in play (GAMEPLAY.md, Your Roster and Team Hands): a player's
 * stats and skills come from its form, its training and the team's hand.
 */
import { FORMS, FOUR_OF_A_KIND_BONUS, MONSTERS, STARTING_NAMES } from '../content/roster';
import type { CheckKind, RosterPlayer, Stats, TeamHand } from './types';

const ALL_CHECKS: readonly CheckKind[] = ['shake', 'catch', 'break'];

/** Four identical humans. */
export function startingRoster(): RosterPlayer[] {
  return STARTING_NAMES.map((name) => ({
    name,
    form: 'human',
    training: { hustle: 0, hands: 0, heft: 0 },
    streak: { shake: 0, catch: 0, break: 0 },
  }));
}

/**
 * The roster's hand: a Monster Mash is all four forms different (a human and
 * one of each monster); a Four of a Kind is four of one monster.
 */
export function teamHand(roster: readonly RosterPlayer[]): TeamHand {
  const forms = roster.map((p) => p.form);
  const first = forms[0];
  if (forms.length === 4 && first && first !== 'human' && forms.every((f) => f === first)) {
    return { kind: 'four', form: first };
  }
  if (forms.length === 4 && new Set(forms).size === 4) return { kind: 'mash' };
  return null;
}

/** A roster player's stats: its form's, plus its training, plus a Four of a Kind's bonus. */
export function playerStats(roster: readonly RosterPlayer[], slot: number): Stats {
  const p = roster[slot];
  if (!p) return { hustle: 0, hands: 0, heft: 0 };
  const form = FORMS[p.form].stats;
  const hand = teamHand(roster);
  const bonus = (stat: keyof Stats): number =>
    hand?.kind === 'four' && FORMS[hand.form].main === stat ? FOUR_OF_A_KIND_BONUS : 0;
  const stat = (s: keyof Stats): number => form[s] + p.training[s] + bonus(s);
  return { hustle: stat('hustle'), hands: stat('hands'), heft: stat('heft') };
}

/**
 * A roster player's skills. A Monster Mash gives every player every
 * monster's skill; a Four of a Kind makes its form's skill work on every
 * kind of check.
 */
export function playerSkills(
  roster: readonly RosterPlayer[],
  slot: number,
): { rerolls: CheckKind[]; frenzy: CheckKind[] } {
  const p = roster[slot];
  if (!p) return { rerolls: [], frenzy: [] };
  const hand = teamHand(roster);
  const forms = hand?.kind === 'mash' ? MONSTERS : [p.form];
  const rerolls = new Set(forms.flatMap((f) => FORMS[f].rerolls));
  const frenzy = new Set(forms.flatMap((f) => FORMS[f].frenzy));
  if (hand?.kind === 'four') {
    const def = FORMS[hand.form];
    if (def.rerolls.length > 0) ALL_CHECKS.forEach((k) => rerolls.add(k));
    if (def.frenzy.length > 0) ALL_CHECKS.forEach((k) => frenzy.add(k));
  }
  return { rerolls: [...rerolls], frenzy: [...frenzy] };
}
