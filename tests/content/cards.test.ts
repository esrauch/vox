import { describe, expect, it } from 'vitest';
import { AREAS } from '../../src/content/areas';
import {
  CARDS,
  DRAFT_POOL,
  STARTER_DECK,
  flipPlayer,
  playCard,
  route,
} from '../../src/content/cards';
import { formation, qbTile } from '../../src/sim/drive';
import { COLS, MID_COL, key } from '../../src/sim/grid';

describe('play cards', () => {
  const cards = Object.values(CARDS);

  it('every route uses only U, D, L, R and "."', () => {
    for (const c of cards) for (const p of c.players) expect(p.route, c.id).toMatch(/^[UDLR.]*$/);
  });

  it('every formation lines up on the field without two players on one tile, flipped or not', () => {
    for (const c of cards) {
      for (const flipped of [false, true]) {
        const players = formation(c.id, flipped, 3, 1);
        for (const p of players) {
          expect(p.pos.x, c.id).toBeGreaterThanOrEqual(0);
          expect(p.pos.x, c.id).toBeLessThan(COLS);
        }
        const tiles = players.map((p) => key(p.pos));
        expect(new Set(tiles).size, c.id).toBe(tiles.length);
        expect(tiles, `${c.id} puts a player on the QB`).not.toContain(key(qbTile(3)));
        // The three middle columns on the line belong to the (drawn) offensive line.
        const onLine = players.filter((p) => p.pos.y === 3 && Math.abs(p.pos.x - MID_COL) <= 1);
        expect(onLine, `${c.id} puts a player in the line`).toHaveLength(0);
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

  it('route() expands run-length words', () => {
    expect(route('U3 RU2 .')).toBe('UUURURU.');
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
          expect(d.x).toBeLessThan(COLS);
        }
      }
    }
  });

  it('every defense is lopsided, so Flip matters', () => {
    const key = (d: { kind: string; x: number; y: number }): string => `${d.kind}@${d.x},${d.y}`;
    for (const area of AREAS) {
      for (const spec of [area.intro, area.challenge, ...area.gimmicks, area.boss]) {
        const spots = new Set(spec.defenders.map(key));
        const mirrored = spec.defenders.map((d) => key({ ...d, x: COLS - 1 - d.x }));
        expect(
          mirrored.every((m) => spots.has(m)),
          spec.name,
        ).toBe(false);
      }
    }
  });
});
