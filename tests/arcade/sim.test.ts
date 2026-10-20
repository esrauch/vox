import { describe, expect, it } from 'vitest';
import { PLAYS } from '../../src/arcade/content/plays';
import { arcadeTuning } from '../../src/arcade/content/tuning';
import { pocketTime, sweepAngle, sweepSpeed } from '../../src/arcade/sim/ball';
import { physicsOf } from '../../src/arcade/sim/bodies';
import {
  createRun,
  dispatch,
  downAndDistance,
  endDown,
  nextDown,
  startingRoster,
} from '../../src/arcade/sim/run';
import { breakMarker, canThrow, step } from '../../src/arcade/sim/step';
import type { ArcadeEvent, RunState } from '../../src/arcade/sim/types';
import { dist, v } from '../../src/arcade/sim/vec';
import {
  body,
  carry,
  ofType,
  playState,
  run,
  stand,
  tapAt,
  throwAt,
  untilGrabbed,
} from './helpers';

const PAUSE = arcadeTuning.drive.pause;
const passCard = (s: RunState) => s.hand.findIndex((i) => PLAYS[i]?.handoff === undefined);
const runCard = (s: RunState) => s.hand.findIndex((i) => PLAYS[i]?.handoff !== undefined);

describe('a run', () => {
  it('starts on the first drive: 1st & 10, eight a side, three play cards, no draft', () => {
    const s = createRun(1);
    expect(s.phase).toBe('setup');
    expect(s.drive).toMatchObject({ index: 0, kind: 'intro', down: 1, los: 0, firstDown: 10 });
    expect(downAndDistance(s)).toBe('1st & 10');
    expect(s.field.players).toHaveLength(8);
    expect(s.hand).toHaveLength(3);
    expect(new Set(s.hand).size).toBe(3);
    expect(s.roster.map((p) => p.role)).toEqual([
      'blocker',
      'blocker',
      'runner',
      'runner',
      'catcher',
      'catcher',
      'catcher',
    ]);
    expect(s.field.defenders.length).toBeLessThanOrEqual(4);
  });

  it('deals different hands, with handoff cards among them', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) createRun(seed).hand.forEach((i) => seen.add(i));
    expect(seen.size).toBe(PLAYS.length);
    expect(PLAYS.some((p) => p.handoff !== undefined)).toBe(true);
  });

  it('nobody but the Bats moves before the call', () => {
    const s = createRun(1);
    const before = s.field.players.map((p) => p.pos);
    expect(run(s, 1).state.field.players.map((p) => p.pos)).toEqual(before);
  });

  it('calling a card shows its play on the field; HIKE starts it', () => {
    const s = createRun(4);
    expect(dispatch(s, { type: 'hike' }).state.phase).toBe('setup'); // nothing called yet
    const called = dispatch(s, { type: 'call', hand: 1 });
    expect(called.state.phase).toBe('setup');
    expect(called.state.called).toBe(1);
    expect(called.state.play).toEqual({ index: s.hand[1], flipped: false });
    expect(called.state.field.players.some((p) => p.job.kind === 'route')).toBe(true);
    // Another card can be called instead, until the hike.
    expect(dispatch(called.state, { type: 'call', hand: 2 }).state.called).toBe(2);
    const hiked = dispatch(called.state, { type: 'hike' });
    expect(hiked.state.phase).toBe('play');
    expect(ofType(hiked.events, 'snapped')).toHaveLength(1);
    expect(dispatch(s, { type: 'call', hand: 5 }).state.called).toBeNull();
  });

  it('Flip mirrors the called play where it stands', () => {
    const s = createRun(4);
    const called = dispatch(s, { type: 'call', hand: 1 }).state;
    const flipped = dispatch(called, { type: 'flip' }).state;
    expect(flipped.play.flipped).toBe(true);
    const routeEnds = (st: RunState) =>
      st.field.players.flatMap((p) =>
        p.job.kind === 'route' ? [p.job.to[p.job.to.length - 1]!.x] : [],
      );
    expect(routeEnds(flipped)).toEqual(routeEnds(called).map((x) => -x));
  });

  it('a handoff card gives its Runner the ball at the hike', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createRun(seed);
      const card = runCard(s);
      if (card < 0) continue;
      const r = dispatch(dispatch(s, { type: 'call', hand: card }).state, { type: 'hike' });
      expect(ofType(r.events, 'handoff')).toHaveLength(1);
      expect(r.state.field.ball.at).toBe('carried');
      return;
    }
    throw new Error('no handoff card dealt');
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

  it('a Blocker holds the rusher it is on', () => {
    const rush = (blocked: boolean) => {
      const s = playState(
        blocked
          ? [{ role: 'blocker', pos: v(0, -1.2), stats: { heft: 1 }, job: { kind: 'block' } }]
          : [],
        [{ kind: 'rusher', pos: v(0, 0), stats: { heft: 1 } }],
      );
      return body(run(s, 1.5).state, blocked ? 100 : 100).pos.y;
    };
    // Unblocked, it charges back at the QB; blocked, it barely moves.
    expect(rush(true)).toBeGreaterThan(rush(false) + 1);
  });

  it('a Blocker 3 Heft heavier pancakes the defender it hits', () => {
    const s = playState(
      [{ role: 'blocker', pos: v(0, -2), stats: { heft: 3 }, job: { kind: 'block' } }],
      [{ kind: 'rusher', pos: v(0, -0.8), stats: { heft: 0 } }],
    );
    const r = run(s, 1);
    expect(ofType(r.events, 'pancake')[0]).toEqual({ type: 'pancake', blocker: 2, defender: 100 });
  });
});

describe('the sweep and the pocket', () => {
  it('the line starts at the left sideline and sweeps back and forth', () => {
    const s = playState([]);
    const h = (arcadeTuning.sweep.halfAngle * Math.PI) / 180;
    expect(sweepAngle(s)).toBeCloseTo(-h);
    const angles = Array.from({ length: 300 }, (_, i) =>
      sweepAngle({ ...s, time: s.time + i / 60 }),
    );
    expect(Math.max(...angles)).toBeCloseTo(h, 1);
    expect(Math.min(...angles)).toBeCloseTo(-h, 1);
  });

  it('it sweeps faster in later areas, and on the Boss', () => {
    const s = playState([]);
    const at = (area: number, kind: RunState['drive']['kind']) =>
      sweepSpeed({ ...s, drive: { ...s.drive, area, kind } });
    expect(at(1, 'intro')).toBeGreaterThan(at(0, 'intro'));
    expect(at(0, 'boss')).toBeGreaterThan(at(0, 'intro'));
  });

  it('the pocket holds for its sweeps; then, with the ball still in hand, it is a sack', () => {
    const s = playState([]);
    const held = run(s, pocketTime(s) - 0.1);
    expect(ofType(held.events, 'sacked')).toHaveLength(0);
    const r = run(s, pocketTime(s) + 0.2);
    expect(ofType(r.events, 'sacked')).toHaveLength(1);
    expect(ofType(r.events, 'downEnded')[0]).toMatchObject({ result: 'sacked' });
  });
});

describe('throwing: a bullet along the line', () => {
  // A Catcher standing on (4, 6), the QB on (0, -4).
  const shot = (defenders: Parameters<typeof playState>[1] = [], stats = {}, at = v(4, 6)) => {
    const s = playState([{ pos: at, stats, job: stand(at) }], defenders);
    return run(s, 2, throwAt(s, at));
  };

  it('timed on an open Catcher, it is caught', () => {
    expect(ofType(shot().events, 'caught')).toEqual([{ type: 'caught', id: 2, contested: false }]);
  });

  it('a defender in the lane gets to it first and bats it down', () => {
    const r = shot([{ kind: 'cover', pos: v(2, 1) }]);
    expect(ofType(r.events, 'batted')[0]).toMatchObject({ by: 100, contested: false });
  });

  it('a Scarecrow\\u2019s wide ring blocks a whole lane', () => {
    const r = shot([{ kind: 'zone', pos: v(3.5, 1) }]);
    expect(ofType(r.events, 'batted')[0]?.by).toBe(100);
  });

  it('contested at the catch, the better Hands wins it; ties go to you', () => {
    // A Catcher and a Cover (with nobody to mark, it stands still) either side of the bullet's
    // line to (4, 6), so with even Hands they reach it at the same moment.
    const contest = (catcherHands: number, coverHands: number) => {
      const s = playState(
        [{ pos: v(4.464, 5.814), stats: { hands: catcherHands }, job: stand(v(4.464, 5.814)) }],
        [{ kind: 'cover', pos: v(3.536, 6.186), stats: { hands: coverHands } }],
      );
      return run(s, 2, throwAt(s, v(4, 6)));
    };
    expect(ofType(contest(1, 1).events, 'caught')[0]).toMatchObject({ id: 2, contested: true });
    // Better Hands reach further, so the Cover gets to it first.
    expect(ofType(contest(0, 3).events, 'batted')[0]?.by).toBe(100);
  });

  it('it goes past your players right by the QB', () => {
    const s = playState(
      [
        { pos: v(0.3, -2), job: stand(v(0.3, -2)) },
        { pos: v(1.5, 4), job: stand(v(1.5, 4)) },
      ],
      [],
    );
    const r = run(s, 2, throwAt(s, v(1.5, 4)));
    expect(ofType(r.events, 'caught')[0]?.id).toBe(3);
  });

  it('with nobody in the way it is incomplete', () => {
    const s = playState([{ pos: v(4, 6), job: stand(v(4, 6)) }]);
    const r = run(s, 3, throwAt(s, v(-6, 8)));
    expect(ofType(r.events, 'incomplete')).toHaveLength(1);
    expect(run(r.state, PAUSE + 0.1).state.drive.down).toBe(2);
  });

  it('RUN: the QB keeps it and runs, drifting to the open side', () => {
    const s = playState([], [{ kind: 'cover', pos: v(-3, 2) }]);
    const r = run(s, 0.6, { scramble: true });
    expect(ofType(r.events, 'scrambled')).toEqual([{ type: 'scrambled', id: 1 }]);
    expect(body(r.state, 1).pos.x).toBeGreaterThan(0.3);
    expect(canThrow(r.state)).toBe(false);
  });
});

describe('the carrier, and Break it!', () => {
  /** A Runner carrying on (0, 2), a gnome dead ahead on (0, 4). */
  const grabbed = (runnerHeft = 0, extra = false) => {
    const s = carry(
      playState(
        [{ role: 'runner', pos: v(0, 2), stats: { heft: runnerHeft } }],
        [
          { kind: 'cover', pos: v(0, 4), stats: { heft: 0 } },
          ...(extra ? [{ kind: 'cover' as const, pos: v(0.9, 3.6), stats: { heft: 0 } }] : []),
        ],
      ),
      2,
    );
    s.field.lane = 0;
    return untilGrabbed(s);
  };

  it('runs for the emptiest lane by itself', () => {
    const s = carry(
      playState([{ role: 'runner', pos: v(0, 0) }], [{ kind: 'cover', pos: v(-1, 4) }]),
      2,
    );
    const r = run(s, 0.5);
    expect(r.state.field.lane).toBeGreaterThan(0.5);
  });

  it('a defender grabbing it starts Break it!, and the play freezes', () => {
    const r = grabbed();
    expect(r.state.phase).toBe('breakit');
    expect(ofType(r.events, 'grabbed')[0]).toMatchObject({ id: 2, by: [100] });
    const frozen = run(r.state, 0.3).state;
    expect(body(frozen, 2).pos).toEqual(body(r.state, 2).pos);
    expect(breakMarker(frozen)).toBeGreaterThan(0);
  });

  it('a tap in the sweet spot breaks it: the tackler goes flying, the carrier keeps going', () => {
    const g = grabbed().state;
    const { from, to } = g.tackle!.sweet;
    const r = tapAt(g, (from + to) / 2);
    expect(ofType(r.events, 'brokeTackle')).toHaveLength(1);
    expect(r.state.phase).toBe('play');
    expect(body(r.state, 100).down).toBeGreaterThan(0);
  });

  it('a close tap drags the tackler a few yards before going down', () => {
    const g = grabbed().state;
    const t = g.tackle!;
    const close = t.sweet.from > t.near ? t.sweet.from - t.near / 2 : t.sweet.to + t.near / 2;
    const r = tapAt(g, close);
    const dragged = ofType(r.events, 'dragged')[0];
    expect(dragged?.yards).toBeGreaterThan(0);
    const end = run(r.state, 4);
    expect(ofType(end.events, 'tackled')).toHaveLength(1);
    expect(end.state.drive.los).toBeGreaterThan(body(g, 2).pos.y + 0.3);
  });

  it('a tap that misses, or no tap at all, is a tackle', () => {
    const g = grabbed().state;
    const t = g.tackle!;
    // The sweet spot (and its close band) never reaches back to the start of the trip.
    expect(t.sweet.from - t.near).toBeGreaterThan(0.05);
    const miss = 0.02;
    expect(ofType(tapAt(g, miss).events, 'tackled')).toHaveLength(1);
    expect(ofType(run(g, 2).events, 'tackled')).toHaveLength(1);
  });

  it('the sweet spot is never in the first third of the marker\u2019s trip, which runs either way', () => {
    const dirs = new Set<number>();
    for (let k = 0; k < 24; k++) {
      // Different starting spots grab on different steps, so each meter is a fresh draw.
      const s = carry(
        playState(
          [{ role: 'runner', pos: v(0, 2 - k * 0.07) }],
          [{ kind: 'cover', pos: v(0, 4), stats: { heft: 0 } }],
        ),
        2,
      );
      s.field.lane = 0;
      const t = untilGrabbed(s).state.tackle!;
      expect(t.sweet.from).toBeGreaterThanOrEqual(arcadeTuning.breakit.earliest);
      expect(t.sweet.to).toBeLessThanOrEqual(1);
      dirs.add(t.dir);
    }
    expect([...dirs].sort()).toEqual([-1, 1]);
  });

  it('more Heft widens the sweet spot; an extra tackler narrows it', () => {
    const width = (heft: number, extra = false) => {
      const t = grabbed(heft, extra).state.tackle!;
      return t.sweet.to - t.sweet.from;
    };
    expect(width(3)).toBeGreaterThan(width(0));
    expect(width(0, true)).toBeLessThan(width(0));
  });

  it('running into a planted Scarecrow stops it dead', () => {
    const s = carry(
      // Right in its face: it has no time to pick another lane.
      playState([{ role: 'runner', pos: v(0, 2) }], [{ kind: 'zone', pos: v(0, 3.05) }]),
      2,
    );
    s.field.lane = 0;
    const r = run(s, 2);
    expect(ofType(r.events, 'tackled')[0]?.by).toBe(100);
    expect(ofType(r.events, 'grabbed')).toHaveLength(0);
  });

  it('over the sideline, it is down there', () => {
    const hw = arcadeTuning.field.halfWidth;
    const s = carry(playState([{ pos: v(hw + 0.2, 0) }]), 2);
    expect(ofType(run(s, 0.2).events, 'outOfBounds')).toHaveLength(1);
  });

  it('over the first-down line wins the drive', () => {
    const s = carry(playState([{ pos: v(0, 8) }]), 2);
    expect(ofType(run(s, 1.5).events, 'downEnded')[0]?.result).toBe('firstDown');
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
    const s = playState([]);
    s.drive.down = 4;
    const r = run(run(s, pocketTime(s) + 0.5).state, PAUSE + 0.1);
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
  /** A crude player: calls a pass card, throws a second in, taps Break it! halfway. */
  const playOut = (seed: number, steps = 3000): RunState => {
    let s = createRun(seed, startingRoster());
    for (let i = 0; i < steps && s.phase !== 'over' && s.phase !== 'won'; i++) {
      if (s.phase === 'setup') {
        s = dispatch(s, { type: 'call', hand: Math.max(0, passCard(s)) }).state;
        s = dispatch(s, { type: 'hike' }).state;
      }
      if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
      const input =
        s.phase === 'breakit'
          ? { breakTap: (breakMarker(s) ?? 0) > 0.5 }
          : canThrow(s) && s.time - s.snappedAt > 1
            ? { throw: true }
            : {};
      s = step(s, input).state;
    }
    return s;
  };

  it('replays the same run from the same seed and inputs', () => {
    expect(JSON.stringify(playOut(42, 1500))).toBe(JSON.stringify(playOut(42, 1500)));
  });

  it('never modifies the state passed to step() or dispatch()', () => {
    const s = createRun(3);
    const before = JSON.stringify(s);
    step(s);
    dispatch(s, { type: 'call', hand: 0 });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('keeps its invariants through long runs: no NaNs, nobody off the field but the carrier', () => {
    for (let seed = 1; seed <= 8; seed++) {
      let s = createRun(seed);
      for (let i = 0; i < 2500 && s.phase !== 'over' && s.phase !== 'won'; i++) {
        if (s.phase === 'setup') {
          s = dispatch(dispatch(s, { type: 'call', hand: i % 3 }).state, { type: 'hike' }).state;
        }
        if (s.phase === 'draft') s = dispatch(s, { type: 'skipDraft' }).state;
        const input =
          s.phase === 'breakit'
            ? { breakTap: i % 7 === 0 }
            : canThrow(s) && i % 50 === 0
              ? { throw: true }
              : {};
        s = step(s, input).state;
        const carrierId = s.field.ball.at === 'carried' ? s.field.ball.by : null;
        for (const b of [...s.field.players, ...s.field.defenders]) {
          expect(Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y)).toBe(true);
          if (b.id !== carrierId && !(b.side === 'defense' && b.latch)) {
            expect(Math.abs(b.pos.x)).toBeLessThanOrEqual(arcadeTuning.field.halfWidth + 1e-9);
          }
        }
      }
    }
  });
});

it('dist is Euclidean', () => {
  expect(dist(v(0, 0), v(3, 4))).toBe(5);
});
