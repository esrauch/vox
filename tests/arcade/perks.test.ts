import { describe, expect, it } from 'vitest';
import { arcadeTuning } from '../../src/arcade/content/tuning';
import { pocketTime, sweepSpeed } from '../../src/arcade/sim/ball';
import { createRun, dispatch, endDown, nextDown } from '../../src/arcade/sim/run';
import { forceBreakKind } from '../../src/arcade/sim/step';
import { applyPerk, noPerks, playerStats } from '../../src/arcade/sim/team';
import type { ArcadeEvent, Perk, RunState } from '../../src/arcade/sim/types';
import { v } from '../../src/arcade/sim/vec';
import { carry, ofType, playState, run, stand, tapAt, throwAt, untilGrabbed } from './helpers';

/** A run just past its first won drive: TRICK OR TREAT! is on. */
const atDraft = (seed = 3): RunState => {
  const s = createRun(seed);
  const events: ArcadeEvent[] = [];
  endDown(s, 'firstDown', s.drive.firstDown, events);
  nextDown(s, events);
  return s;
};

/** A run at TRICK OR TREAT! with this perk on offer first. */
const offering = (perk: Perk): RunState => {
  const s = atDraft();
  s.offer = [perk, ...s.offer.slice(1)];
  return s;
};

describe('TRICK OR TREAT!', () => {
  it('after a won drive, three different perks are offered, each with a rarity', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = atDraft(seed);
      expect(s.phase).toBe('draft');
      expect(s.offer).toHaveLength(3);
      expect(new Set(s.offer.map((p) => JSON.stringify(p))).size).toBe(3);
      for (const p of s.offer) expect(['common', 'rare', 'epic']).toContain(p.rarity);
    }
  });

  it('+10 to a stat for everyone shows up on every player in the line-up', () => {
    const s = dispatch(offering({ rarity: 'common', kind: 'allStat', stat: 'hands', amount: 10 }), {
      type: 'pick',
      offer: 0,
    }).state;
    expect(s.phase).toBe('setup');
    s.roster.forEach((p, slot) => expect(playerStats(s, slot).hands).toBe(p.stats.hands + 10));
    const catcher = s.field.players.find((p) => p.slot === 4)!;
    expect(catcher.stats.hands).toBe(s.roster[4]!.stats.hands + 10);
  });

  it('a kind perk only helps players of that kind', () => {
    const s = offering({
      rarity: 'rare',
      kind: 'kindStat',
      form: 'ghost',
      stat: 'heft',
      amount: 20,
    });
    s.roster[0] = { ...s.roster[0]!, kind: 'ghost' };
    s.roster[1] = { ...s.roster[1]!, kind: 'ghost' };
    const after = dispatch(s, { type: 'pick', offer: 0 }).state;
    expect(playerStats(after, 0).heft).toBe(after.roster[0]!.stats.heft + 20);
    expect(playerStats(after, 5).heft).toBe(after.roster[5]!.stats.heft);
  });

  it('Monster Mash: +10 to every stat for each player whose kind is unique on the team', () => {
    const s = atDraft();
    s.roster[2] = { ...s.roster[2]!, kind: 'werewolf' };
    expect(playerStats(s, 2)).toEqual({
      hustle: s.roster[2]!.stats.hustle + 10,
      hands: s.roster[2]!.stats.hands + 10,
      heft: s.roster[2]!.stats.heft + 10,
    });
    // The six humans aren't unique.
    expect(playerStats(s, 0)).toEqual(s.roster[0]!.stats);
  });

  it('a recruit waits for you to choose who it replaces, then joins in that slot', () => {
    const recruit = {
      name: 'Boo Radish',
      kind: 'ghost' as const,
      preferred: 'catcher' as const,
      stats: { hustle: 70, hands: 75, heft: 30 },
    };
    const picked = dispatch(offering({ rarity: 'rare', kind: 'recruit', player: recruit }), {
      type: 'pick',
      offer: 0,
    });
    expect(picked.state.phase).toBe('draft');
    expect(picked.state.recruit?.name).toBe('Boo Radish');
    const gone = picked.state.roster[6]!.name;
    const placed = dispatch(picked.state, { type: 'place', slot: 6 });
    expect(placed.state.phase).toBe('setup');
    expect(placed.state.roster[6]!.name).toBe('Boo Radish');
    expect(ofType(placed.events, 'joined')[0]).toMatchObject({
      name: 'Boo Radish',
      slot: 6,
      replaced: gone,
    });
  });

  it('any player can play any position: two swap slots', () => {
    const s = atDraft();
    const [a, b] = [s.roster[0]!.name, s.roster[4]!.name];
    const swapped = dispatch(s, { type: 'swap', a: 0, b: 4 }).state;
    expect(swapped.roster[0]!.name).toBe(b);
    expect(swapped.roster[4]!.name).toBe(a);
    // The Catcher now in a Blocker slot plays Blocker, with its own stats.
    const blocker = swapped.field.players.find((p) => p.slot === 0)!;
    expect(blocker.role).toBe('blocker');
    expect(blocker.stats).toEqual(playerStats(swapped, 0));
  });

  it('skipping takes nothing and moves on', () => {
    const s = dispatch(atDraft(), { type: 'skipDraft' }).state;
    expect(s.phase).toBe('setup');
    expect(s.perks).toEqual(noPerks());
  });
});

describe('the perks in play', () => {
  const withPerk = (state: RunState, perk: Perk): RunState => {
    applyPerk(state.perks, perk);
    return state;
  };

  it('Extra Sweep holds the pocket longer; Slow-Mo Sweep slows the line', () => {
    const base = playState([]);
    const extra = withPerk(playState([]), { rarity: 'common', kind: 'extraSweep' });
    expect(pocketTime(extra)).toBeGreaterThan(pocketTime(base));
    const slow = withPerk(playState([]), { rarity: 'rare', kind: 'slowSweep' });
    expect(sweepSpeed(slow)).toBeCloseTo(sweepSpeed(base) * 0.75);
  });

  it('Hot Arm: the ball gets there in half the time', () => {
    const flight = (s: RunState) => {
      const r = run(s, 0.1, throwAt(s, v(4, 6)));
      const thrown = ofType(r.events, 'thrown')[0]!;
      return thrown.landsAt - (r.state.time - 0.1);
    };
    const plain = playState([{ pos: v(4, 6), job: stand(v(4, 6)) }]);
    const hot = withPerk(playState([{ pos: v(4, 6), job: stand(v(4, 6)) }]), {
      rarity: 'rare',
      kind: 'hotArm',
    });
    expect(flight(hot)).toBeLessThan(flight(plain) * 0.75);
  });

  it('Candy Corn Magnet: a throw about to fall incomplete near a Catcher is caught', () => {
    // The bullet runs out at (6.8, 30), the end of its range; a Catcher stands 1.65 yards off it:
    // out of reach, but not of twice its reach.
    const make = () => playState([{ pos: v(8.4, 29.6), job: stand(v(8.4, 29.6)) }]);
    const end = v(6.8, 30);
    const plain = make();
    expect(ofType(run(plain, 3, throwAt(plain, end)).events, 'caught')).toHaveLength(0);
    const magnet = withPerk(make(), { rarity: 'rare', kind: 'magnet' });
    const r = run(magnet, 3, throwAt(magnet, end));
    expect(ofType(r.events, 'caught')).toHaveLength(1);
  });

  it('Second Wind: once a drive, a BAD Break it! counts as OK', () => {
    forceBreakKind('bar');
    const s = carry(
      playState(
        [{ role: 'runner', pos: v(0, 2) }],
        [{ kind: 'cover', pos: v(0, 4), stats: { heft: 50 } }],
      ),
      2,
    );
    s.field.lane = 0;
    withPerk(s, { rarity: 'rare', kind: 'secondWind' });
    const g = untilGrabbed(s).state;
    const r = tapAt(g, 0.02);
    forceBreakKind(undefined);
    expect(ofType(r.events, 'breakResult')[0]?.outcome).toBe('drag');
    expect(r.state.perks.secondWindUsed).toBe(true);
    expect(arcadeTuning.breakit.ready).toBeGreaterThan(0);
  });
});
