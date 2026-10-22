/**
 * The words for TRICK OR TREAT! (GAMEPLAY.md, Building Up): perk cards,
 * recruit bios, and the roster panel, where you can swap players' positions
 * or choose who a recruit replaces.
 */
import { ROSTER_ROLES } from '../content/team';
import { playerStats, uniqueKind } from '../sim/team';
import type { Form, Perk, Position, RosterPlayer, RunState, Stats } from '../sim/types';
import type { CardFace, DraftView, RosterRow, StatBar } from '../../ui/hud';

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

/** The stat each position leans on. */
const KEY_STAT: Readonly<Record<Position, keyof Stats>> = {
  blocker: 'heft',
  runner: 'hustle',
  catcher: 'hands',
};
const STAT_ORDER: readonly (keyof Stats)[] = ['heft', 'hustle', 'hands'];

const bars = (s: Stats, key?: keyof Stats): StatBar[] =>
  STAT_ORDER.map((k) => ({ label: STAT[k], value: s[k], key: k === key }));

/** Monster Mash applies: the only one of its kind, on a team that isn't all one kind. */
const mashed = (roster: readonly RosterPlayer[], slot: number): boolean =>
  uniqueKind(roster, slot) && roster.some((q) => q.kind !== roster[slot]?.kind);

/** The TRICK OR TREAT! screen: the offer, or (with a recruit picked) the question of who it replaces. */
export function trickOrTreatView(state: RunState, selected: number | null): DraftView {
  const recruit = state.recruit;
  const roster: RosterRow[] = state.roster.map((p, slot) => {
    const role = ROSTER_ROLES[slot];
    const position: Position = role && role !== 'qb' ? role : 'catcher';
    const stats = playerStats(state, slot);
    const notes = [
      p.preferred !== position ? `prefers ${POSITION[p.preferred]}` : '',
      mashed(state.roster, slot) ? 'Monster Mash +10' : '',
    ];
    // Placing a recruit: what this slot would have with it there instead (its perks and Monster Mash included).
    let shown = bars(stats, KEY_STAT[position]);
    let fits = false;
    if (recruit) {
      const after = { ...state, roster: state.roster.map((q, i) => (i === slot ? recruit : q)) };
      const gain = playerStats(after, slot);
      shown = shown.map((bar, i) => {
        const k = STAT_ORDER[i] ?? 'heft';
        return { ...bar, delta: gain[k] - stats[k] };
      });
      fits = recruit.preferred === position;
    }
    return {
      position: POSITION[position],
      selected: selected === slot,
      name: p.name,
      form: KIND[p.kind],
      kind: p.kind,
      stats: shown,
      note: notes.filter(Boolean).join(' · '),
      fits,
    };
  });
  if (recruit) {
    const after = { ...state, roster: [...state.roster, recruit] };
    return {
      title: `Who does ${recruit.name} replace?`,
      offer: [],
      recruit: {
        name: recruit.name,
        form: KIND[recruit.kind],
        kind: recruit.kind,
        stats: bars(playerStats(after, after.roster.length - 1), KEY_STAT[recruit.preferred]),
        note: `prefers ${POSITION[recruit.preferred]}`,
      },
      roster,
      hand: 'Tap the player to let go. The numbers show what that spot gains or loses; ★ marks the position it prefers.',
      skip: `Pass on ${recruit.name}`,
    };
  }
  const from = selected === null ? null : state.roster[selected];
  return {
    title: 'TRICK OR TREAT!',
    offer: state.offer.map(perkFace),
    roster,
    hand: from
      ? `Now tap who ${from.name} swaps places with (or ${from.name} again to cancel).`
      : 'Tap two players to swap their positions.',
  };
}
