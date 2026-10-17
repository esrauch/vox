import { describe, expect, it } from 'vitest';
import { TEST_RECRUIT } from '../../src/content/smalls';
import { BIG_POS, SETUP_ROWS, eq, key, vec } from '../../src/sim/grid';
import { replay, type Input } from '../../src/sim/replay';
import { createRun, dispatch } from '../../src/sim/run';
import { generateSpawns } from '../../src/sim/screen';
import { step } from '../../src/sim/step';
import { ofType, playState, run, small } from './helpers';

describe('creating a run', () => {
  it('starts in setup with 3 balls and 5 Walk-on slots', () => {
    const state = createRun(42);
    expect(state.phase).toBe('setup');
    expect(state.balls).toBe(3);
    expect(state.slots).toHaveLength(5);
    expect(state.slots.every((s) => s.kindId === 'walkOn')).toBe(true);
    expect(state.screen.smalls).toHaveLength(5);
  });

  it('spawns defenders deterministically, outside the setup zone', () => {
    expect(generateSpawns(7, 3)).toEqual(generateSpawns(7, 3));
    expect(generateSpawns(7, 3)).not.toEqual(generateSpawns(8, 3));
    for (const spawn of generateSpawns(7, 10))
      expect(spawn.pos.y).toBeGreaterThanOrEqual(SETUP_ROWS);
  });
});

describe('setup', () => {
  it('places Smalls only inside the setup zone, swapping with an occupant', () => {
    const state = createRun(1);
    const [a, b] = state.screen.smalls;
    const aPos = a!.pos;
    const bPos = b!.pos;
    dispatch(state, { type: 'place', slot: a!.slot, tile: vec(0, 9) });
    expect(small(state, a!.id).pos).toEqual(aPos);
    dispatch(state, { type: 'place', slot: a!.slot, tile: bPos });
    expect(small(state, a!.id).pos).toEqual(bPos);
    expect(small(state, b!.id).pos).toEqual(aPos);
  });

  it('remembers the formation for the next screen', () => {
    const state = createRun(1);
    dispatch(state, { type: 'place', slot: 0, tile: vec(0, 0) });
    expect(state.formation[0]).toEqual(vec(0, 0));
  });

  it('makes only the Small in the pocket a Blocker on hike', () => {
    const state = createRun(1);
    dispatch(state, { type: 'place', slot: 0, tile: vec(0, 0) });
    dispatch(state, { type: 'hike' });
    const roles = state.screen.smalls.map((s) => [key(s.pos), s.role]);
    expect(roles).toContainEqual(['0,0', 'runner']); // the back row runs too
    expect(roles).toContainEqual(['4,1', 'blocker']); // the pocket (default formation)
    expect(roles).toContainEqual(['3,2', 'runner']);
    expect(state.phase).toBe('play');
  });
});

describe('hopping on the beat', () => {
  it('hops a Hustle-0 Walk-on every 2 beats, straight up', () => {
    let state = playState([{ pos: vec(1, 2) }]);
    state = run(state, 1).state;
    expect(small(state, 100).pos).toEqual(vec(1, 2));
    state = run(state, 1).state;
    expect(small(state, 100).pos).toEqual(vec(1, 3));
    state = run(state, 2).state;
    expect(small(state, 100).pos).toEqual(vec(1, 4));
  });

  it('faces where it will hop next', () => {
    const state = playState([{ pos: vec(1, 2) }]);
    expect(small(state, 100).intent).toEqual(vec(1, 3));
  });
});

describe('throwing and catching', () => {
  it('rejects throws past the top rows, and while the ball is in the air', () => {
    const state = playState([{ pos: vec(1, 2) }]);
    const tooFar = step(state, vec(1, 13));
    expect(ofType(tooFar.events, 'throwRejected')[0]?.reason).toBe('out of range');
    const thrown = step(state, vec(1, 3));
    const again = step(thrown.state, vec(1, 4));
    expect(ofType(again.events, 'throwRejected')[0]?.reason).toBe('the Big has no ball');
  });

  it('lands 2 beats after release; a Small on the tile makes a Clean Catch', () => {
    const r1 = step(playState([{ pos: vec(1, 2) }]), vec(1, 3));
    expect(ofType(r1.events, 'thrown')[0]?.landsOn).toBe(3);
    const r3 = run(r1.state, 2);
    expect(ofType(r3.events, 'caught')).toEqual([{ type: 'caught', id: 100, clean: true }]);
    expect(r3.state.screen.ball).toEqual({ at: 'carried', by: 100 });
    expect(small(r3.state, 100).fendOff).toBe(1);
  });

  it('lets a Small one tile short, facing the ball, lunge for it (no Clean Catch bonus)', () => {
    const r1 = step(playState([{ pos: vec(1, 2) }]), vec(1, 4));
    const r3 = run(r1.state, 2);
    expect(ofType(r3.events, 'caught')).toEqual([{ type: 'caught', id: 100, clean: false }]);
    expect(small(r3.state, 100).pos).toEqual(vec(1, 4));
    expect(small(r3.state, 100).fendOff).toBe(0);
  });

  it('counts a ball landing on an empty tile as a fumble, and the Big takes the next ball', () => {
    const r1 = step(playState([{ pos: vec(1, 2) }]), vec(6, 6));
    const r3 = run(r1.state, 2);
    expect(ofType(r3.events, 'fumble')).toEqual([{ type: 'fumble', reason: 'miss', ballsLeft: 2 }]);
    expect(r3.state.screen.ball).toEqual({ at: 'big' });
  });

  it('counts a defender on the landing tile as an interception', () => {
    const state = playState([{ pos: vec(1, 2) }], [{ kind: 'picker', pos: vec(6, 6) }]);
    const r = run(step(state, vec(6, 6)).state, 2);
    expect(ofType(r.events, 'fumble')[0]?.reason).toBe('interception');
  });
});

describe('collisions', () => {
  it('a defender beats a Walk-on, which dies (Heft 0)', () => {
    const state = playState(
      [{ pos: vec(2, 2) }, { pos: vec(4, 1) }],
      [{ kind: 'chaser', pos: vec(2, 4) }],
    );
    const r = run(state, 2);
    expect(ofType(r.events, 'died')).toEqual([{ type: 'died', id: 100, cause: 'defender' }]);
    expect(small(r.state, 100).alive).toBe(false);
  });

  it('tackling the carrier is a fumble', () => {
    const state = playState(
      [{ pos: vec(2, 3) }, { pos: vec(4, 1) }],
      [{ kind: 'chaser', pos: vec(2, 5) }],
    );
    state.screen.ball = { at: 'carried', by: 100 };
    const r = run(state, 2);
    expect(ofType(r.events, 'fumble')[0]?.reason).toBe('tackle');
    expect(r.state.balls).toBe(2);
  });

  it('a Small that can fend off knocks the defender down instead', () => {
    const state = playState(
      [{ pos: vec(2, 3) }, { pos: vec(4, 1) }],
      [{ kind: 'chaser', pos: vec(2, 5) }],
    );
    state.screen.ball = { at: 'carried', by: 100 };
    small(state, 100).fendOff = 1;
    const r = run(state, 2);
    expect(ofType(r.events, 'fendedOff')).toHaveLength(1);
    expect(r.state.screen.defenders[0]?.downBeats).toBeGreaterThan(0);
    expect(small(r.state, 100).pos).toEqual(vec(2, 4));
    expect(small(r.state, 100).fendOff).toBe(0);
    expect(r.state.screen.ball).toEqual({ at: 'carried', by: 100 });
  });
});

describe('Blitzers and the pocket', () => {
  // A Walk-on Blocker in the pocket above the Big, a runner off to the side,
  // and a Blitzer coming straight down.
  const blitzSetup = () =>
    playState([{ pos: vec(4, 1) }, { pos: vec(0, 2) }], [{ kind: 'blitzer', pos: vec(4, 4) }]);

  it('engages a Blocker, beats it after its hold runs out, then sacks the Big', () => {
    const r = run(blitzSetup(), 16);
    const engaged = ofType(r.events, 'engaged');
    expect(engaged.map((e) => e.target.target)).toEqual(['small', 'big']);
    expect(ofType(r.events, 'blockerBeaten')).toHaveLength(1);
    expect(small(r.state, 100).alive).toBe(false);
    // The Big holds for 3 attacks, one every 2 beats.
    const bigAttacks = ofType(r.events, 'attack').filter((e) => e.target.target === 'big');
    expect(bigAttacks.map((e) => e.holdLeft)).toEqual([2, 1, 0]);
    expect(ofType(r.events, 'fumble')).toEqual([{ type: 'fumble', reason: 'sack', ballsLeft: 2 }]);
    expect(r.state.screen.bigHold).toBe(3);
  });

  it('always goes through the Blocker, even coming from the side', () => {
    const state = playState(
      [{ pos: vec(4, 1) }, { pos: vec(0, 2) }],
      [{ kind: 'blitzer', pos: vec(1, 1) }],
    );
    const r = run(state, 8);
    const engaged = ofType(r.events, 'engaged');
    expect(engaged[0]?.target).toEqual({ target: 'small', id: 100, since: 6 });
    expect(engaged.some((e) => e.target.target === 'big')).toBe(false);
  });

  it('does not sack one beat early', () => {
    expect(ofType(run(blitzSetup(), 15).events, 'fumble')).toHaveLength(0);
  });

  it('only threatens the Big while it holds the ball', () => {
    let state = run(blitzSetup(), 10).state; // Blitzer engages the Big on beat 10
    state = step(state, vec(0, 8)).state; // throw on beat 11 to where the runner will be
    const r = run(state, 4);
    expect(ofType(r.events, 'caught')).toHaveLength(1);
    expect(ofType(r.events, 'fumble')).toHaveLength(0);
    expect(r.state.screen.bigHold).toBe(3);
  });

  it('several Blitzers on one Blocker drain its hold together', () => {
    const state = playState(
      [{ pos: vec(4, 1), kindId: TEST_RECRUIT.id }, { pos: vec(0, 2) }],
      [
        { kind: 'blitzer', pos: vec(4, 2) },
        { kind: 'blitzer', pos: vec(5, 2) },
      ],
    );
    expect(small(state, 100).hold).toBe(2); // Heft 1 → holds for 2 attacks
    for (const d of state.screen.defenders) d.engaged = { target: 'small', id: 100, since: 0 };
    const r = run(state, 2);
    expect(ofType(r.events, 'attack').map((e) => e.holdLeft)).toEqual([1, 0]);
    expect(ofType(r.events, 'blockerBeaten')).toHaveLength(1);
  });
});

describe('touchdowns, wipeouts and the end of a run', () => {
  it('scores when the carrier reaches the top row, then moves to the next screen', () => {
    const state = playState([{ pos: vec(2, 14) }, { pos: vec(4, 1) }]);
    state.screen.ball = { at: 'carried', by: 100 };
    const r = run(state, 2);
    expect(ofType(r.events, 'touchdown')).toEqual([{ type: 'touchdown', id: 100, yards: 10 }]);
    expect(r.state.phase).toBe('cleared');
    const next = structuredClone(r.state);
    dispatch(next, { type: 'nextScreen' });
    expect(next.phase).toBe('setup');
    expect(next.screen.index).toBe(1);
    expect(next.screen.smalls.every((s) => s.alive)).toBe(true);
  });

  it('a wipeout costs a ball and restarts the screen from setup, Walk-ons back', () => {
    const state = playState([{ pos: vec(2, 2) }], [{ kind: 'chaser', pos: vec(2, 4) }]);
    const r = run(state, 2);
    expect(ofType(r.events, 'wipeout')).toEqual([{ type: 'wipeout', ballsLeft: 2 }]);
    expect(r.state.phase).toBe('setup');
    expect(r.state.screen.index).toBe(0);
    expect(r.state.screen.smalls.every((s) => s.alive)).toBe(true);
  });

  it('a dead recruit is gone: its slot reverts to a Walk-on', () => {
    const state = playState(
      [{ pos: vec(2, 2), kindId: TEST_RECRUIT.id }, { pos: vec(4, 1) }],
      [{ kind: 'chaser', pos: vec(2, 4) }],
    );
    small(state, 100).hitsTaken = 1; // Heft 1 survives one hit; this is its second
    const r = run(state, 2);
    expect(ofType(r.events, 'died').map((e) => e.id)).toEqual([100]);
    expect(r.state.slots[0]?.kindId).toBe('walkOn');
  });

  it('ends the run when the last ball is lost', () => {
    const state = playState([{ pos: vec(1, 2) }]);
    state.balls = 1;
    const r = run(step(state, vec(6, 6)).state, 2);
    expect(r.state.phase).toBe('over');
    expect(ofType(r.events, 'gameOver')).toHaveLength(1);
    expect(step(r.state).events).toHaveLength(0);
  });
});

describe('determinism', () => {
  const inputs: Input[] = [
    { kind: 'action', action: { type: 'place', slot: 0, tile: vec(0, 0) } },
    { kind: 'action', action: { type: 'hike' } },
    ...Array.from({ length: 60 }, (_, i): Input =>
      i % 9 === 3 ? { kind: 'beat', throwAt: vec(i % 9, 3 + (i % 8)) } : { kind: 'beat' },
    ),
  ];

  it('replays to exactly the same state and events', () => {
    expect(replay(1234, inputs)).toEqual(replay(1234, inputs));
  });

  it('never modifies the state passed to step()', () => {
    const state = playState([{ pos: vec(1, 2) }], [{ kind: 'chaser', pos: vec(1, 6) }]);
    const before = JSON.stringify(state);
    step(state, vec(1, 3));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps its invariants through long random runs', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let state = createRun(seed);
      dispatch(state, { type: 'hike' });
      for (let beat = 0; beat < 200 && state.phase !== 'over'; beat++) {
        if (state.phase === 'cleared') dispatch(state, { type: 'nextScreen' });
        if (state.phase === 'setup') dispatch(state, { type: 'hike' });
        const throwAt = beat % 7 === 0 ? vec((seed + beat) % 9, 2 + (beat % 10)) : null;
        state = step(state, throwAt).state;
        const live = [...state.screen.smalls, ...state.screen.defenders].filter((u) => u.alive);
        for (const side of ['small', 'defender']) {
          const tiles = live.filter((u) => u.side === side).map((u) => key(u.pos));
          expect(new Set(tiles).size).toBe(tiles.length);
        }
        expect(live.some((u) => eq(u.pos, BIG_POS))).toBe(false);
        expect(state.balls).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
