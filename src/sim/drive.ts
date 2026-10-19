/**
 * Building drives and downs (GAMEPLAY.md, The Run and A Drive): each area's
 * four drives (content/areas.ts), the defense lined up against the line of
 * scrimmage every down, the hazards, and your players from the called card.
 */
import { AREAS, type DefenseSpec } from '../content/areas';
import { flipPlayer, playCard } from '../content/cards';
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { COLS, END_ROW, MID_COL, eq, vec } from './grid';
import { createRng, deriveSeed } from './rng';
import { playerSkills, playerStats } from './roster';
import type { Defender, DriveKind, Hazard, PlayerUnit, RosterPlayer, Stats, Vec } from './types';

export const DRIVE_KINDS: readonly DriveKind[] = ['intro', 'challenge', 'gimmick', 'boss'];

/** The defense for a drive: the area's Intro, Challenge, a seeded Gimmick, or its Boss. */
export function defenseFor(seed: number, area: number, index: number): DefenseSpec {
  const def = AREAS[area % AREAS.length] ?? AREAS[0];
  if (!def) throw new Error('No areas defined');
  switch (DRIVE_KINDS[index]) {
    case 'intro':
      return def.intro;
    case 'challenge':
      return def.challenge;
    case 'gimmick':
      return createRng(deriveSeed(seed, 'gimmick', area)).pick(def.gimmicks);
    default:
      return def.boss;
  }
}

/** Where the QB stands for a down: in the middle, a little behind the line of scrimmage. */
export function qbTile(los: number): Vec {
  return vec(MID_COL, Math.max(0, los - tuning.drive.qbDepth));
}

/**
 * How much stiffer the defense is: +1 to every stat each area after the
 * first, and again on the Boss drive (GAMEPLAY.md, The Defense).
 */
export function defenseBoost(area: number, kind: DriveKind): number {
  return area * tuning.defense.perArea + (kind === 'boss' ? tuning.defense.boss : 0);
}

/**
 * Line the defense up for a down. Spots are relative to the line of
 * scrimmage; the Safety always sits deep, at the first-down line (or a few
 * yards past the line of scrimmage once that's close). Bats get their box.
 * `boost` is added to every defender's stats (defenseBoost).
 */
export function lineUpDefense(
  spec: DefenseSpec,
  los: number,
  firstDown: number,
  firstId: number,
  boost = 0,
): Defender[] {
  const taken: Vec[] = [];
  // Near the first-down line there's less field left: the defense keeps its
  // shape but squeezes evenly into the room up to the top, rather than piling
  // up against the edge.
  const deepest = Math.max(1, ...spec.defenders.map((d) => d.y));
  const squeeze = Math.min(1, (END_ROW - 1 - los) / deepest);
  return spec.defenders.map((spot, i) => {
    const row =
      spot.kind === 'safety'
        ? Math.max(los + 8, firstDown + 2)
        : los + Math.max(1, Math.round(spot.y * squeeze));
    const pos = freeTile(vec(spot.x, Math.min(END_ROW, row)), taken);
    const patrol = DEFENDERS[spot.kind].job === 'patrol' ? boxCircuit(pos, los + 2) : null;
    // A Bat starts on its circuit: the first tile of it nobody has taken.
    const patrolIndex = patrol
      ? Math.max(
          0,
          patrol.findIndex((t) => !taken.some((u) => eq(u, t))),
        )
      : 0;
    const start = patrol?.[patrolIndex] ?? pos;
    taken.push(start);
    return {
      id: firstId + i,
      side: 'defender',
      kind: spot.kind,
      pos: start,
      home: start,
      stats: boosted(DEFENDERS[spot.kind].stats, boost),
      downTicks: 0,
      intent: null,
      patrol,
      patrolIndex,
      marking: null,
    };
  });
}

function boosted(stats: Stats, boost: number): Stats {
  return { hustle: stats.hustle + boost, hands: stats.hands + boost, heft: stats.heft + boost };
}

/** The nearest free tile on the same row (so two defenders never line up on one tile). */
function freeTile(want: Vec, taken: readonly Vec[]): Vec {
  for (let off = 0; off < COLS; off++) {
    for (const x of [want.x + off, want.x - off]) {
      const v = vec(Math.max(0, Math.min(COLS - 1, x)), want.y);
      if (!taken.some((t) => eq(t, v))) return v;
    }
  }
  return want;
}

/** The size of a patrol's square circuit (tiles: 3 yards). */
const BOX = 6;

/**
 * A 6×6 box of tiles, walked clockwise around its edge (20 tiles), with its
 * bottom-left corner near `near` but kept on the field and at or above `minRow`.
 */
export function boxCircuit(near: Vec, minRow = 1): Vec[] {
  const x0 = Math.max(0, Math.min(COLS - BOX, near.x));
  const y0 = Math.max(minRow, Math.min(END_ROW - BOX, near.y));
  const out: Vec[] = [];
  for (let y = y0; y < y0 + BOX - 1; y++) out.push(vec(x0, y)); // up the left side
  for (let x = x0; x < x0 + BOX - 1; x++) out.push(vec(x, y0 + BOX - 1)); // along the top
  for (let y = y0 + BOX - 1; y > y0; y--) out.push(vec(x0 + BOX - 1, y)); // down the right side
  for (let x = x0 + BOX - 1; x > x0; x--) out.push(vec(x, y0)); // back along the bottom
  return out;
}

/** A drive's Witches: each on its own row between the start and the first-down line, flying a random way. */
export function driveHazards(
  seed: number,
  driveNumber: number,
  spec: DefenseSpec,
  start: number,
  firstDown: number,
  firstId: number,
): Hazard[] {
  const rng = createRng(deriveSeed(seed, 'hazards', driveNumber));
  const rows: number[] = [];
  const hazards: Hazard[] = [];
  for (let i = 0; i < spec.witches; i++) {
    let row = rng.int(start + 6, firstDown - 2);
    for (let tries = 0; rows.includes(row) && tries < 10; tries++) {
      row = rng.int(start + 6, firstDown - 2);
    }
    rows.push(row);
    hazards.push({
      id: firstId + i,
      kind: 'witch',
      row,
      startX: rng.int(0, COLS - 1),
      dir: rng.int(0, 1) === 0 ? 1 : -1,
    });
  }
  return hazards;
}

/**
 * Your players for a called card, lined up on the line of scrimmage. Your
 * roster fills the play's spots from left to right, after the flip
 * (GAMEPLAY.md, A Down), so Flip also decides who runs which route. The
 * players stay in the card's order (a handoff names its runner by index).
 */
export function formation(
  cardId: string,
  flipped: boolean,
  los: number,
  firstId: number,
  roster: readonly RosterPlayer[],
): PlayerUnit[] {
  const spots = playCard(cardId).players.map((cp) => {
    const p = flipPlayer(cp, flipped);
    return vec(Math.max(0, Math.min(COLS - 1, MID_COL + p.x)), Math.max(0, los + p.y));
  });
  const order = spots
    .map((pos, i) => ({ pos, i }))
    .sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y || a.i - b.i)
    .map((s) => s.i);
  return playCard(cardId).players.map((cp, i) => {
    const slot = order.indexOf(i);
    const skills = playerSkills(roster, slot);
    return {
      id: firstId + i,
      side: 'player',
      slot,
      form: roster[slot]?.form ?? 'human',
      stats: playerStats(roster, slot),
      pos: spots[i] ?? vec(MID_COL, los),
      route: flipPlayer(cp, flipped).route,
      routeStep: 0,
      rerolls: skills.rerolls,
      frenzy: skills.frenzy,
      frenzyReady: [],
      downTicks: 0,
      intent: null,
    };
  });
}

/** How long the pocket holds for a play: longer with blockers at home, shorter against more rushers. */
export function pocketTicks(blockers: number, rushers: number): number {
  const p = tuning.pocket;
  return Math.max(
    p.minTicks,
    p.ticks + p.perBlocker * blockers - p.perExtraRusher * Math.max(0, rushers - 1),
  );
}
