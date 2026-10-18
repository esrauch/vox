/**
 * Play cards (GAMEPLAY.md, A Down and The Deck). A card is the whole play:
 * where your players line up and every player's route.
 *
 * Formations are relative, in tiles (half-yards): `x` is columns from the
 * middle of the field, `y` is rows from the line of scrimmage (0 = on it,
 * -1 = a row behind). Flip mirrors x (and every L and R). The three middle
 * columns (x -1 to 1) on the line belong to the offensive line, so plays
 * leave them clear.
 *
 * Routes are one move per hop: U up the field, D back, L and R sideways, and
 * "." to stay home and block. When a route runs out, the player stands where
 * it is. The carrier ignores its route and runs straight up. Write routes
 * with `route()`: "U6 RU3" is six ups, then up-right three times.
 */

export type Move = 'U' | 'D' | 'L' | 'R' | '.';

export interface CardPlayer {
  readonly x: number;
  readonly y: number;
  readonly route: string;
}

export interface PlayCard {
  readonly id: string;
  readonly name: string;
  /** One line for the card face. */
  readonly blurb: string;
  readonly players: readonly CardPlayer[];
  /** A handoff play: this player (by index) has the ball at the snap, and the QB doesn't throw. */
  readonly handoff?: number;
}

/** Expand a run-length route: each word is some moves and an optional repeat count ("U6", "RU3"). */
export function route(spec: string): string {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const m = /^([UDLR.]+)(\d*)$/.exec(word);
      if (!m) throw new Error(`Bad route word "${word}"`);
      return (m[1] as string).repeat(Number(m[2] || 1));
    })
    .join('');
}

const card = (c: PlayCard): PlayCard => c;
const p = (x: number, y: number, spec: string): CardPlayer => ({ x, y, route: route(spec) });
/** A player who stays home and blocks (buying the pocket time). */
const blocker = (x: number, y = 0): CardPlayer => ({ x, y, route: '.' });

export const CARDS = {
  go: card({
    id: 'go',
    name: 'Go',
    blurb: 'Both wideouts run deep; the slots sit short.',
    players: [p(-5, 0, 'U20'), p(-2, 0, 'U6 D1'), p(2, 0, 'U6 D1'), p(5, 0, 'U20')],
  }),
  slant: card({
    id: 'slant',
    name: 'Slant',
    blurb: 'The wideouts cut inside, step by step.',
    players: [p(-5, 0, 'U2 RU6'), p(-2, 0, 'U10'), p(2, 0, 'U10'), p(5, 0, 'U2 LU6')],
  }),
  out: card({
    id: 'out',
    name: 'Out',
    blurb: 'The slots break for the sidelines.',
    players: [p(-5, 0, 'U16'), p(-2, 0, 'U6 L4'), p(2, 0, 'U6 R4'), p(5, 0, 'U16')],
  }),
  curl: card({
    id: 'curl',
    name: 'Curl',
    blurb: 'Everyone runs four yards and turns back.',
    players: [p(-5, 0, 'U8 D2'), p(-2, 0, 'U8 D2'), p(2, 0, 'U8 D2'), p(5, 0, 'U8 D2')],
  }),
  screen: card({
    id: 'screen',
    name: 'Screen',
    blurb: 'A short toss behind a wall of blockers.',
    players: [p(3, -2, 'R2'), blocker(2), blocker(3), p(-5, 0, 'U16')],
  }),
  draw: card({
    id: 'draw',
    name: 'Draw',
    blurb: 'Hand it off and run up the middle. No throw.',
    handoff: 0,
    players: [p(0, -2, ''), blocker(-2), blocker(2), p(5, 0, 'U16')],
  }),
  verticals: card({
    id: 'verticals',
    name: 'Four Verticals',
    blurb: 'Everybody goes deep. Somebody gets open.',
    players: [p(-5, 0, 'U20'), p(-2, 0, 'U20'), p(2, 0, 'U20'), p(5, 0, 'U20')],
  }),
  mesh: card({
    id: 'mesh',
    name: 'Mesh',
    blurb: 'Two receivers cross, scraping their covers off.',
    players: [p(-4, 0, 'U3 R8'), p(4, 0, 'U5 L8'), p(-5, 0, 'U16'), p(5, 0, 'U16')],
  }),
  flood: card({
    id: 'flood',
    name: 'Flood',
    blurb: 'Three receivers flood one side at three depths.',
    players: [p(2, 0, 'U1 R3'), p(3, 0, 'U5 R2'), p(4, 0, 'U10 R1'), p(-5, 0, 'U16')],
  }),
  quickOut: card({
    id: 'quickOut',
    name: 'Quick Out',
    blurb: 'Two steps and out to the sideline, both sides.',
    players: [p(-2, 0, 'U2 L3'), p(2, 0, 'U2 R3'), p(-5, 0, 'U12'), p(5, 0, 'U12')],
  }),
} satisfies Record<string, PlayCard>;

export type CardId = keyof typeof CARDS;

/** The deck every run starts with. */
export const STARTER_DECK: readonly CardId[] = [
  'go',
  'slant',
  'out',
  'curl',
  'screen',
  'draw',
  'slant',
  'curl',
];

/** Cards the draft can offer. */
export const DRAFT_POOL: readonly CardId[] = [
  'verticals',
  'mesh',
  'flood',
  'quickOut',
  'go',
  'slant',
  'out',
  'curl',
  'screen',
  'draw',
];

export function playCard(id: string): PlayCard {
  const c = (CARDS as Record<string, PlayCard>)[id];
  if (!c) throw new Error(`Unknown play card "${id}"`);
  return c;
}

/** A card's player, mirrored if the play is flipped. */
export function flipPlayer(p: CardPlayer, flipped: boolean): CardPlayer {
  if (!flipped) return p;
  const route = [...p.route].map((m) => (m === 'L' ? 'R' : m === 'R' ? 'L' : m)).join('');
  return { x: -p.x, y: p.y, route };
}
