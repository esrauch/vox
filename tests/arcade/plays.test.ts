import { describe, expect, it } from 'vitest';
import { PLAYS } from '../../src/arcade/content/plays';
import { LINEUP, ROSTER_ROLES } from '../../src/arcade/content/team';
import { arcadeTuning } from '../../src/arcade/content/tuning';

describe('the four plays', () => {
  const routes = PLAYS.flatMap((play) =>
    play.slots.flatMap((a, slot) => {
      const start = LINEUP[slot];
      if (a.kind !== 'route' || !start) return [];
      const path = [start, ...a.to.map((w) => ({ x: start.x + w.x, y: start.y + w.y }))];
      return [{ play: play.id, slot, path }];
    }),
  );

  it('every route finishes going upfield, or curls back at an angle', () => {
    for (const { play, slot, path } of routes) {
      const end = path[path.length - 1]!;
      const before = path[path.length - 2]!;
      const dy = end.y - before.y;
      const dx = end.x - before.x;
      const label = `${play} slot ${slot}`;
      if (dy < 0) {
        // A curl: it comes back at an angle, so it reads as a curl.
        expect(Math.abs(dx), label).toBeGreaterThanOrEqual(1);
      } else {
        expect(dy, label).toBeGreaterThan(Math.abs(dx));
      }
    }
  });

  it('every Runner gets out past the line of scrimmage: only the Blockers stay home', () => {
    for (const play of PLAYS) {
      play.slots.forEach((a, slot) => {
        const label = `${play.id} slot ${slot}`;
        if (ROSTER_ROLES[slot] === 'blocker') return;
        expect(a.kind, label).toBe('route');
        if (a.kind !== 'route' || ROSTER_ROLES[slot] !== 'runner') return;
        const start = LINEUP[slot]!;
        const deepest = Math.max(...a.to.map((w) => start.y + w.y));
        expect(deepest, label).toBeGreaterThan(1);
      });
    }
  });

  it('no route goes deeper than a throw can reach, or off the field', () => {
    const { maxAhead } = arcadeTuning.throw;
    for (const { play, slot, path } of routes) {
      for (const p of path) {
        expect(p.y, `${play} slot ${slot}`).toBeLessThanOrEqual(maxAhead - 2);
        expect(Math.abs(p.x), `${play} slot ${slot}`).toBeLessThanOrEqual(
          arcadeTuning.field.halfWidth,
        );
      }
    }
  });
});
