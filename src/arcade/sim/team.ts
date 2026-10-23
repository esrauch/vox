/**
 * Your team between plays (GAMEPLAY.md, Your Team and Building Up): every
 * player's stats with the perks and Monster Mash added, the TRICK OR TREAT!
 * offer, and taking a perk.
 */
import {
  MONSTER_MASH_BONUS,
  POSITIONS,
  RECRUIT_NAMES,
  STARTING_NAMES,
  ZONE_OFFER,
} from '../content/perks';
import { BASE_STATS, FORM_STATS, POSITION_STAT, ROSTER_ROLES } from '../content/team';
import type { Rng } from '../../sim/rng';
import { rngFor } from './random';
import { even, plus, ZERO } from './stats';
import type { Form, Perk, Perks, Position, RosterPlayer, RunState, Stats } from './types';

const STATS: readonly (keyof Stats)[] = ['hustle', 'hands', 'heft'];
const KINDS: readonly Form[] = ['human', 'ghost', 'golem', 'werewolf'];
/** The seven you start with: plain humans, each in the position it prefers. */
export function startingRoster(): RosterPlayer[] {
  return ROSTER_ROLES.map((role, i) => {
    const preferred = role === 'qb' ? 'catcher' : role;
    return {
      name: STARTING_NAMES[i] ?? `Player ${i + 1}`,
      kind: 'human',
      preferred,
      stats: BASE_STATS,
    };
  });
}

export function noPerks(): Perks {
  return {
    all: ZERO,
    byKind: {},
    extraScans: 0,
    sweepScale: 1,
    secondWind: false,
    secondWindUsed: false,
    magnet: false,
    throwScale: 1,
  };
}

/** Monster Mash: whether this player's kind is the only one of its kind on the team. */
/** Spots on the roster screen: the field slots (0-6), then the bench seats from here. */
export const BENCH_START = ROSTER_ROLES.length;

/** Who's in a spot (a field slot or a bench seat), if anyone. */
export function atSpot(state: RunState, spot: number): RosterPlayer | undefined {
  return spot < BENCH_START ? state.roster[spot] : state.bench[spot - BENCH_START];
}

/** Put a player in a spot that has someone in it. */
export function setSpot(state: RunState, spot: number, p: RosterPlayer): void {
  if (spot < BENCH_START) state.roster[spot] = p;
  else state.bench[spot - BENCH_START] = p;
}

export function uniqueKind(roster: readonly RosterPlayer[], slot: number): boolean {
  const kind = roster[slot]?.kind;
  return kind !== undefined && roster.filter((p) => p.kind === kind).length === 1;
}

/** A player's stats with the team's perks (for everyone and for its kind), as it would play, before Monster Mash. */
export function fieldedStats(state: RunState, p: RosterPlayer): Stats {
  return plus(plus(p.stats, state.perks.all), state.perks.byKind[p.kind] ?? ZERO);
}

/** A roster player's stats in play: its own, plus the perks for everyone and for its kind, plus Monster Mash. */
export function playerStats(state: RunState, slot: number): Stats {
  const p = state.roster[slot];
  if (!p) return even(50);
  const mash = uniqueKind(state.roster, slot) ? even(MONSTER_MASH_BONUS) : ZERO;
  return plus(plus(plus(p.stats, state.perks.all), state.perks.byKind[p.kind] ?? ZERO), mash);
}

// ── The offer ───────────────────────────────────────────────────────────────

/**
 * TRICK OR TREAT!'s two cards: a new player, and a stat boost for one of
 * yours (ZONE_OFFER: by the zone of the drive about to be played).
 */
export function rollOffer(state: RunState): Perk[] {
  const rng = rngFor(state.seed, 'perks', state.drivesWon);
  const zone = ZONE_OFFER[Math.min(state.drive.area, ZONE_OFFER.length - 1)] ?? ZONE_OFFER[0];
  if (!zone) return [];
  return [
    { rarity: 'common', kind: 'recruit', player: makeRecruit(rng, zone.recruitTotal) },
    statBoost(state, rng, zone.boostTotal),
  ];
}

/** A boost for one field player: half of `total` on its position's main stat, a quarter on each other. */
function statBoost(state: RunState, rng: Rng, total: number): Perk {
  const spot = rng.int(0, state.roster.length - 1);
  const role = ROSTER_ROLES[spot];
  const main = POSITION_STAT[role && role !== 'qb' ? role : 'catcher'];
  return {
    rarity: 'common',
    kind: 'playerStat',
    spot,
    name: state.roster[spot]?.name ?? '?',
    main,
    boost: { ...even(total / 4), [main]: total / 2 },
  };
}

/** The position a player's best stat suits (a tie, at random among them). */
function suits(rng: Rng, stats: Stats): Position {
  const best = Math.max(...POSITIONS.map((p) => stats[POSITION_STAT[p]]));
  return rng.pick(POSITIONS.filter((p) => stats[POSITION_STAT[p]] === best));
}

/** How much each stat of a recruit may wander from its kind's shape (a share, either way). */
const RECRUIT_SPREAD = 0.2;

/**
 * A recruit: a random kind, and stats adding up to `total`, shared out in
 * the shape of its kind (a Ghost mostly Hands, a Golem mostly Heft; a Human
 * evenly), each share nudged a little at random, in fives.
 */
function makeRecruit(rng: Rng, total: number): RosterPlayer {
  const kind = rng.pick(KINDS);
  const shape = plus(BASE_STATS, FORM_STATS[kind]);
  const weight = (k: keyof Stats): number => shape[k] * (1 + RECRUIT_SPREAD * (2 * rng.next() - 1));
  const w = { hustle: weight('hustle'), hands: weight('hands'), heft: weight('heft') };
  const sum = w.hustle + w.hands + w.heft;
  const fives = (x: number): number => 5 * Math.round((total * x) / sum / 5);
  const rounded = { hustle: fives(w.hustle), hands: fives(w.hands), heft: fives(w.heft) };
  // Rounding can leave it a five off: put the difference on its biggest stat.
  const biggest = STATS.reduce((a, b) => (rounded[b] > rounded[a] ? b : a));
  const stats: Stats = {
    ...rounded,
    [biggest]: rounded[biggest] + total - (rounded.hustle + rounded.hands + rounded.heft),
  };
  return { name: rng.pick(RECRUIT_NAMES[kind]), kind, preferred: suits(rng, stats), stats };
}

// ── Taking a perk ───────────────────────────────────────────────────────────

/** Apply a perk to the team (a recruit and a player's stat boost are handled by `pick`, in run.ts). */
export function applyPerk(perks: Perks, perk: Perk): void {
  switch (perk.kind) {
    case 'allStat':
      perks.all = plus(perks.all, { ...ZERO, [perk.stat]: perk.amount });
      break;
    case 'kindStat':
      perks.byKind = {
        ...perks.byKind,
        [perk.form]: plus(perks.byKind[perk.form] ?? ZERO, { ...ZERO, [perk.stat]: perk.amount }),
      };
      break;
    case 'extraSweep':
      perks.extraScans += 1;
      break;
    case 'slowSweep':
      perks.sweepScale *= 0.75;
      break;
    case 'secondWind':
      perks.secondWind = true;
      break;
    case 'magnet':
      perks.magnet = true;
      break;
    case 'hotArm':
      perks.throwScale *= 2;
      break;
    case 'recruit':
    case 'playerStat':
      break;
  }
}
