import { describe, expect, it } from 'vitest';
import { PLAYBOOK } from '../../src/content/cards';
import { tuning } from '../../src/content/tuning';
import { chance, check, checkEdge } from '../../src/sim/checks';
import { catchChance, openness } from '../../src/sim/coverage';
import { arcPeak, flightTicks } from '../../src/sim/flight';
import { boxCircuit, pocketTicks, qbTile } from '../../src/sim/drive';
import { COLS, ROWS, key, vec } from '../../src/sim/grid';
import { witchColumn } from '../../src/sim/hazards';
import { replay, type Input } from '../../src/sim/replay';
import {
  createRun,
  dispatch,
  downAndDistance,
  endDown,
  nextDown,
  yardsText,
} from '../../src/sim/run';
import { playerSkills, playerStats, startingRoster, teamHand } from '../../src/sim/roster';
import { step } from '../../src/sim/step';
import type { Hazard, RunState, SimEvent } from '../../src/sim/types';
import { DUD, STAR, carry, defender, ofType, playState, player, run, seedWhere } from './helpers';

// The field is half-yard tiles: every row is half a yard, and everyone hops every tick.
const PAUSE = tuning.drive.pauseTicks;

describe('a run', () => {
  it('starts on the first drive: 1st & 10, a hand of three, the defense lined up', () => {
    const state = createRun(1);
    expect(state.phase).toBe('setup');
    expect(state.drive).toMatchObject({ index: 0, kind: 'intro', down: 1, los: 3, firstDown: 23 });
    expect(downAndDistance(state)).toBe('1st & 10');
    expect(state.deck.hand).toHaveLength(3);
    expect(state.deck.owned).toEqual(PLAYBOOK);
    expect(state.roster.map((p) => p.form)).toEqual(['human', 'human', 'human', 'human']);
    expect(state.screen.players).toHaveLength(0); // nobody lines up until you call a play
    expect(state.screen.defenders.length).toBeGreaterThan(0);
    expect(state.screen.qb).toEqual(vec(5, 0));
  });

  it('calling a play lines your players up for it; Flip mirrors it', () => {
    const state = createRun(1);
    const called = dispatch(state, { type: 'call', hand: 0 }).state;
    expect(called.called).toEqual({ hand: 0, flipped: false });
    expect(called.screen.players.length).toBeGreaterThan(0);
    const flipped = dispatch(called, { type: 'flip' }).state;
    const xs = (s: RunState) => s.screen.players.map((p) => p.pos.x).sort();
    expect(xs(flipped)).toEqual(
      xs(called)
        .map((x) => COLS - 1 - x)
        .sort(),
    );
  });

  it('HIKE needs a called play; it discards the hand, picks marks and starts the pocket clock', () => {
    let state = createRun(1);
    expect(dispatch(state, { type: 'hike' }).state.phase).toBe('setup');
    state = { ...state, deck: { ...state.deck, hand: ['go', 'slant', 'out'] } };
    const hiked = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, {
      type: 'hike',
    }).state;
    expect(hiked.phase).toBe('play');
    expect(hiked.deck.hand).toHaveLength(0);
    expect(hiked.deck.discard).toHaveLength(3);
    const marks = hiked.screen.defenders.filter((d) => d.kind === 'cover').map((d) => d.marking);
    expect(marks.every((m) => m !== null)).toBe(true);
    expect(new Set(marks).size).toBe(marks.length);
    expect(hiked.pocket).toEqual({ total: tuning.pocket.ticks, left: tuning.pocket.ticks });
  });

  it('a Run hands the ball off at the snap: no pocket clock, so no sack', () => {
    let state = createRun(1);
    state = { ...state, deck: { ...state.deck, hand: ['run', 'go', 'slant'] } };
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(state.screen.ball).toEqual({ at: 'carried', by: state.screen.players[0]!.id });
    expect(state.pocket).toBeNull();
  });

  it('the tick runs before the snap, and carries on through HIKE', () => {
    let state = run(createRun(1), 3).state;
    expect(state.phase).toBe('setup');
    expect(state.tick).toBe(3);
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(step(state).state.tick).toBe(4);
  });

  it('shows distances in yards, with halves', () => {
    expect([20, 9, 1, 0, -4].map(yardsText)).toEqual(['10', '4½', '½', '0', '-2']);
  });
});

describe('routes', () => {
  it('each player takes one move of its route per tick, then stands', () => {
    let state = playState([{ pos: vec(1, 3), route: 'URU' }]);
    const at = () => player(state, 100).pos;
    state = run(state, 1).state;
    expect(at()).toEqual(vec(1, 4));
    state = run(state, 1).state;
    expect(at()).toEqual(vec(2, 4));
    state = run(state, 1).state;
    expect(at()).toEqual(vec(2, 5));
    state = run(state, 3).state;
    expect(at()).toEqual(vec(2, 5)); // the route ran out
  });

  it('the carrier ignores its route and runs straight up', () => {
    const state = carry(playState([{ pos: vec(1, 8), route: 'RRRR' }]), 100);
    expect(player(run(state, 1).state, 100).pos).toEqual(vec(1, 9));
  });
});

describe('blocking: players and defenders never share a tile', () => {
  it('a player waits rather than step into a defender', () => {
    const state = playState([{ pos: vec(2, 3), route: 'U' }], [{ kind: 'zone', pos: vec(2, 4) }]);
    expect(player(run(state, 1).state, 100).pos).toEqual(vec(2, 3));
  });
});

describe('the pocket', () => {
  it('holds longer with blockers at home, and shorter against more Blitzers', () => {
    const p = tuning.pocket;
    expect(pocketTicks(0, 1)).toBe(p.ticks);
    expect(pocketTicks(2, 1)).toBe(p.ticks + 2 * p.perBlocker);
    expect(pocketTicks(0, 3)).toBe(Math.max(p.minTicks, p.ticks - 2 * p.perExtraRusher));
    let state = createRun(1);
    state = { ...state, deck: { ...state.deck, hand: ['screen', 'go', 'slant'] } };
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(state.pocket?.total).toBe(pocketTicks(2, 1)); // the Screen keeps two blockers home
  });

  it('when the pocket clock runs out with the ball still in hand, it is a sack: 2 yards lost', () => {
    const state = playState([]);
    state.drive.los = 9;
    Object.assign(state.screen, { qb: qbTile(9) });
    state.pocket = { total: 4, left: 4 };
    expect(ofType(run(state, 3).events, 'sacked')).toHaveLength(0);
    const r = run(state, 4);
    expect(ofType(r.events, 'sacked')).toEqual([{ type: 'sacked', by: null }]);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'sacked',
      gained: -4,
    });
    expect(r.state.drive.los).toBe(5);
  });

  it('the clock stops once the ball is thrown', () => {
    const state = playState([{ pos: vec(1, 8), route: '.' }]);
    state.pocket = { total: 12, left: 12 };
    expect(step(state, { throwAt: vec(1, 8) }).state.pocket).toBeNull();
  });

  it("can't push you back behind the drive's starting line", () => {
    const state = playState([]);
    state.pocket = { total: 2, left: 2 };
    const r = run(state, 2);
    expect(r.state.drive.los).toBe(3);
    expect(ofType(r.events, 'downEnded')[0]?.gained).toBe(0);
  });
});

describe('checks', () => {
  it('favor you: even is 60%, +4 or better is certain, and there is always a long shot', () => {
    expect(chance(0)).toBe(0.6);
    expect(chance(4)).toBe(1);
    expect(chance(9)).toBe(1);
    expect(chance(-4)).toBe(0.1);
    expect(chance(-20)).toBe(0.1);
    for (let e = -4; e < 4; e++) expect(chance(e + 1)).toBeGreaterThan(chance(e));
  });

  it('a reroll skill rolls a failure again; Frenzy readies an edge after a success', () => {
    // Over many seeds, an even shake succeeds more often with a reroll.
    const rate = (rerolls: ('shake' | 'catch' | 'break')[]) => {
      let won = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const s = playState(
          [{ pos: vec(5, 10), rerolls }],
          [{ kind: 'cover', pos: vec(5, 11), stats: { hustle: 0 } }],
          seed,
        );
        if (check(s, 'shake', player(s, 100), defender(s, 200))) won++;
      }
      return won / 300;
    };
    expect(rate(['shake'])).toBeGreaterThan(rate([]) + 0.15);

    const s = playState(
      [{ pos: vec(5, 10), stats: STAR, frenzy: ['break'] }],
      [{ kind: 'cover', pos: vec(5, 11) }],
    );
    const wolf = player(s, 100);
    expect(check(s, 'break', wolf, defender(s, 200))).toBe(true);
    expect(wolf.frenzyReady).toEqual(['break']);
    expect(checkEdge(s, 'break', wolf, defender(s, 200))).toBe(
      9 - defender(s, 200).stats.heft + tuning.checks.frenzy,
    );
  });
});

describe('tackles', () => {
  // A carrier on (5, 10) and a Cover two tiles ahead: they meet on (5, 11) on the first tick.
  const meeting = (stats = DUD, seed = 1) =>
    carry(playState([{ pos: vec(5, 10), stats }], [{ kind: 'cover', pos: vec(5, 12) }], seed), 100);
  const tackledOn = (state: RunState) => ofType(step(state).events, 'tackled').length > 0;

  it('a defender meeting the carrier, with both checks lost, tackles it: the next down starts there', () => {
    const state = seedWhere((seed) => meeting(DUD, seed), tackledOn);
    const r = run(state, 1);
    expect(ofType(r.events, 'tackled')).toEqual([{ type: 'tackled', id: 100, by: 200 }]);
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'tackled', gained: 8 },
    ]);
    expect(r.state.phase).toBe('downOver');
    const next = run(r.state, PAUSE).state;
    expect(next.phase).toBe('setup');
    expect(next.drive).toMatchObject({ down: 2, los: 11 });
    expect(next.screen.qb).toEqual(qbTile(11));
    expect(downAndDistance(next)).toBe('2nd & 6');
  });

  it('a carrier far ahead on Hustle always shakes the tackler, who stumbles and is left behind', () => {
    const r = run(meeting({ hustle: 9, hands: 0, heft: -9 }), 8);
    expect(ofType(r.events, 'shook')[0]).toEqual({ type: 'shook', id: 100, defender: 200 });
    expect(ofType(r.events, 'downEnded')).toHaveLength(0);
    expect(player(r.state, 100).pos.y).toBe(18);
  });

  it('a carrier far ahead on Heft breaks the tackle: the tackler goes down', () => {
    const r = run(meeting({ hustle: -9, hands: 0, heft: 9 }), 8);
    expect(ofType(r.events, 'brokeTackle')[0]).toEqual({
      type: 'brokeTackle',
      id: 100,
      defender: 200,
    });
    expect(ofType(r.events, 'downEnded')).toHaveLength(0);
  });

  it('a defender right behind the carrier tries to tackle it (no trailing it up the field)', () => {
    const behind = (seed: number) =>
      carry(
        playState([{ pos: vec(5, 10), stats: DUD }], [{ kind: 'cover', pos: vec(5, 9) }], seed),
        100,
      );
    const state = seedWhere(behind, tackledOn);
    expect(ofType(step(state).events, 'tackled')).toEqual([{ type: 'tackled', id: 100, by: 200 }]);
  });

  it('a chaser that hops up beside the carrier tries to tackle it', () => {
    // The Cover on (4, 11) comes down to (4, 10) as the carrier hops up to (5, 10): side by side.
    const beside = (seed: number) =>
      carry(
        playState([{ pos: vec(5, 9), stats: DUD }], [{ kind: 'cover', pos: vec(4, 11) }], seed),
        100,
      );
    expect(ofType(step(seedWhere(beside, tackledOn)).events, 'tackled')[0]?.by).toBe(200);
  });

  it('the safety net: each failed check in a row makes the next of its kind easier', () => {
    const state = meeting({ hustle: 0, hands: 0, heft: 0 });
    const carrier = player(state, 100);
    const cover = defender(state, 200);
    const before = checkEdge(state, 'shake', carrier, cover);
    state.roster[0]!.streak.shake = 2;
    expect(checkEdge(state, 'shake', carrier, cover)).toBe(before + 2 * tuning.checks.safetyNet);
    // A success resets it.
    const won = run(meeting({ hustle: 9, hands: 0, heft: 0 }), 1);
    expect(won.state.roster[0]!.streak.shake).toBe(0);
  });
});

describe('coverage rings', () => {
  // A receiver on (5, 11) (or wherever) and one defender on (5, 10).
  const ringAt = (kind: 'cover' | 'zone' | 'safety' | 'bat', at = vec(5, 11), stats = {}) => {
    const s = playState([{ pos: at, stats }], [{ kind, pos: vec(5, 10) }]);
    return openness(s, player(s, 100));
  };

  it('a receiver right beside a Cover is contested: about a coin flip with even Hands', () => {
    expect(ringAt('cover')).toBe('tight');
    expect(ringAt('cover', vec(5, 13))).toBe('open');
  });

  it('better Hands turn the same coverage green, worse turn it red', () => {
    expect(ringAt('cover', vec(5, 11), { hands: 4 })).toBe('open');
    expect(ringAt('cover', vec(5, 11), { hands: -3 })).toBe('covered');
  });

  it('a Scarecrow\u2019s ring contests a wide area; the Safety only right beside it', () => {
    expect(ringAt('zone', vec(5, 13))).not.toBe('open');
    expect(ringAt('safety', vec(8, 10))).toBe('open');
  });

  it('a knocked-down defender contests nothing', () => {
    const s = playState([{ pos: vec(5, 11) }], [{ kind: 'cover', pos: vec(5, 10) }]);
    s.screen.defenders[0]!.downTicks = 2;
    expect(catchChance(s, player(s, 100))).toBe(1);
  });
});

describe('passes', () => {
  // The receiver stands on (5, 10), ten tiles from the QB: a quick pass lands two ticks later.
  const pass = (
    defenders: Parameters<typeof playState>[1],
    target = vec(5, 10),
    ticks = 2,
    stats = {},
    seed = 1,
  ) => {
    const state = playState([{ pos: vec(5, 10), route: '.', stats }], defenders, seed);
    return run(step(state, { throwAt: target }).state, ticks);
  };

  it('to an open receiver is a catch, with no check; right on it is perfect', () => {
    const r = pass([]);
    expect(ofType(r.events, 'caught')).toEqual([
      { type: 'caught', id: 100, quality: 'perfect', contested: false },
    ]);
  });

  it('contested, a receiver far ahead on Hands wins the catch', () => {
    const r = pass([{ kind: 'cover', pos: vec(5, 11) }], vec(5, 10), 2, STAR);
    expect(ofType(r.events, 'caught')).toEqual([
      { type: 'caught', id: 100, quality: 'perfect', contested: true },
    ]);
  });

  it('contested and lost, the ball is knocked away: the down is used, no gain', () => {
    const r = seedWhere(
      (seed) => pass([{ kind: 'cover', pos: vec(5, 11) }], vec(5, 10), 2, DUD, seed),
      (r) => ofType(r.events, 'dropped').length > 0,
    );
    expect(ofType(r.events, 'dropped')).toEqual([{ type: 'dropped', id: 100, by: 200 }]);
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'blocked', gained: 0 },
    ]);
    expect(run(r.state, PAUSE).state.drive).toMatchObject({ down: 2, los: 3 });
  });

  it('led away from the defender, the same receiver makes the catch uncontested', () => {
    const r = pass([{ kind: 'cover', pos: vec(5, 11) }], { x: 5, y: 8.9 });
    expect(ofType(r.events, 'caught')[0]?.contested).toBe(false);
  });

  it('a defender right beside the ball with no receiver near bats it down', () => {
    const r = pass([{ kind: 'cover', pos: vec(8, 10) }], vec(8.5, 10.5), 3);
    expect(ofType(r.events, 'blocked')).toEqual([{ type: 'blocked', by: 200, at: vec(8, 10) }]);
    expect(r.state.screen.ball).toEqual({ at: 'dead', pos: vec(8, 10), how: 'blocked' });
  });

  it('with nobody in reach is incomplete', () => {
    const r = pass([], vec(9, 12), 3);
    expect(ofType(r.events, 'incomplete')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'incomplete',
      gained: 0,
    });
  });

  it('a pass is catchable on its way down, short of the reticle', () => {
    // A long pass to (5, 20): it comes back down within reach from about row 17.
    const state = playState([{ pos: vec(5, 18), route: '.' }]);
    const r = run(step(state, { throwAt: vec(5, 20) }).state, 4);
    expect(ofType(r.events, 'caught')).toHaveLength(1);
    expect(r.state.screen.ball).toEqual({ at: 'carried', by: 100 });
  });

  it('the farther the pass, the higher it flies and the longer it takes', () => {
    expect(arcPeak(5)).toBeLessThan(arcPeak(10));
    expect(arcPeak(10)).toBeLessThan(arcPeak(20));
    expect(flightTicks(vec(5, 0), vec(5, 5))).toBe(1);
    expect(flightTicks(vec(5, 0), vec(5, 20))).toBe(3);
  });

  it('a short, low pass is batted down by a defender under its path', () => {
    // A 10-tile pass up the middle, a defender halfway along it.
    const r = pass([{ kind: 'zone', pos: vec(5, 5) }], vec(5, 10));
    expect(ofType(r.events, 'blocked')[0]?.by).toBe(200);
  });

  it('a long pass sails over a defender under its path, and is out of reach from the release', () => {
    const state = playState(
      [{ pos: vec(5, 20), route: '.' }],
      [
        { kind: 'zone', pos: vec(5, 2) },
        { kind: 'zone', pos: vec(5, 10) },
      ],
    );
    const r = run(step(state, { throwAt: vec(5, 20) }).state, 4);
    expect(ofType(r.events, 'blocked')).toHaveLength(0);
    expect(ofType(r.events, 'caught')).toHaveLength(1);
  });

  it('throw range is measured from the line of scrimmage', () => {
    const state = playState([{ pos: vec(5, 10) }]);
    const reason = (y: number) =>
      ofType(step(state, { throwAt: vec(5, y) }).events, 'throwRejected')[0]?.reason;
    expect(reason(0)).toBe('tooClose');
    expect(reason(1)).toBeUndefined(); // behind the line: a Screen
    expect(reason(ROWS - 1)).toBeUndefined();
    expect(reason(ROWS)).toBe('tooFar');
  });
});

describe('the defense', () => {
  it('a Cover follows its receiver one tick behind, so a cut opens a gap', () => {
    let state = playState(
      [{ pos: vec(2, 6), route: 'RRRR' }],
      [{ kind: 'cover', pos: vec(2, 8), marking: 100 }],
    );
    state = run(state, 2).state;
    expect(player(state, 100).pos).toEqual(vec(4, 6));
    expect(defender(state, 200).pos).toEqual(vec(2, 6));
    expect(openness(state, player(state, 100))).toBe('open');
  });

  it('a receiver making a cut shakes its Cover on a Hustle check: the Cover stumbles behind', () => {
    // Up two, then a cut to the right, with the Cover marking from right behind.
    const state = playState(
      [{ pos: vec(2, 6), route: 'UURRR', stats: STAR }],
      [{ kind: 'cover', pos: vec(2, 5), marking: 100 }],
    );
    const r = run(state, 3);
    expect(ofType(r.events, 'shook')).toEqual([{ type: 'shook', id: 100, defender: 200 }]);
    expect(defender(r.state, 200).downTicks).toBeGreaterThan(0);
    // No cut, no check.
    const straight = run(
      playState(
        [{ pos: vec(2, 6), route: 'UUUUU', stats: STAR }],
        [{ kind: 'cover', pos: vec(2, 5), marking: 100 }],
      ),
      3,
    );
    expect(ofType(straight.events, 'shook')).toHaveLength(0);
  });

  it('defenders chase the carrier after a catch, and the Safety gets into its column first', () => {
    const state = carry(
      playState(
        [{ pos: vec(1, 10) }],
        [
          { kind: 'cover', pos: vec(5, 4) },
          { kind: 'safety', pos: vec(5, 20) },
        ],
      ),
      100,
    );
    const r = run(state, 1).state;
    expect(defender(r, 200).pos).toEqual(vec(5, 5)); // up toward the carrier
    expect(defender(r, 201).pos).toEqual(vec(4, 20)); // across first
  });

  it('the Safety gets into the carrier’s column, then comes down to meet it', () => {
    const state = carry(
      playState([{ pos: vec(1, 10) }], [{ kind: 'safety', pos: vec(5, 20) }]),
      100,
    );
    const r = run(state, 12);
    const path = ofType(r.events, 'hop')
      .filter((e) => e.id === 200)
      .map((e) => key(e.to));
    expect(path.slice(0, 4)).toEqual(['4,20', '3,20', '2,20', '1,20']);
    expect(ofType(r.events, 'tackled')[0]?.by).toBe(200);
  });

  it('the Safety holds its row, sliding level with your deepest receiver', () => {
    const state = playState(
      [{ pos: vec(1, 16), route: '.' }],
      [{ kind: 'safety', pos: vec(5, 20) }],
    );
    expect(defender(run(state, 1).state, 200).pos).toEqual(vec(4, 20));
  });

  it('the Safety slides toward where a pass will land', () => {
    // Level with the deepest receiver (on column 2) until the throw, then toward the landing spot.
    const state = playState(
      [{ pos: vec(2, 10), route: '.' }],
      [{ kind: 'safety', pos: vec(5, 20) }],
    );
    const thrown = step(state, { throwAt: vec(8, 14) }).state;
    expect(defender(thrown, 200).pos).toEqual(vec(4, 20));
    expect(defender(run(thrown, 1).state, 200).pos).toEqual(vec(5, 20));
  });

  it('a Scarecrow never moves', () => {
    const state = carry(playState([{ pos: vec(5, 4) }], [{ kind: 'zone', pos: vec(5, 8) }]), 100);
    expect(defender(run(state, 6).state, 200).pos).toEqual(vec(5, 8));
  });
});

describe('Bats', () => {
  it('patrol a 6×6 box: 20 tiles clockwise, one hop apart, on the field', () => {
    const circuit = boxCircuit(vec(9, 24));
    expect(circuit).toHaveLength(20);
    for (const t of circuit) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(COLS);
      expect(t.y).toBeLessThan(ROWS);
    }
    circuit.forEach((t, i) => {
      const n = circuit[(i + 1) % circuit.length]!;
      expect(Math.abs(n.x - t.x) + Math.abs(n.y - t.y)).toBe(1);
    });
  });

  it('circle before the snap, while everyone else waits', () => {
    const state = createRun(1);
    const patrol = boxCircuit(vec(2, 8));
    const bat = {
      ...state.screen.defenders[0]!,
      id: 900,
      kind: 'bat' as const,
      pos: patrol[0]!,
      patrol,
      patrolIndex: 0,
    };
    const before = state.screen.defenders.map((d) => d.pos);
    state.screen.defenders.push(bat);
    const r = run(state, 4);
    expect(r.state.phase).toBe('setup');
    expect(defender(r.state, 900).patrolIndex).toBe(3); // the first tick sets its course
    expect(r.state.screen.defenders.slice(0, -1).map((d) => d.pos)).toEqual(before);
  });
});

describe('the Witch on a Broom', () => {
  const witch = (row: number, startX: number, dir: 1 | -1): Hazard => ({
    id: 900,
    kind: 'witch',
    row,
    startX,
    dir,
  });

  it('flies one tile per tick across her row and wraps to the other side', () => {
    expect([0, 1, 2, 3].map((t) => witchColumn(witch(6, 9, 1), t))).toEqual([9, 10, 0, 1]);
    expect([0, 1, 2, 3].map((t) => witchColumn(witch(6, 1, -1), t))).toEqual([1, 0, 10, 9]);
  });

  it('blocks a pass crossing her row near her', () => {
    // From the QB on (5, 0) to (5, 16): a pass thrown on tick 1, over row 8 on tick 2.
    const state = playState([{ pos: vec(5, 16), route: '.' }]);
    Object.assign(state.screen, { hazards: [witch(8, 3, 1)] });
    const r = run(step(state, { throwAt: vec(5, 16) }).state, 4);
    expect(ofType(r.events, 'blocked')).toEqual([{ type: 'blocked', by: 900, at: vec(5, 8) }]);
  });
});

describe('drives', () => {
  const wonDrive = () => run(carry(playState([{ pos: vec(5, 22) }]), 100), 1);

  it('the carrier over the first-down line wins the drive; then the draft', () => {
    const r = wonDrive();
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'firstDown', gained: 20 },
    ]);
    const draft = run(r.state, PAUSE).state;
    expect(draft.phase).toBe('draft');
    expect(draft.drivesWon).toBe(1);
    expect(draft.offer).toHaveLength(4);
  });

  it('the draft offers four picks: one or two transforms (different forms), the rest training', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const draft = run(
        run(carry(playState([{ pos: vec(5, 22) }], [], seed), 100), 1).state,
        PAUSE,
      ).state;
      expect(draft.offer).toHaveLength(4);
      const forms = draft.offer.flatMap((o) => (o.kind === 'transform' ? [o.form] : []));
      const stats = draft.offer.flatMap((o) => (o.kind === 'train' ? [o.stat] : []));
      expect(forms.length).toBeGreaterThanOrEqual(1);
      expect(forms.length).toBeLessThanOrEqual(2);
      expect(new Set(forms).size).toBe(forms.length);
      expect(new Set(stats).size).toBe(stats.length);
      counts.add(forms.length);
    }
    expect([...counts].sort()).toEqual([1, 2]);
  });

  it('a transform turns a random human into that monster, and starts the next drive', () => {
    const draft = run(wonDrive().state, PAUSE).state;
    const offer = draft.offer[0]!;
    if (offer.kind !== 'transform') throw new Error('expected a transform first');
    const r = dispatch(draft, { type: 'draft', offer: 0 });
    const changed = ofType(r.events, 'transformed')[0]!;
    expect(r.state.roster[changed.slot]!.form).toBe(offer.form);
    expect(r.state.roster.filter((p) => p.form === 'human')).toHaveLength(3);
    expect(r.state.phase).toBe('setup');
    expect(r.state.drive).toMatchObject({ index: 1, kind: 'challenge', down: 1, los: 3 });
    // The playbook never changes.
    expect(r.state.deck.owned).toEqual(PLAYBOOK);
  });

  it('only humans can be transformed; with none left, every offer is training', () => {
    const draft = run(wonDrive().state, PAUSE).state;
    draft.roster.forEach((p, i) => (p.form = i === 2 ? 'human' : 'golem'));
    const r = dispatch(draft, { type: 'draft', offer: 0 });
    if (draft.offer[0]?.kind === 'transform') {
      expect(ofType(r.events, 'transformed')[0]?.slot).toBe(2);
    }
    const monsters = run(wonDrive().state, 0).state;
    monsters.roster.forEach((p) => (p.form = 'ghost'));
    const later = run(monsters, PAUSE).state;
    expect(later.offer.map((o) => o.kind)).toEqual(['train', 'train', 'train']);
    expect(new Set(later.offer.map((o) => (o.kind === 'train' ? o.stat : ''))).size).toBe(3);
  });

  it('training gives a random player +1 to a stat', () => {
    const draft = run(wonDrive().state, PAUSE).state;
    const r = dispatch(draft, {
      type: 'draft',
      offer: draft.offer.findIndex((o) => o.kind === 'train'),
    });
    const trained = ofType(r.events, 'trained')[0]!;
    expect(r.state.roster[trained.slot]!.training[trained.stat]).toBe(1);
  });

  it('the next drive lines up before the draft (the march goes on); its hand comes after', () => {
    const draft = run(wonDrive().state, PAUSE).state;
    expect(draft.drive).toMatchObject({ index: 1, kind: 'challenge', down: 1, los: 3 });
    expect(draft.screen.defenders.length).toBeGreaterThan(0);
    expect(draft.deck.hand).toHaveLength(0);
    const picked = dispatch(draft, { type: 'draft', offer: 0 }).state;
    expect(picked.deck.hand).toHaveLength(3);
  });

  it('the Boss drive goes for the end zone: "& Goal"', () => {
    const s = createRun(7);
    s.drive = { ...s.drive, kind: 'boss', down: 3 };
    expect(downAndDistance(s)).toBe('3rd & Goal');
  });

  it('failing on 4th down is game over', () => {
    const sackedOn = (down: number) => {
      const state = playState([]);
      state.drive.down = down;
      state.pocket = { total: 2, left: 2 };
      return run(run(state, 2).state, PAUSE);
    };
    const r = sackedOn(4);
    expect(r.state.phase).toBe('over');
    expect(ofType(r.events, 'gameOver')).toHaveLength(1);
    expect(sackedOn(3).state.drive.down).toBe(4); // short of the 4th: the next down
  });

  it('an area is four drives; the main game is three areas, each stiffer than the last', () => {
    let s = createRun(7);
    const drives: string[] = [`${s.drive.area}:${s.drive.kind}`];
    const coverHustle: number[] = [];
    for (let i = 0; i < 12; i++) {
      s = structuredClone(s);
      const events: SimEvent[] = [];
      endDown(s, 'firstDown', s.drive.firstDown, events);
      nextDown(s, events);
      if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
      if (s.phase === 'setup') {
        drives.push(`${s.drive.area}:${s.drive.kind}`);
        const cover = s.screen.defenders.find((d) => d.kind === 'cover');
        if (s.drive.kind === 'intro' && cover) coverHustle.push(cover.stats.hustle);
      }
    }
    const area = (a: number) => ['intro', 'challenge', 'gimmick', 'boss'].map((k) => `${a}:${k}`);
    expect(drives).toEqual([...area(0), ...area(1), ...area(2)]);
    expect(s.phase).toBe('won');
    expect(s.drivesWon).toBe(12);
    // Each area's defenders are +1 on the last.
    expect(coverHustle).toEqual([2, 3]);
  });
});

describe('the roster', () => {
  it('fills a play\u2019s spots from left to right, after the flip', () => {
    let s = createRun(1);
    s = { ...s, deck: { ...s.deck, hand: ['screen', 'go', 'slant'] } };
    const called = dispatch(s, { type: 'call', hand: 0 }).state;
    const leftToRight = (st: RunState) =>
      [...st.screen.players]
        .sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y)
        .map((p) => p.slot);
    expect(leftToRight(called)).toEqual([0, 1, 2, 3]);
    const flipped = dispatch(called, { type: 'flip' }).state;
    expect(leftToRight(flipped)).toEqual([0, 1, 2, 3]);
    // The Screen's catcher sits right of the middle; flipped, left: a different player runs it.
    const catcher = (st: RunState) => st.screen.players.find((p) => /^[LR]/.test(p.route));
    expect(catcher(called)?.slot).toBe(2);
    expect(catcher(flipped)?.slot).toBe(0);
  });

  it('team hands: all four different is a Monster Mash; four of one monster is Four of a Kind', () => {
    const roster = startingRoster();
    expect(teamHand(roster)).toBeNull();
    (['human', 'ghost', 'werewolf', 'golem'] as const).forEach((f, i) => (roster[i]!.form = f));
    expect(teamHand(roster)).toEqual({ kind: 'mash' });
    // A Mash gives everyone every skill, and +1 to everything.
    expect(playerSkills(roster, 0).rerolls.sort()).toEqual(['break', 'shake']);
    expect(playerSkills(roster, 0).frenzy).toEqual(['break']);
    expect(playerStats(roster, 0)).toEqual({ hustle: 1, hands: 1, heft: 1 });
    roster.forEach((p) => (p.form = 'golem'));
    expect(teamHand(roster)).toEqual({ kind: 'four', form: 'golem' });
    // Four Golems: +2 Heft, and only their own skill.
    expect(playerSkills(roster, 0).rerolls).toEqual(['break']);
    expect(playerStats(roster, 0).heft).toBe(4 + 2);
    roster.forEach((p) => (p.form = 'human'));
    expect(teamHand(roster)).toBeNull();
  });

  it('Final Girls: four humans with two training picks between them get +1 to everything', () => {
    const roster = startingRoster();
    roster[0]!.training = { hustle: 1, hands: 0, heft: 0 };
    expect(teamHand(roster)).toBeNull();
    roster[3]!.training = { hustle: 0, hands: 1, heft: 0 };
    expect(teamHand(roster)).toEqual({ kind: 'finalGirls' });
    expect(playerStats(roster, 0)).toEqual({ hustle: 2, hands: 1, heft: 1 });
    roster[1]!.form = 'ghost';
    expect(teamHand(roster)).toBeNull();
  });

  it('a form shifts the stats, and training adds on top', () => {
    const roster = startingRoster();
    roster[1]!.form = 'ghost';
    roster[1]!.training = { hustle: 0, hands: 1, heft: 0 };
    expect(playerStats(roster, 1)).toEqual({ hustle: 3, hands: 1, heft: -2 });
  });
});

describe('determinism', () => {
  it('replays the same run from the same seed and inputs', () => {
    const inputs: Input[] = [
      { kind: 'tick' },
      { kind: 'action', action: { type: 'call', hand: 1 } },
      { kind: 'action', action: { type: 'hike' } },
      ...Array.from({ length: 40 }, (_, i): Input =>
        i === 5 ? { kind: 'tick', throwAt: vec(3, 12) } : { kind: 'tick' },
      ),
    ];
    expect(replay(1234, inputs)).toEqual(replay(1234, inputs));
  });

  it('never modifies the state passed to step() or dispatch()', () => {
    const state = createRun(3);
    const before = JSON.stringify(state);
    step(state);
    dispatch(state, { type: 'call', hand: 0 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps its invariants through long random runs', () => {
    for (let seed = 1; seed <= 15; seed++) {
      let state = createRun(seed);
      for (let t = 0; t < 600 && state.phase !== 'over' && state.phase !== 'won'; t++) {
        if (state.phase === 'setup' && t % 3 === 0) {
          state = dispatch(state, { type: 'call', hand: t % 3 }).state;
          state = dispatch(state, { type: 'hike' }).state;
        }
        if (state.phase === 'draft') state = dispatch(state, { type: 'draft', offer: 0 }).state;
        const throwAt =
          state.phase === 'play' && state.downTick === 5
            ? vec((seed + t) % COLS, state.drive.los + 4 + (t % 12))
            : undefined;
        state = step(state, throwAt ? { throwAt } : {}).state;
        const { players, defenders, ball } = state.screen;
        const tiles = defenders.map((d) => key(d.pos));
        expect(new Set(tiles).size).toBe(tiles.length);
        if (state.phase === 'play') {
          // Only the carrier (being tackled) ever shares a tile with an up defender.
          for (const p of players) {
            const carrying = ball.at === 'carried' && ball.by === p.id;
            const sharing = defenders.some((d) => d.downTicks === 0 && key(d.pos) === key(p.pos));
            if (!carrying) expect(sharing).toBe(false);
          }
        }
        expect(state.drive.down).toBeGreaterThanOrEqual(1);
        expect(state.drive.down).toBeLessThanOrEqual(4);
      }
    }
  });
});
