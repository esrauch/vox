/**
 * Your team between plays (GAMEPLAY.md, Your Team and Building Up): every
 * player's stats with the perks and Monster Mash added, the TRICK OR TREAT!
 * offer, and taking a perk.
 */
import {
  ALL_STAT_BONUS,
  KIND_STAT_BONUS,
  MONSTER_MASH_BONUS,
  PERK_RARITY,
  POSITIONS,
  RARITY_WEIGHT,
  RECRUIT_NAMES,
  RECRUIT_STAR_BONUS,
  STARTING_NAMES,
} from '../content/perks';
import { BASE_STATS, FORM_STATS, ROSTER_ROLES } from '../content/team';
import type { Rng } from '../../sim/rng';
import { rngFor } from './random';
import type { Form, Perk, Perks, Position, Rarity, RosterPlayer, RunState, Stats } from './types';

const STATS: readonly (keyof Stats)[] = ['hustle', 'hands', 'heft'];
const KINDS: readonly Form[] = ['human', 'ghost', 'golem', 'werewolf'];
const ZERO: Stats = { hustle: 0, hands: 0, heft: 0 };

const plus = (a: Stats, b: Stats, k = 1): Stats => ({
  hustle: a.hustle + b.hustle * k,
  hands: a.hands + b.hands * k,
  heft: a.heft + b.heft * k,
});
const even = (n: number): Stats => ({ hustle: n, hands: n, heft: n });

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
export function uniqueKind(roster: readonly RosterPlayer[], slot: number): boolean {
  const kind = roster[slot]?.kind;
  return kind !== undefined && roster.filter((p) => p.kind === kind).length === 1;
}

/** A roster player's stats in play: its own, plus the perks for everyone and for its kind, plus Monster Mash. */
export function playerStats(state: RunState, slot: number): Stats {
  const p = state.roster[slot];
  if (!p) return even(50);
  const mash = uniqueKind(state.roster, slot) ? even(MONSTER_MASH_BONUS) : ZERO;
  return plus(plus(plus(p.stats, state.perks.all), state.perks.byKind[p.kind] ?? ZERO), mash);
}

// ── The offer ───────────────────────────────────────────────────────────────

/** Three perks, each of a rarity drawn by RARITY_WEIGHT, never the same perk twice. */
export function rollOffer(state: RunState): Perk[] {
  const rng = rngFor(state.seed, 'perks', state.drivesWon);
  const offer: Perk[] = [];
  for (let tries = 0; offer.length < 3 && tries < 40; tries++) {
    const perk = drawPerk(state, rng, drawRarity(rng));
    if (perk && !offer.some((o) => sameAs(o, perk))) offer.push(perk);
  }
  return offer;
}

function drawRarity(rng: Rng): Rarity {
  const r = rng.next();
  if (r < RARITY_WEIGHT.epic) return 'epic';
  if (r < RARITY_WEIGHT.epic + RARITY_WEIGHT.rare) return 'rare';
  return 'common';
}

function drawPerk(state: RunState, rng: Rng, rarity: Rarity): Perk | null {
  // Recruits come at every rarity; the rest come at their own.
  if (rng.next() < 0.3) return { rarity, kind: 'recruit', player: makeRecruit(rng, rarity) };
  const kinds = (Object.keys(PERK_RARITY) as (keyof typeof PERK_RARITY)[]).filter(
    (k) => PERK_RARITY[k] === rarity && !owned(state.perks, k),
  );
  if (kinds.length === 0) return null;
  const kind = rng.pick(kinds);
  const stat = rng.pick(STATS);
  switch (kind) {
    case 'allStat':
      return { rarity, kind, stat, amount: ALL_STAT_BONUS };
    case 'kindStat':
      // A kind you have on the team, so it's worth something.
      return {
        rarity,
        kind,
        stat,
        form: rng.pick(state.roster.map((p) => p.kind)),
        amount: KIND_STAT_BONUS,
      };
    default:
      return { rarity, kind };
  }
}

/** The one-off perks can only be had once. */
function owned(perks: Perks, kind: keyof typeof PERK_RARITY): boolean {
  return (
    (kind === 'secondWind' && perks.secondWind) ||
    (kind === 'magnet' && perks.magnet) ||
    (kind === 'hotArm' && perks.throwScale > 1)
  );
}

function sameAs(a: Perk, b: Perk): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'allStat' && b.kind === 'allStat') return a.stat === b.stat;
  if (a.kind === 'kindStat' && b.kind === 'kindStat') return a.stat === b.stat && a.form === b.form;
  return a.kind !== 'recruit';
}

/** A recruit: a name, a kind (monsters are rarer), a position it prefers, and stats to match. */
function makeRecruit(rng: Rng, rarity: Rarity): RosterPlayer {
  const kind: Form = rarity === 'common' ? 'human' : rng.pick(KINDS.filter((k) => k !== 'human'));
  const preferred: Position = rng.pick(POSITIONS);
  const star = rarity === 'epic' ? RECRUIT_STAR_BONUS : 0;
  // Each stat a little either way (in fives), so no two are quite alike.
  const jitter = (): number => 5 * rng.int(-1, 2);
  const base = plus(BASE_STATS, FORM_STATS[kind]);
  return {
    name: rng.pick(RECRUIT_NAMES[kind]),
    kind,
    preferred,
    stats: {
      hustle: base.hustle + star + jitter(),
      hands: base.hands + star + jitter(),
      heft: base.heft + star + jitter(),
    },
  };
}

// ── Taking a perk ───────────────────────────────────────────────────────────

/** Apply a perk to the team (a recruit is placed separately, once you've chosen its slot). */
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
      break;
  }
}
