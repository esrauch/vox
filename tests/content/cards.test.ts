import { describe, expect, it } from 'vitest';
import { AREAS } from '../../src/content/areas';
import { CARDS, DRAFT_POOL, STARTER_DECK, flipPlayer, playCard } from '../../src/content/cards';
import { formation } from '../../src/sim/drive';
import { key } from '../../src/sim/grid';

describe('play cards', () => {
  const cards = Object.values(CARDS);

  it('every route uses only U, D, L, R and "."', () => {
    for (const c of cards) for (const p of c.players) expect(p.route, c.id).toMatch(/^[UDLR.]*$/);
  });

  it('every formation lines up on the field without two players on one tile, flipped or not', () => {
    for (const c of cards) {
      for (const flipped of [false, true]) {
        const players = formation(c.id, flipped, 2, 1);
        for (const p of players) {
          expect(p.pos.x, c.id).toBeGreaterThanOrEqual(0);
          expect(p.pos.x, c.id).toBeLessThanOrEqual(8);
        }
        const tiles = players.map((p) => key(p.pos));
        expect(new Set(tiles).size, c.id).toBe(tiles.length);
        expect(tiles, `${c.id} puts a player on the QB`).not.toContain('4,0');
      }
    }
  });

  it('a handoff names one of the play’s players', () => {
    for (const c of cards) {
      if (c.handoff !== undefined) expect(c.players[c.handoff], c.id).toBeDefined();
    }
  });

  it('the starter deck and the draft pool only use real cards', () => {
    for (const id of [...STARTER_DECK, ...DRAFT_POOL]) expect(() => playCard(id)).not.toThrow();
  });

  it('Flip mirrors the column and swaps L and R', () => {
    expect(flipPlayer({ x: -3, y: 0, route: 'ULR.' }, true)).toEqual({ x: 3, y: 0, route: 'URL.' });
  });
});

describe('areas', () => {
  it('every drive has a Safety, and defenders line up on the field', () => {
    for (const area of AREAS) {
      for (const spec of [area.intro, area.challenge, ...area.gimmicks, area.boss]) {
        expect(
          spec.defenders.some((d) => d.kind === 'safety'),
          spec.name,
        ).toBe(true);
        for (const d of spec.defenders) {
          expect(d.x).toBeGreaterThanOrEqual(0);
          expect(d.x).toBeLessThanOrEqual(8);
        }
      }
    }
  });
});
