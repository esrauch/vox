/**
 * What TRICK OR TREAT! shows (GAMEPLAY.md, Building Up): the two cards (New
 * Player! and More Stats!, each a player card like the roster's), then the
 * roster to rearrange after a new player joins. The field is on the left
 * by position, the bench on the right; any two swap.
 */
import { BENCH_SIZE, POSITION_STAT, ROSTER_ROLES } from '../content/team';
import { BENCH_START, atSpot, bestSpot, fieldedStats, playerStats } from '../sim/team';
import { kindIcon } from './kindIcons';
import type { Form, Perk, Position, RosterPlayer, RunState, Stats } from '../sim/types';
import type { DraftView, OfferCard, RosterRow, StatBar } from '../../ui/hud';

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

const STAT_ORDER: readonly (keyof Stats)[] = ['heft', 'hustle', 'hands'];

const bars = (s: Stats, key?: keyof Stats): StatBar[] =>
  STAT_ORDER.map((k) => ({ label: STAT[k], value: s[k], key: k === key }));

/** The position a field slot plays. */
const slotPosition = (slot: number): Position => {
  const role = ROSTER_ROLES[slot];
  return role && role !== 'qb' ? role : 'catcher';
};

/** One card of the offer. */
function offerCard(state: RunState, perk: Perk): OfferCard | null {
  if (perk.kind === 'recruit') {
    const p = perk.player;
    const slot = bestSpot(state, p);
    const goes =
      slot === null
        ? 'sits on the bench'
        : `in for ${state.roster[slot]?.name ?? '?'} (${POSITION[slotPosition(slot)]})`;
    return {
      title: 'New Player!',
      kind: 'player',
      player: {
        name: p.name,
        form: KIND[p.kind],
        icon: kindIcon(p.kind),
        stats: bars(fieldedStats(state, p), POSITION_STAT[p.preferred]),
        note: `prefers ${POSITION[p.preferred]} · ${goes}`,
      },
    };
  }
  if (perk.kind === 'playerStat') {
    const p = atSpot(state, perk.spot);
    if (!p) return null;
    const now = fieldedStats(state, p);
    const where = perk.spot < BENCH_START ? POSITION[slotPosition(perk.spot)] : 'Bench';
    return {
      title: 'More Stats!',
      kind: 'stats',
      player: {
        name: p.name,
        form: KIND[p.kind],
        icon: kindIcon(p.kind),
        stats: bars(now, perk.main).map((b, i) => ({
          ...b,
          delta: perk.boost[STAT_ORDER[i] ?? 'heft'],
        })),
        note: `${where} · for good`,
      },
    };
  }
  return null;
}

/** The TRICK OR TREAT! screen: the two cards, or (after a new player joins) the lineup to set. */
export function trickOrTreatView(state: RunState, selected: number | null): DraftView {
  // The player a stat boost on offer is for: its row says so.
  const boosted = (spot: number): boolean =>
    state.offer.some((o) => o.kind === 'playerStat' && o.spot === spot);
  // ★ on the position heading the tapped player prefers.
  const starred = (selected === null ? undefined : atSpot(state, selected))?.preferred;
  const row = (
    p: RosterPlayer,
    spot: number,
    position: string,
    stats: Stats,
    key?: keyof Stats,
  ): RosterRow => ({
    spot,
    position,
    selected: selected === spot,
    name: p.name,
    form: KIND[p.kind],
    icon: kindIcon(p.kind),
    stats: bars(stats, key),
    note: [
      position === 'Bench' || p.preferred !== slotPosition(spot)
        ? `prefers ${POSITION[p.preferred]}`
        : '',
      boosted(spot) ? 'More Stats! on offer' : '',
    ]
      .filter(Boolean)
      .join(' · '),
  });
  const roster: RosterRow[] = state.roster.map((p, slot) => {
    const position = slotPosition(slot);
    return {
      ...row(p, slot, POSITION[position], playerStats(state, slot), POSITION_STAT[position]),
      fits: starred === position,
    };
  });
  const bench = Array.from({ length: BENCH_SIZE }, (_, seat): RosterRow | null => {
    const p = state.bench[seat];
    return p ? row(p, BENCH_START + seat, 'Bench', fieldedStats(state, p)) : null;
  });
  const from = selected === null ? null : atSpot(state, selected);
  const hand = from
    ? `Now tap who ${from.name} swaps with (or ${from.name} again to cancel).`
    : 'Tap any two players to swap them, field or bench.';
  if (state.offer.length === 0) {
    return { title: 'Set your lineup', offer: [], roster, bench, hand, skip: 'Done' };
  }
  return {
    title: 'TRICK OR TREAT!',
    offer: state.offer.map((p) => offerCard(state, p)).filter((c): c is OfferCard => c !== null),
    roster,
    bench,
    hand,
  };
}
