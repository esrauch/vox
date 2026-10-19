/**
 * The words for the roster and the draft (GAMEPLAY.md, Your Roster): offer
 * faces, roster rows and the team hand. The numbers only ever show here,
 * never on the field.
 */
import { FORMS } from '../content/roster';
import { playerStats, teamHand } from '../sim/roster';
import type { DraftOffer, RunState, Stats } from '../sim/types';
import type { CardFace, DraftView, RosterRow } from '../ui/hud';

const STAT_NAME: Readonly<Record<keyof Stats, string>> = {
  hustle: 'Hustle',
  hands: 'Hands',
  heft: 'Heft',
};

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function statName(stat: keyof Stats): string {
  return STAT_NAME[stat];
}

export function offerFace(offer: DraftOffer): CardFace {
  if (offer.kind === 'transform') {
    const form = FORMS[offer.form];
    return { name: form.offer, blurb: `A random human becomes a ${form.name}. ${form.skill}.` };
  }
  return { name: `+1 ${STAT_NAME[offer.stat]}`, blurb: 'A random player trains.' };
}

export function rosterRows(state: RunState): RosterRow[] {
  return state.roster.map((p, slot) => {
    const stats = playerStats(state.roster, slot);
    return {
      name: p.name,
      form: FORMS[p.form].name,
      stats: (['hustle', 'hands', 'heft'] as const)
        .map((s) => `${STAT_NAME[s]} ${signed(stats[s])}`)
        .join(' · '),
      skill: FORMS[p.form].skill,
    };
  });
}

/** The team hand you hold, in words, or null. */
export function handText(state: RunState): string | null {
  const hand = teamHand(state.roster);
  if (!hand) return null;
  if (hand.kind === 'mash') return 'Monster Mash: every player has every skill';
  const form = FORMS[hand.form];
  return `Four of a Kind: ${form.name}s. Their skill works on every check, and +2 ${STAT_NAME[form.main]}`;
}

export function draftView(state: RunState): DraftView {
  return { offer: state.offer.map(offerFace), roster: rosterRows(state), hand: handText(state) };
}
