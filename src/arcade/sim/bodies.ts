/**
 * Stats into physics (GAMEPLAY.md, Your Team): Heft is weight, Hustle is
 * speed, Hands is reach. And lining both teams up for a down.
 */
import { DEFENDERS, type DefenseSpec } from '../content/defense';
import { arcadeTuning } from '../content/tuning';
import { FORM_STATS, LINEUP, QB_DEPTH, ROLE_RADIUS, ROLE_STATS } from '../content/team';
import type { Play } from '../content/plays';
import type { Defender, Drive, Player, RosterPlayer, Stats } from './types';
import { add, v } from './vec';

/** The physics a set of stats gives a body. */
export function physicsOf(stats: Stats): { mass: number; speed: number; reach: number } {
  const b = arcadeTuning.body;
  return {
    mass: b.mass.perHeft ** stats.heft,
    speed: Math.max(b.speed.min, b.speed.base + b.speed.perHustle * stats.hustle),
    reach: Math.max(b.reach.min, b.reach.base + b.reach.perHands * stats.hands),
  };
}

const plus = (a: Stats, b: Stats, k = 1): Stats => ({
  hustle: a.hustle + b.hustle * k,
  hands: a.hands + b.hands * k,
  heft: a.heft + b.heft * k,
});

/** A roster player's stats: its role's, its form's, and its training. */
export function rosterStats(p: RosterPlayer): Stats {
  return plus(plus(ROLE_STATS[p.role], FORM_STATS[p.form]), p.training);
}

const even = (n: number): Stats => ({ hustle: n, hands: n, heft: n });

/**
 * Your team for a down: the QB behind the line of scrimmage, and the seven
 * lined up with the play's assignments (mirrored if `flipped`). Route
 * waypoints become field positions.
 */
export function lineUpTeam(
  roster: readonly RosterPlayer[],
  play: Play,
  flipped: boolean,
  los: number,
  firstId: number,
): Player[] {
  const mirror = flipped ? -1 : 1;
  const qbStats = ROLE_STATS.qb;
  const qb: Player = {
    id: firstId,
    side: 'team',
    role: 'qb',
    slot: -1,
    form: 'human',
    pos: v(0, los - QB_DEPTH),
    vel: v(0, 0),
    radius: ROLE_RADIUS.qb,
    stats: qbStats,
    ...physicsOf(qbStats),
    down: 0,
    job: { kind: 'qb' },
  };
  const seven = roster.map((p, slot): Player => {
    const spot = LINEUP[slot] ?? v(0, 0);
    const start = v(spot.x * mirror, los + spot.y);
    const a = play.slots[slot] ?? { kind: 'block' };
    const stats = rosterStats(p);
    return {
      id: firstId + 1 + slot,
      side: 'team',
      role: p.role,
      slot,
      form: p.form,
      pos: start,
      vel: v(0, 0),
      radius: ROLE_RADIUS[p.role],
      stats,
      ...physicsOf(stats),
      down: 0,
      job:
        a.kind === 'route'
          ? { kind: 'route', to: a.to.map((w) => add(start, v(w.x * mirror, w.y))), index: 0 }
          : { kind: 'block' },
    };
  });
  return [qb, ...seven];
}

/**
 * A drive's defense against the line of scrimmage, `boost` added to every
 * defender's stats. The Owl hangs past the first-down line; on the Boss
 * drive nobody lines up past the back of the end zone.
 */
export function lineUpDefense(
  spec: DefenseSpec,
  drive: Drive,
  boost: number,
  firstId: number,
): Defender[] {
  const { los, firstDown, kind } = drive;
  const loop = arcadeTuning.defense.batLoop;
  return spec.defenders.map((spot, i): Defender => {
    const def = DEFENDERS[spot.kind];
    let y = spot.kind === 'safety' ? Math.max(los + 8, firstDown + 1) : los + spot.y;
    if (kind === 'boss') y = Math.min(y, firstDown + 9);
    const home = v(spot.x, y);
    const stats = plus(def.stats, even(boost));
    const patrol =
      spot.kind === 'bat'
        ? [
            home,
            v(home.x + loop, home.y),
            v(home.x + loop, home.y + loop),
            v(home.x, home.y + loop),
          ]
        : null;
    return {
      id: firstId + i,
      side: 'defense',
      kind: spot.kind,
      planted: def.planted,
      pos: home,
      vel: v(0, 0),
      radius: def.radius,
      stats,
      ...physicsOf(stats),
      down: 0,
      home,
      mark: null,
      latch: null,
      patrol,
      patrolIndex: 1,
    };
  });
}
