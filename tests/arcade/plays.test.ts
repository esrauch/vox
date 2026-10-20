import { describe, expect, it } from 'vitest';
import { PLAYS } from '../../src/arcade/content/plays';
import { LINEUP } from '../../src/arcade/content/team';
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
