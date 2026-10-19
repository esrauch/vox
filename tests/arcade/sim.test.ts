import { describe, expect, it } from 'vitest';
import { PLAYS } from '../../src/arcade/content/plays';
import { arcadeTuning } from '../../src/arcade/content/tuning';
import { arcPeak, ballHeight, flightTime } from '../../src/arcade/sim/ball';
import { physicsOf } from '../../src/arcade/sim/bodies';
import {
  createRun,
  dispatch,
  downAndDistance,
  endDown,
  nextDown,
  startingRoster,
} from '../../src/arcade/sim/run';
import { step, throwProblem } from '../../src/arcade/sim/step';
import type { ArcadeEvent, RunState } from '../../src/arcade/sim/types';
import { dist, v } from '../../src/arcade/sim/vec';
import { body, carry, ofType, playState, run, stand } from './helpers';

const PAUSE = arcadeTuning.drive.pause;

describe('a run', () => {
  it('starts on the first drive: 1st & 10, eight a side lined up, a play picked, no draft', () => {
    const s = createRun(1);
    expect(s.phase).toBe('setup');
    expect(s.drive).toMatchObject({ index: 0, kind: 'intro', down: 1, los: 0, firstDown: 10 });
    expect(downAndDistance(s)).toBe('1st & 10');
    expect(s.field.players).toHaveLength(8);
    expect(s.field.players.filter((p) => p.role === 'qb')).toHaveLength(1);
    expect(s.roster.map((p) => p.role)).toEqual([
      'blocker',
      'blocker',
      'runner',
      'runner',
      'catcher',
      'catcher',
      'catcher',
    ]);
    // The first drive is a few sleepy defenders.
    expect(s.field.defenders.length).toBeLessThanOrEqual(4);
    expect(PLAYS[s.play.index]).toBeDefined();
  });

  it('picks the play at random from the four, sometimes mirrored', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const s = createRun(seed);
      seen.add(`${s.play.index}${s.play.flipped ? 'f' : ''}`);
    }
    expect(seen.size).toBe(8);
  });

  it('nobody but the Bats moves before the snap', () => {
    const s = createRun(1);
    const before = s.field.players.map((p) => p.pos);
    const after = run(s, 1).state;
    expect(after.field.players.map((p) => p.pos)).toEqual(before);
  });

  it('the snap starts the play, and Covers pick marks', () => {
    const snapped = dispatch(createRun(1), { type: 'snap' });
    expect(snapped.state.phase).toBe('play');
    const covers = snapped.state.field.defenders.filter((d) => d.kind === 'cover');
    expect(covers.every((d) => d.mark !== null)).toBe(true);
  });
});

describe('handing off', () => {
  const runnerOf = (s: RunState) => s.field.players.find((p) => p.role === 'runner')!;
  const catcherOf = (s: RunState) => s.field.players.find((p) => p.role === 'catcher')!;

  it('tapping a Runner before the snap snaps the ball and hands it off', () => {
    const s = createRun(1);
    const r = dispatch(s, { type: 'handoff', id: runnerOf(s).id });
    expect(r.state.phase).toBe('play');
    expect(r.events.map((e) => e.type)).toEqual(['snapped', 'handoff']);
    expect(r.state.field.ball).toEqual({ at: 'carried', by: runnerOf(s).id });
  });

  it('works on any play, in the first second after the snap, while the QB has the ball', () => {
    const s = dispatch(createRun(2), { type: 'snap' }).state;
    const soon = run(s, 0.5).state;
    expect(dispatch(soon, { type: 'handoff', id: runnerOf(s).id }).state.field.ball.at).toBe(
      'carried',
    );
    const late = run(s, arcadeTuning.throw.handoffWindow + 0.2).state;
    if (late.phase === 'play') {
      expect(dispatch(late, { type: 'handoff', id: runnerOf(s).id }).state.field.ball.at).not.toBe(
        'carried',
      );
    }
  });

  it('only to a Runner: tapping anyone else does nothing, not even the snap', () => {
    const s = createRun(1);
    const r = dispatch(s, { type: 'handoff', id: catcherOf(s).id });
    expect(r.state.phase).toBe('setup');
    expect(r.events).toHaveLength(0);
  });
});

describe('stats are physics', () => {
  it('Heft is weight, Hustle is speed, Hands is reach: each point the same step', () => {
    const base = physicsOf({ hustle: 0, hands: 0, heft: 0 });
    const more = physicsOf({ hustle: 1, hands: 1, heft: 1 });
    expect(more.mass / base.mass).toBeCloseTo(arcadeTuning.body.mass.perHeft);
    expect(more.speed).toBeGreaterThan(base.speed);
    expect(more.reach).toBeGreaterThan(base.reach);
  });

  it('a faster player outruns a slower one', () => {
    const s = playState([
      { pos: v(-5, 0), stats: { hustle: 2 } },
      { pos: v(5, 0), stats: { hustle: -1 } },
    ]);
    const r = run(s, 1.5).state;
    expect(body(r, 2).pos.y).toBeGreaterThan(body(r, 3).pos.y + 1);
  });

  it('in a shove, the heavier one pushes the lighter one back', () => {
    // A Blocker driving into a lighter rusher, both heading for each other.
    const s = playState(
      [{ role: 'blocker', pos: v(0, -2), stats: { heft: 2 }, job: { kind: 'block' } }],
      [{ kind: 'rusher', pos: v(0, -0.8), stats: { heft: 1 } }],
    );
    const r = run(s, 1).state;
    // The rusher (going for the QB on (0, -4)) hasn't got past the Blocker.
    expect(body(r, 100).pos.y).toBeGreaterThan(body(r, 2).pos.y);
  });

  it('a Blocker 3 Heft heavier pancakes the defender it hits', () => {
    const s = playState(
      [{ role: 'blocker', pos: v(0, -2), stats: { heft: 3 }, job: { kind: 'block' } }],
      [{ kind: 'rusher', pos: v(0, -0.8), stats: { heft: 0 } }],
    );
    const r = run(s, 1);
    expect(ofType(r.events, 'pancake')[0]).toEqual({ type: 'pancake', blocker: 2, defender: 100 });
    expect(body(r.state, 100).down).toBeGreaterThan(0);
  });
});

describe('the pocket', () => {
  it('a rusher that reaches the QB while it holds the ball sacks it', () => {
    const s = playState([], [{ kind: 'rusher', pos: v(0, 0) }]);
    const r = run(s, 3);
    expect(ofType(r.events, 'sacked')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('sacked');
  });
});

describe('passes', () => {
  // A Catcher standing on (4, 6), the QB on (0, -4).
  const pass = (
    defenders: Parameters<typeof playState>[1] = [],
    catcherStats = {},
    target = v(4, 6),
  ) => {
    const s = playState([{ pos: v(4, 6), stats: catcherStats, job: stand(v(4, 6)) }], defenders);
    return run(s, 3, { throwAt: target });
  };

  it('a throw to an open Catcher is caught', () => {
    const r = pass();
    expect(ofType(r.events, 'caught')).toEqual([{ type: 'caught', id: 2, contested: false }]);
  });

  it('contested, the better Hands wins it: a defender with more Hands bats it down', () => {
    const r = pass([{ kind: 'safety', pos: v(4.6, 6), stats: { hands: 3 } }], { hands: 0 });
    expect(ofType(r.events, 'batted')[0]?.by).toBe(100);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('batted');
  });

  it('ties go to you', () => {
    // The two stand either side of the ball's path, so they reach it at the same moment.
    const s = playState(
      [{ pos: v(4.37, 5.85), stats: { hands: 1 }, job: stand(v(4.37, 5.85)) }],
      [{ kind: 'zone', pos: v(3.63, 6.15), stats: { hands: 1 } }],
    );
    const r = run(s, 3, { throwAt: v(4, 6) });
    expect(ofType(r.events, 'caught')[0]?.contested).toBe(true);
  });

  it('with nobody in reach it is incomplete', () => {
    const r = pass([], {}, v(-8, 8));
    expect(ofType(r.events, 'incomplete')).toHaveLength(1);
    expect(r.state.drive.down).toBe(1);
    expect(run(r.state, PAUSE + 0.1).state.drive.down).toBe(2);
  });

  it('the further the throw, the higher the arc and the longer the flight', () => {
    expect(arcPeak(20)).toBeGreaterThan(arcPeak(8));
    expect(flightTime(v(0, 0), v(0, 20))).toBeGreaterThan(flightTime(v(0, 0), v(0, 8)));
    // A long pass is out of reach in the middle of its flight; a short one isn't.
    expect(ballHeight(20, 0.5)).toBeGreaterThan(arcadeTuning.throw.reachHeight);
    expect(ballHeight(6, 0.5)).toBeLessThan(arcadeTuning.throw.reachHeight);
  });

  it('a long pass sails over a defender underneath it', () => {
    const s = playState(
      [{ pos: v(0, 16), job: stand(v(0, 16)) }],
      [{ kind: 'zone', pos: v(0, 6), stats: { hands: 5 } }],
    );
    const r = run(s, 3, { throwAt: v(0, 16) });
    expect(ofType(r.events, 'caught')).toHaveLength(1);
  });

  it('throws are measured from the line of scrimmage, and too close cancels', () => {
    const s = playState([]);
    expect(throwProblem(s, v(0, 31))).toBe('tooFar');
    expect(throwProblem(s, v(20, 5))).toBe('offField');
    expect(throwProblem(s, v(0, -3.5))).toBe('tooClose');
    expect(throwProblem(s, v(0, 12))).toBeNull();
  });
});

describe('the carrier', () => {
  it('charges upfield and a defender touching it tackles it: the next down starts there', () => {
    const s = carry(
      playState([{ pos: v(0, 2) }], [{ kind: 'cover', pos: v(0, 6), stats: { heft: 0 } }]),
      2,
    );
    const r = run(s, 2);
    expect(ofType(r.events, 'tackled')).toHaveLength(1);
    const los = r.state.drive.los;
    expect(los).toBeGreaterThan(2);
    expect(run(r.state, PAUSE + 0.1).state.drive).toMatchObject({ down: 2 });
  });

  it('a carrier 2 Heft heavier breaks the tackle and keeps going', () => {
    const s = carry(
      playState(
        [{ role: 'runner', pos: v(0, 2), stats: { heft: 2 } }],
        [{ kind: 'cover', pos: v(0, 6), stats: { heft: 0 } }],
      ),
      2,
    );
    const r = run(s, 3);
    expect(ofType(r.events, 'brokeTackle')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('firstDown');
  });

  it('a swipe nudges its lane a step to that side, and it drifts there', () => {
    const s = carry(playState([{ pos: v(0, 0) }]), 2);
    const r = run(s, 0.8, { steer: 1 });
    expect(r.state.field.lane).toBeCloseTo(arcadeTuning.carrier.steerStep);
    expect(body(r.state, 2).pos.x).toBeGreaterThan(0.8);
  });

  it('over the sideline, it is down there', () => {
    const hw = arcadeTuning.field.halfWidth;
    const s = carry(playState([{ pos: v(hw - 0.5, 0) }]), 2);
    let r = { state: s, events: [] as ArcadeEvent[] };
    for (let i = 0; i < 4 && r.state.phase === 'play'; i++) {
      const next = run(r.state, 0.15, { steer: 1 });
      r = { state: next.state, events: [...r.events, ...next.events] };
    }
    expect(ofType(r.events, 'outOfBounds')).toHaveLength(1);
  });

  it('over the first-down line wins the drive', () => {
    const s = carry(playState([{ pos: v(0, 8) }]), 2);
    const r = run(s, 1);
    expect(ofType(r.events, 'downEnded')[0]?.result).toBe('firstDown');
  });
});

describe('drives and the run', () => {
  const winDrive = (s: RunState): RunState => {
    const t = structuredClone(s);
    const events: ArcadeEvent[] = [];
    endDown(t, 'firstDown', t.drive.firstDown, events);
    nextDown(t, events);
    return t;
  };

  it('a won drive lines up the next one, waiting for the move on', () => {
    const s = winDrive(createRun(3));
    expect(s.phase).toBe('draft');
    expect(s.drive).toMatchObject({ index: 1, kind: 'challenge', down: 1, los: 0 });
    expect(dispatch(s, { type: 'skipDraft' }).state.phase).toBe('setup');
  });

  it('failing on 4th down is game over', () => {
    const s = playState([], [{ kind: 'rusher', pos: v(0, -2.5) }]);
    s.drive.down = 4;
    const r = run(run(s, 3).state, PAUSE + 0.1);
    expect(r.state.phase).toBe('over');
    expect(ofType(r.events, 'gameOver')).toHaveLength(1);
  });

  it('the main game is three areas of four drives, each area stiffer; the last Boss wins it', () => {
    let s = createRun(7);
    const drives: string[] = [];
    const coverHeft: number[] = [];
    for (let i = 0; i < 12; i++) {
      drives.push(`${s.drive.area}:${s.drive.kind}`);
      const cover = s.field.defenders.find((d) => d.kind === 'cover');
      if (s.drive.kind === 'intro' && cover) coverHeft.push(cover.stats.heft);
      s = winDrive(s);
      if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
    }
    const area = (a: number) => ['intro', 'challenge', 'gimmick', 'boss'].map((k) => `${a}:${k}`);
    expect(drives).toEqual([...area(0), ...area(1), ...area(2)]);
    expect(s.phase).toBe('won');
    expect(coverHeft).toEqual([-2, -1, 0]);
  });

  it('the Boss drive goes for the end zone: "& Goal"', () => {
    const s = createRun(1);
    s.drive = { ...s.drive, kind: 'boss', down: 3 };
    expect(downAndDistance(s)).toBe('3rd & Goal');
  });
});

describe('determinism', () => {
  const playOut = (seed: number): RunState => {
    let s = createRun(seed);
    for (let i = 0; i < 1500; i++) {
      if (s.phase === 'setup') s = dispatch(s, { type: 'snap' }).state;
      if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
      if (s.phase === 'over' || s.phase === 'won') break;
      const throwAt =
        s.phase === 'play' && s.field.ball.at === 'qb' && s.time - s.snappedAt > 1.2
          ? v(4, s.drive.los + 8)
          : undefined;
      s = step(s, throwAt ? { throwAt } : {}).state;
    }
    return s;
  };

  it('replays the same run from the same seed and inputs', () => {
    expect(JSON.stringify(playOut(42))).toBe(JSON.stringify(playOut(42)));
  });

  it('never modifies the state passed to step() or dispatch()', () => {
    const s = createRun(3);
    const before = JSON.stringify(s);
    step(s);
    dispatch(s, { type: 'snap' });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('keeps its invariants through long runs: no NaNs, nobody off the field but the carrier', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let s = createRun(seed, startingRoster());
      for (let i = 0; i < 3000 && s.phase !== 'over' && s.phase !== 'won'; i++) {
        if (s.phase === 'setup') s = dispatch(s, { type: 'snap' }).state;
        if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
        const throwAt =
          s.phase === 'play' && s.field.ball.at === 'qb' && s.time - s.snappedAt > 1
            ? v((seed % 5) - 2, s.drive.los + 6 + (i % 9))
            : undefined;
        s = step(s, throwAt ? { throwAt } : {}).state;
        const carrierId = s.field.ball.at === 'carried' ? s.field.ball.by : null;
        for (const b of [...s.field.players, ...s.field.defenders]) {
          expect(Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y)).toBe(true);
          if (b.id !== carrierId)
            expect(Math.abs(b.pos.x)).toBeLessThanOrEqual(arcadeTuning.field.halfWidth + 1e-9);
        }
      }
    }
  });
});

it('dist is Euclidean', () => {
  expect(dist(v(0, 0), v(3, 4))).toBe(5);
});
