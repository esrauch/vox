import { describe, expect, it } from 'vitest';
import { STARTER_DECK } from '../../src/content/cards';
import { tuning } from '../../src/content/tuning';
import { openness } from '../../src/sim/coverage';
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
import { step } from '../../src/sim/step';
import type { Hazard, RunState, SimEvent } from '../../src/sim/types';
import { carry, defender, ofType, playState, player, run } from './helpers';

// The field is half-yard tiles: every row is half a yard, and everyone hops every tick.
const PAUSE = tuning.drive.pauseTicks;

describe('a run', () => {
  it('starts on the first drive: 1st & 10, a hand of three, the defense lined up', () => {
    const state = createRun(1);
    expect(state.phase).toBe('setup');
    expect(state.drive).toMatchObject({ index: 0, kind: 'intro', down: 1, los: 3, firstDown: 23 });
    expect(downAndDistance(state)).toBe('1st & 10');
    expect(state.deck.hand).toHaveLength(3);
    expect(state.deck.owned).toEqual(STARTER_DECK);
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
    state = { ...state, deck: { ...state.deck, hand: ['go', 'slant', 'curl'] } };
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

  it('a Draw hands the ball off at the snap, and the line ties the rush up for a while', () => {
    let state = createRun(1);
    state = { ...state, deck: { ...state.deck, hand: ['draw', 'go', 'slant'] } };
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(state.screen.ball).toEqual({ at: 'carried', by: state.screen.players[0]!.id });
    const hold = tuning.pocket.runHold;
    expect(state.pocket).toEqual({ total: hold, left: hold, run: true });
  });

  it('a tied-up Blitzer can\u2019t tackle the runner going past it; once let go, it chases', () => {
    const state = carry(
      playState([{ pos: vec(5, 2) }], [{ kind: 'blitzer', pos: vec(4, 4) }]),
      100,
    );
    state.pocket = { total: 4, left: 4, run: true };
    const past = run(state, 3); // the runner goes right by it: (5, 3), (5, 4), (5, 5)
    expect(ofType(past.events, 'tackled')).toHaveLength(0);
    expect(defender(past.state, 200).pos).toEqual(vec(4, 4));
    const later = run(past.state, 3);
    expect(later.state.pocket).toBeNull();
    expect(defender(later.state, 200).pos).not.toEqual(vec(4, 4));
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
    expect(pocketTicks(0, 3)).toBe(Math.max(p.minTicks, p.ticks - 2 * p.perExtraBlitzer));
    let state = createRun(1);
    state = { ...state, deck: { ...state.deck, hand: ['screen', 'go', 'slant'] } };
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(state.pocket?.total).toBe(pocketTicks(2, 1)); // the Screen keeps two blockers home
  });

  it('the rush pushes the line back as the clock runs, and at zero it is a sack: 2 yards lost', () => {
    const state = playState([], [{ kind: 'blitzer', pos: vec(5, 10) }]);
    state.drive.los = 9;
    Object.assign(state.screen, { qb: qbTile(9) }); // the QB on (5, 6)
    state.pocket = { total: 4, left: 4 };
    const halfway = run(state, 2);
    expect(defender(halfway.state, 200).pos.y).toBeLessThan(10);
    expect(ofType(halfway.events, 'sacked')).toHaveLength(0);
    const r = run(halfway.state, 2);
    expect(ofType(r.events, 'sacked')).toEqual([{ type: 'sacked', by: 200 }]);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'sacked',
      gained: -4,
    });
    expect(r.state.drive.los).toBe(5);
  });

  it('a player standing in the rush lane holds the Blitzer, but the clock still runs out', () => {
    const state = playState(
      [{ pos: vec(5, 2), route: '.' }],
      [{ kind: 'blitzer', pos: vec(5, 4) }],
    );
    state.pocket = { total: 4, left: 4 };
    const r = run(state, 4);
    expect(defender(r.state, 200).pos.y).toBeGreaterThan(2);
    expect(ofType(r.events, 'sacked')).toHaveLength(1);
  });

  it("can't push you back behind the drive's starting line", () => {
    const state = playState([]);
    state.pocket = { total: 2, left: 2 };
    const r = run(state, 2);
    expect(r.state.drive.los).toBe(3);
    expect(ofType(r.events, 'downEnded')[0]?.gained).toBe(0);
  });

  it('the rush waits once the ball is thrown, and chases once it is caught', () => {
    const state = playState(
      [{ pos: vec(1, 8), route: '.' }],
      [{ kind: 'blitzer', pos: vec(5, 4) }],
    );
    state.pocket = { total: 12, left: 12 };
    let r = run(step(state, { throwAt: vec(1, 8) }).state, 1);
    expect(r.state.pocket).toBeNull();
    const at = defender(r.state, 200).pos;
    r = run(r.state, 1); // the ball lands: a catch
    expect(r.state.screen.ball).toEqual({ at: 'carried', by: 100 });
    expect(defender(r.state, 200).pos).toEqual(at);
    r = run(r.state, 1);
    expect(defender(r.state, 200).pos).not.toEqual(at);
  });
});

describe('tackles', () => {
  // A carrier on (5, 10) and a Cover two tiles ahead: they meet on (5, 11) on the first tick.
  const meeting = (fendOff = 0) => {
    const state = carry(
      playState([{ pos: vec(5, 10) }], [{ kind: 'cover', pos: vec(5, 12) }]),
      100,
    );
    player(state, 100).fendOff = fendOff;
    return state;
  };

  it('a defender meeting the carrier tackles it: the next down starts there', () => {
    const r = run(meeting(), 1);
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

  it('a fend-off (from a Clean Catch) knocks the tackler down, and the carrier gets clear', () => {
    const r = run(meeting(1), 8);
    expect(ofType(r.events, 'fendedOff')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')).toHaveLength(0);
    expect(player(r.state, 100).pos.y).toBe(18);
  });

  it('a defender right behind the carrier tackles it (no trailing it up the field)', () => {
    const state = carry(playState([{ pos: vec(5, 10) }], [{ kind: 'cover', pos: vec(5, 9) }]), 100);
    const r = step(state);
    expect(ofType(r.events, 'tackled')).toEqual([{ type: 'tackled', id: 100, by: 200 }]);
  });

  it('a chaser that hops up beside the carrier tackles it', () => {
    // The Blitzer on (4, 11) comes down to (4, 10) as the carrier hops up to (5, 10): side by side.
    const state = carry(
      playState([{ pos: vec(5, 9) }], [{ kind: 'blitzer', pos: vec(4, 11) }]),
      100,
    );
    expect(ofType(step(state).events, 'tackled')[0]?.by).toBe(200);
  });
});

describe('coverage rings', () => {
  const screenWith = (kind: 'cover' | 'zone' | 'blitzer' | 'safety' | 'bat') =>
    playState([], [{ kind, pos: vec(5, 10) }]).screen;

  it('a Cover covers the tiles around it, and the next tile out is tight', () => {
    const s = screenWith('cover');
    expect(openness(s, vec(5, 11))).toBe('covered');
    expect(openness(s, vec(6, 11))).toBe('tight');
    expect(openness(s, vec(5, 12))).toBe('tight');
    expect(openness(s, vec(5, 13))).toBe('open');
  });

  it('a Scarecrow (Zone) and the Safety cover a wide area', () => {
    expect(openness(screenWith('zone'), vec(5, 13))).toBe('covered');
    expect(openness(screenWith('safety'), vec(8, 10))).toBe('covered');
  });

  it('a Blitzer has no ring, and a knocked-down defender covers nothing', () => {
    expect(openness(screenWith('blitzer'), vec(5, 11))).toBe('open');
    const s = screenWith('cover');
    s.defenders[0]!.downTicks = 2;
    expect(openness(s, vec(5, 11))).toBe('open');
  });
});

describe('passes', () => {
  // The receiver stands on (5, 10), ten tiles from the QB: a quick pass lands two ticks later.
  const pass = (defenders: Parameters<typeof playState>[1], target = vec(5, 10), ticks = 2) => {
    const state = playState([{ pos: vec(5, 10), route: '.' }], defenders);
    return run(step(state, { throwAt: target }).state, ticks);
  };

  it('to an open receiver is a catch; right on it is a Clean Catch', () => {
    const r = pass([]);
    expect(ofType(r.events, 'caught')).toEqual([
      { type: 'caught', id: 100, clean: true, quality: 'perfect' },
    ]);
    expect(player(r.state, 100).fendOff).toBe(1);
  });

  it('coming down inside a defender’s ring, it bounces off: the down is used, no gain', () => {
    const r = pass([{ kind: 'cover', pos: vec(5, 11) }]);
    expect(ofType(r.events, 'blocked')).toEqual([{ type: 'blocked', by: 200, at: vec(5, 11) }]);
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'blocked', gained: 0 },
    ]);
    expect(r.state.screen.ball).toEqual({ at: 'dead', pos: vec(5, 11), bounced: true });
    expect(run(r.state, PAUSE).state.drive).toMatchObject({ down: 2, los: 3 });
  });

  it('led away from the defender, the same receiver makes the catch', () => {
    const r = pass([{ kind: 'cover', pos: vec(5, 11) }], { x: 5, y: 9.1 });
    expect(ofType(r.events, 'caught')).toHaveLength(1);
  });

  it('a Bat beside the receiver blocks a ball thrown right at it', () => {
    const r = pass([{ kind: 'bat', pos: vec(6, 10) }]);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('blocked');
  });

  it('with nobody in reach is incomplete', () => {
    const r = pass([], vec(9, 12), tuning.throw.longTicks);
    expect(ofType(r.events, 'incomplete')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'incomplete',
      gained: 0,
    });
  });

  it('quick passes land in one beat, long ones in two', () => {
    const state = playState([{ pos: vec(5, 10) }]);
    const landsOn = (y: number) =>
      ofType(step(state, { throwAt: vec(5, y) }).events, 'thrown')[0]?.landsOn;
    expect(landsOn(10)).toBe(1 + tuning.throw.quickTicks);
    expect(landsOn(14)).toBe(1 + tuning.throw.longTicks);
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
    expect(openness(state.screen, player(state, 100).pos)).toBe('tight');
  });

  it('Blitzers chase the carrier after a catch, and the Safety gets into its column first', () => {
    const state = carry(
      playState(
        [{ pos: vec(1, 10) }],
        [
          { kind: 'blitzer', pos: vec(5, 4) },
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
    // From the QB on (5, 0) to (5, 16): a long pass thrown on tick 1, over row 8 on tick 3.
    const state = playState([{ pos: vec(5, 16), route: '.' }]);
    Object.assign(state.screen, { hazards: [witch(8, 2, 1)] });
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
    expect(draft.offer).toHaveLength(3);
  });

  it('drafting adds a card and starts the next drive; removing thins the deck', () => {
    const draft = run(wonDrive().state, PAUSE).state;
    const picked = dispatch(draft, { type: 'draft', offer: 0 }).state;
    expect(picked.deck.owned).toHaveLength(draft.deck.owned.length + 1);
    expect(picked.phase).toBe('setup');
    expect(picked.drive).toMatchObject({ index: 1, kind: 'challenge', down: 1, los: 3 });
    const removed = dispatch(draft, { type: 'remove', owned: 0 }).state;
    expect(removed.deck.owned).toHaveLength(draft.deck.owned.length - 1);
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

  it('an area is four drives: intro, challenge, gimmick, boss; winning the boss clears it', () => {
    let s = createRun(7);
    const kinds: string[] = [s.drive.kind];
    for (let i = 0; i < 4; i++) {
      s = structuredClone(s);
      const events: SimEvent[] = [];
      endDown(s, 'firstDown', s.drive.firstDown, events);
      nextDown(s, events);
      if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
      if (s.phase === 'setup') kinds.push(s.drive.kind);
    }
    expect(kinds).toEqual(['intro', 'challenge', 'gimmick', 'boss']);
    expect(s.phase).toBe('won');
    expect(s.drivesWon).toBe(4);
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
