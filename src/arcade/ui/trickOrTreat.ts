/**
 * The words for TRICK OR TREAT! (GAMEPLAY.md, Building Up): perk cards,
 * recruit bios, and the roster panel, where you can swap players' positions
 * or choose who a recruit replaces.
 */
import { ROSTER_ROLES } from '../content/team';
import { playerStats, uniqueKind } from '../sim/team';
import type { Form, Perk, Position, RosterPlayer, RunState, Stats } from '../sim/types';
import type { CardFace, DraftView, RosterRow } from '../../ui/hud';

const STAT: Readonly<Record<keyof Stats, string>> = {
  hustle: 'Hustle',
  hands: 'Hands',
  heft: 'Heft',
};
const KIND: Readonly<Record<Form, string>> = {
  human: 'Human',
  ghost: 'Ghost',
  golem: 'Golem',
  werewolf: 'Werewolf',
};
const POSITION: Readonly<Record<Position, string>> = {
  blocker: 'Blocker',
  runner: 'Runner',
  catcher: 'Catcher',
};

const statLine = (s: Stats): string => `Hustle ${s.hustle} · Hands ${s.hands} · Heft ${s.heft}`;

/** A recruit's bio: kind, the position it prefers, its stats. */
export function bio(p: RosterPlayer): string {
  return `${KIND[p.kind]} · prefers ${POSITION[p.preferred]} · ${statLine(p.stats)}`;
}

export function perkFace(perk: Perk): CardFace {
  const rarity = perk.rarity;
  switch (perk.kind) {
    case 'allStat':
      return { rarity, name: `+${perk.amount} ${STAT[perk.stat]}`, blurb: 'Everyone on the team.' };
    case 'kindStat':
      return {
        rarity,
        name: `+${perk.amount} ${STAT[perk.stat]}`,
        blurb: `Every ${KIND[perk.form]} on the team.`,
      };
    case 'extraSweep':
      return { rarity, name: 'Extra Sweep', blurb: 'The pocket holds for one more sweep.' };
    case 'slowSweep':
      return { rarity, name: 'Slow-Mo Sweep', blurb: 'The aim line sweeps 25% slower.' };
    case 'secondWind':
      return { rarity, name: 'Second Wind', blurb: 'Once a drive, a BAD Break it! counts as OK.' };
    case 'magnet':
      return {
        rarity,
        name: 'Candy Corn Magnet',
        blurb: 'A throw about to fall incomplete gets twice the reach.',
      };
    case 'hotArm':
      return { rarity, name: 'Hot Arm', blurb: 'The ball flies twice as fast.' };
    case 'recruit':
      return { rarity, name: `New: ${perk.player.name}`, blurb: bio(perk.player) };
  }
}

/** The TRICK OR TREAT! screen: the offer, or (with a recruit picked) the question of who it replaces. */
export function trickOrTreatView(state: RunState, selected: number | null): DraftView {
  const recruit = state.recruit;
  const roster: RosterRow[] = state.roster.map((p, slot) => {
    const role = ROSTER_ROLES[slot];
    const position = role && role !== 'qb' ? POSITION[role] : '';
    const mash = uniqueKind(state.roster, slot) && state.roster.some((q) => q.kind !== p.kind);
    return {
      position,
      selected: selected === slot,
      name: p.name,
      form: KIND[p.kind],
      stats: statLine(playerStats(state, slot)),
      skill: `prefers ${POSITION[p.preferred]}${mash ? ' · Monster Mash +10' : ''}`,
    };
  });
  if (recruit) {
    return {
      title: `Who does ${recruit.name} replace?`,
      offer: [],
      roster,
      hand: `${recruit.name}: ${bio(recruit)}. Tap the player to let go.`,
    };
  }
  return {
    title: 'TRICK OR TREAT!',
    offer: state.offer.map(perkFace),
    roster,
    hand: 'Tap two players to swap their positions.',
  };
}
