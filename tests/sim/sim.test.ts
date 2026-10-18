import { describe, expect, it } from 'vitest';
import { STARTER_DECK } from '../../src/content/cards';
import { tuning } from '../../src/content/tuning';
import { openness } from '../../src/sim/coverage';
import { boxCircuit, qbTile } from '../../src/sim/drive';
import { key, vec } from '../../src/sim/grid';
import { witchColumn } from '../../src/sim/hazards';
import { replay, type Input } from '../../src/sim/replay';
import { createRun, dispatch, downAndDistance, endDown, nextDown } from '../../src/sim/run';
import { step } from '../../src/sim/step';
import type { Hazard, RunState, SimEvent } from '../../src/sim/types';
import { carry, defender, ofType, playState, player, run } from './helpers';

const PAUSE = tuning.drive.pauseBeats;

describe('a run', () => {
  it('starts on the first drive: 1st & 10, a hand of three, the defense lined up', () => {
    const state = createRun(1);
    expect(state.phase).toBe('setup');
    expect(state.drive).toMatchObject({ index: 0, kind: 'intro', down: 1, los: 2, firstDown: 12 });
    expect(downAndDistance(state)).toBe('1st & 10');
    expect(state.deck.hand).toHaveLength(3);
    expect(state.deck.owned).toEqual(STARTER_DECK);
    expect(state.screen.players).toHaveLength(0); // nobody lines up until you call a play
    expect(state.screen.defenders.length).toBeGreaterThan(0);
    expect(state.screen.qb).toEqual(vec(4, 0));
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
        .map((x) => 8 - x)
        .sort(),
    );
  });

  it('HIKE needs a called play; it discards the hand and Covers pick their marks', () => {
    const state = createRun(1);
    expect(dispatch(state, { type: 'hike' }).state.phase).toBe('setup');
    const hiked = dispatch(dispatch(state, { type: 'call', hand: 1 }).state, {
      type: 'hike',
    }).state;
    expect(hiked.phase).toBe('play');
    expect(hiked.deck.hand).toHaveLength(0);
    expect(hiked.deck.discard).toHaveLength(3);
    const marks = hiked.screen.defenders.filter((d) => d.kind === 'cover').map((d) => d.marking);
    expect(marks.every((m) => m !== null)).toBe(true);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it('a Draw hands the ball off at the snap', () => {
    let state = createRun(1);
    state = { ...state, deck: { ...state.deck, hand: ['draw', 'go', 'slant'] } };
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(state.screen.ball).toEqual({ at: 'carried', by: state.screen.players[0]!.id });
  });

  it('the beat ticks before the snap, and carries on through HIKE', () => {
    let state = run(createRun(1), 3).state;
    expect(state.phase).toBe('setup');
    expect(state.beat).toBe(3);
    state = dispatch(dispatch(state, { type: 'call', hand: 0 }).state, { type: 'hike' }).state;
    expect(step(state).state.beat).toBe(4);
  });
});

describe('routes', () => {
  it('each player takes one move of its route per hop, then stands', () => {
    let state = playState([{ pos: vec(1, 2), route: 'URU' }]);
    const at = () => player(state, 100).pos;
    state = run(state, 2).state;
    expect(at()).toEqual(vec(1, 3));
    state = run(state, 2).state;
    expect(at()).toEqual(vec(2, 3));
    state = run(state, 2).state;
    expect(at()).toEqual(vec(2, 4));
    state = run(state, 4).state;
    expect(at()).toEqual(vec(2, 4)); // the route ran out
  });

  it('the carrier ignores its route and runs straight up', () => {
    const state = carry(playState([{ pos: vec(1, 5), route: 'RRRR' }]), 100);
    expect(player(run(state, 2).state, 100).pos).toEqual(vec(1, 6));
  });
});

describe('blocking: players and defenders never share a tile', () => {
  it('a player waits rather than step into a defender', () => {
    const state = playState([{ pos: vec(2, 2), route: 'U' }], [{ kind: 'zone', pos: vec(2, 3) }]);
    expect(player(run(state, 2).state, 100).pos).toEqual(vec(2, 2));
  });

  it('a Blitzer goes around a blocker instead of through it', () => {
    const state = playState(
      [{ pos: vec(4, 2), route: '.' }],
      [{ kind: 'blitzer', pos: vec(4, 4) }],
    );
    const r = run(state, 4);
    expect(ofType(r.events, 'hop').some((e) => e.id === 200 && key(e.to) === '4,2')).toBe(false);
    expect(defender(r.state, 200).pos).toEqual(vec(5, 3));
  });
});

describe('tackles', () => {
  // A carrier on (4, 6) and a Cover two tiles ahead: they meet on (4, 7) on beat 2.
  const meeting = (fendOff = 0) => {
    const state = carry(playState([{ pos: vec(4, 6) }], [{ kind: 'cover', pos: vec(4, 8) }]), 100);
    player(state, 100).fendOff = fendOff;
    return state;
  };

  it('a defender meeting the carrier tackles it: the next down starts there', () => {
    const r = run(meeting(), 2);
    expect(ofType(r.events, 'tackled')).toEqual([{ type: 'tackled', id: 100, by: 200 }]);
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'tackled', gained: 5 },
    ]);
    expect(r.state.phase).toBe('downOver');
    const next = run(r.state, PAUSE).state;
    expect(next.phase).toBe('setup');
    expect(next.drive).toMatchObject({ down: 2, los: 7 });
    expect(next.screen.qb).toEqual(qbTile(7));
    expect(downAndDistance(next)).toBe('2nd & 5');
  });

  it('a fend-off (from a Clean Catch) knocks the tackler down, and the carrier gets clear', () => {
    const r = run(meeting(1), 10);
    expect(ofType(r.events, 'fendedOff')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')).toHaveLength(0);
    expect(player(r.state, 100).pos.y).toBe(11);
  });

  it('a defender right behind the carrier tackles it (no trailing it up the field)', () => {
    const state = carry(playState([{ pos: vec(4, 6) }], [{ kind: 'cover', pos: vec(4, 5) }]), 100);
    const r = step(state);
    expect(ofType(r.events, 'tackled')).toEqual([{ type: 'tackled', id: 100, by: 200 }]);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'tackled',
      gained: 4,
    });
  });

  it('a chaser that hops up beside the carrier tackles it', () => {
    // The Blitzer on (3, 7) comes down to (3, 6) as the carrier hops up to (4, 6): side by side.
    const state = carry(
      playState([{ pos: vec(4, 5) }], [{ kind: 'blitzer', pos: vec(3, 7) }]),
      100,
    );
    const r = run(state, 2);
    expect(ofType(r.events, 'tackled')[0]?.by).toBe(200);
  });
});

describe('coverage rings', () => {
  const screenWith = (kind: 'cover' | 'zone' | 'blitzer' | 'safety' | 'bat') =>
    playState([], [{ kind, pos: vec(4, 6) }]).screen;

  it('a Cover covers the tiles around it, and the next tile out is tight', () => {
    const s = screenWith('cover');
    expect(openness(s, vec(4, 7))).toBe('covered');
    expect(openness(s, vec(5, 7))).toBe('tight');
    expect(openness(s, vec(4, 8))).toBe('tight');
    expect(openness(s, vec(4, 9))).toBe('open');
  });

  it('a Scarecrow (Zone) and the Safety cover a wide area', () => {
    expect(openness(screenWith('zone'), vec(4, 8))).toBe('covered');
    expect(openness(screenWith('safety'), vec(6, 6))).toBe('covered');
  });

  it('a Blitzer has no ring, and a knocked-down defender covers nothing', () => {
    expect(openness(screenWith('blitzer'), vec(4, 7))).toBe('open');
    const s = screenWith('cover');
    s.defenders[0]!.downBeats = 2;
    expect(openness(s, vec(4, 7))).toBe('open');
  });
});

describe('passes', () => {
  // The receiver stands on (4, 6); a pass thrown on beat 1 lands on beat 3.
  const pass = (defenders: Parameters<typeof playState>[1], target = vec(4, 6)) => {
    const state = playState([{ pos: vec(4, 6), route: '.' }], defenders);
    return run(step(state, { throwAt: target }).state, 2);
  };

  it('to an open receiver is a catch; right on it is a Clean Catch', () => {
    const r = pass([]);
    expect(ofType(r.events, 'caught')).toEqual([
      { type: 'caught', id: 100, clean: true, quality: 'perfect' },
    ]);
    expect(r.state.screen.ball).toEqual({ at: 'carried', by: 100 });
    expect(player(r.state, 100).fendOff).toBe(1);
  });

  it('to a covered receiver bounces off the defender: the down is used, no gain', () => {
    const r = pass([{ kind: 'cover', pos: vec(4, 7) }]);
    expect(ofType(r.events, 'blocked')).toEqual([{ type: 'blocked', by: 200, at: vec(4, 7) }]);
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'blocked', gained: 0 },
    ]);
    expect(r.state.screen.ball).toEqual({ at: 'dead', pos: vec(4, 7), bounced: true });
    expect(run(r.state, PAUSE).state.drive).toMatchObject({ down: 2, los: 2 });
  });

  it('a Bat next to the receiver blocks it too', () => {
    const r = pass([{ kind: 'bat', pos: vec(5, 6) }]);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('blocked');
  });

  it('with nobody in reach is incomplete', () => {
    const r = pass([], vec(7, 7));
    expect(ofType(r.events, 'incomplete')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'incomplete',
      gained: 0,
    });
  });

  it('throw range is measured from the line of scrimmage', () => {
    const state = playState([{ pos: vec(4, 6) }]);
    const reason = (y: number) =>
      ofType(step(state, { throwAt: vec(4, y) }).events, 'throwRejected')[0]?.reason;
    expect(reason(0)).toBe('tooClose');
    expect(reason(1)).toBeUndefined(); // a row behind the line: a Screen
    expect(reason(13)).toBeUndefined();
    expect(reason(14)).toBe('tooFar');
  });
});

describe('sacks', () => {
  it('a defender next to the QB while it holds the ball sacks it: 2 yards back', () => {
    const state = playState([], [{ kind: 'blitzer', pos: vec(5, 4) }]);
    state.drive.los = 6;
    Object.assign(state.screen, { qb: qbTile(6) });
    const r = step(state);
    expect(ofType(r.events, 'sacked')).toEqual([{ type: 'sacked', by: 200 }]);
    expect(ofType(r.events, 'downEnded')[0]).toEqual({
      type: 'downEnded',
      result: 'sacked',
      gained: -2,
    });
    expect(r.state.drive.los).toBe(4);
  });

  it('holding the ball past the play clock is a sack too', () => {
    const r = run(playState([]), tuning.drive.playClockBeats);
    expect(ofType(r.events, 'sacked')).toEqual([{ type: 'sacked', by: null }]);
  });

  it("can't push you back behind the drive's starting line", () => {
    const r = run(playState([]), tuning.drive.playClockBeats);
    expect(r.state.drive.los).toBe(2);
    expect(ofType(r.events, 'downEnded')[0]?.gained).toBe(0);
  });
});

describe('the defense', () => {
  it('a Cover follows its receiver one beat behind, so a cut opens a gap', () => {
    let state = playState(
      [{ pos: vec(2, 3), route: 'RRRR' }],
      [{ kind: 'cover', pos: vec(2, 5), marking: 100 }],
    );
    state = run(state, 4).state;
    expect(player(state, 100).pos).toEqual(vec(4, 3));
    expect(defender(state, 200).pos).toEqual(vec(2, 3));
    expect(openness(state.screen, player(state, 100).pos)).toBe('tight');
  });

  it('Blitzers and the Safety chase the carrier after a catch', () => {
    const state = carry(
      playState(
        [{ pos: vec(1, 6) }],
        [
          { kind: 'blitzer', pos: vec(4, 2) },
          { kind: 'safety', pos: vec(4, 12) },
        ],
      ),
      100,
    );
    const r = run(state, 2).state;
    expect(defender(r, 200).pos).toEqual(vec(4, 3)); // up toward the carrier, not down to the QB
    expect(defender(r, 201).pos).toEqual(vec(3, 12)); // the Safety: into the carrier's column first
  });

  it('the Safety gets into the carrier\u2019s column first, then comes down to meet it', () => {
    const state = carry(
      playState([{ pos: vec(1, 6) }], [{ kind: 'safety', pos: vec(4, 12) }]),
      100,
    );
    const r = run(state, 12);
    const path = ofType(r.events, 'hop')
      .filter((e) => e.id === 200)
      .map((e) => key(e.to));
    // Across row 12 to the carrier's column before coming down it…
    expect(path.slice(0, 3)).toEqual(['3,12', '2,12', '1,12']);
    // …then it meets the carrier coming up: a tackle, short of the first-down line.
    expect(ofType(r.events, 'tackled')[0]?.by).toBe(200);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('tackled');
  });

  it('the Safety slides toward where a pass will land', () => {
    const state = playState(
      [{ pos: vec(7, 6), route: '.' }],
      [{ kind: 'safety', pos: vec(4, 12) }],
    );
    const r = run(step(state, { throwAt: vec(7, 9) }).state, 1).state;
    expect(defender(r, 200).pos).toEqual(vec(5, 12));
  });

  it('the Safety holds its row, sliding level with your deepest receiver', () => {
    const state = playState(
      [{ pos: vec(1, 8), route: '.' }],
      [{ kind: 'safety', pos: vec(4, 12) }],
    );
    expect(defender(run(state, 2).state, 200).pos).toEqual(vec(3, 12));
  });

  it('a Scarecrow never moves', () => {
    const state = carry(playState([{ pos: vec(4, 3) }], [{ kind: 'zone', pos: vec(4, 6) }]), 100);
    expect(defender(run(state, 6).state, 200).pos).toEqual(vec(4, 6));
  });
});

describe('Bats', () => {
  it('patrol a 4×4 box: 12 tiles clockwise, one hop apart, on the field', () => {
    const circuit = boxCircuit(vec(7, 14));
    expect(circuit).toHaveLength(12);
    for (const t of circuit) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(8);
      expect(t.y).toBeLessThanOrEqual(15);
    }
    circuit.forEach((t, i) => {
      const n = circuit[(i + 1) % circuit.length]!;
      expect(Math.abs(n.x - t.x) + Math.abs(n.y - t.y)).toBe(1);
    });
  });

  it('circle before the snap, while everyone else waits', () => {
    const state = createRun(1);
    const patrol = boxCircuit(vec(2, 6));
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
    expect(defender(r.state, 900).patrolIndex).toBe(2);
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

  it('flies one tile per beat across her row and wraps to the other side', () => {
    expect([0, 1, 2, 3].map((b) => witchColumn(witch(6, 7, 1), b))).toEqual([7, 8, 0, 1]);
    expect([0, 1, 2, 3].map((b) => witchColumn(witch(6, 1, -1), b))).toEqual([1, 0, 8, 7]);
  });

  it('blocks a pass crossing her row near her', () => {
    // From the QB on (4, 0) to (4, 8), thrown on beat 1, the ball crosses row 4 on beat 2.
    const state = playState([{ pos: vec(4, 8), route: '.' }]);
    Object.assign(state.screen, { hazards: [witch(4, 2, 1)] });
    const r = run(step(state, { throwAt: vec(4, 8) }).state, 2);
    expect(ofType(r.events, 'blocked')).toEqual([{ type: 'blocked', by: 900, at: vec(4, 4) }]);
  });
});

describe('drives', () => {
  const wonDrive = () => run(carry(playState([{ pos: vec(4, 11) }]), 100), 2);

  it('the carrier over the first-down line wins the drive; then the draft', () => {
    const r = wonDrive();
    expect(ofType(r.events, 'downEnded')).toEqual([
      { type: 'downEnded', result: 'firstDown', gained: 10 },
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
    expect(picked.drive).toMatchObject({ index: 1, kind: 'challenge', down: 1, los: 2 });
    const removed = dispatch(draft, { type: 'remove', owned: 0 }).state;
    expect(removed.deck.owned).toHaveLength(draft.deck.owned.length - 1);
  });

  it('failing on 4th down is game over', () => {
    let state = playState([]);
    state.drive.down = 4;
    const r = run(run(state, tuning.drive.playClockBeats).state, PAUSE);
    expect(r.state.phase).toBe('over');
    expect(ofType(r.events, 'gameOver')).toHaveLength(1);
    // Short of the 4th: the next down.
    state = playState([]);
    state.drive.down = 3;
    expect(run(run(state, tuning.drive.playClockBeats).state, PAUSE).state.drive.down).toBe(4);
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
      { kind: 'beat' },
      { kind: 'action', action: { type: 'call', hand: 1 } },
      { kind: 'action', action: { type: 'hike' } },
      ...Array.from({ length: 40 }, (_, i): Input =>
        i === 5 ? { kind: 'beat', throwAt: vec(3, 7) } : { kind: 'beat' },
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
      for (let beat = 0; beat < 400 && state.phase !== 'over' && state.phase !== 'won'; beat++) {
        if (state.phase === 'setup' && beat % 3 === 0) {
          state = dispatch(state, { type: 'call', hand: beat % 3 }).state;
          state = dispatch(state, { type: 'hike' }).state;
        }
        if (state.phase === 'draft') state = dispatch(state, { type: 'draft', offer: 0 }).state;
        const throwAt =
          state.phase === 'play' && state.downBeat === 3
            ? vec((seed + beat) % 9, state.drive.los + 2 + (beat % 6))
            : undefined;
        state = step(state, throwAt ? { throwAt } : {}).state;
        const { players, defenders, ball } = state.screen;
        const tiles = defenders.map((d) => key(d.pos));
        expect(new Set(tiles).size).toBe(tiles.length);
        if (state.phase === 'play') {
          // Only the carrier (being tackled) ever shares a tile with an up defender.
          for (const p of players) {
            const carrying = ball.at === 'carried' && ball.by === p.id;
            const sharing = defenders.some((d) => d.downBeats === 0 && key(d.pos) === key(p.pos));
            if (!carrying) expect(sharing).toBe(false);
          }
        }
        expect(state.drive.down).toBeGreaterThanOrEqual(1);
        expect(state.drive.down).toBeLessThanOrEqual(4);
      }
    }
  });
});
