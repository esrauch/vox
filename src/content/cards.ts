/**
 * Play cards (GAMEPLAY.md, A Down and The Deck). A card is the whole play:
 * where your players line up and every player's route.
 *
 * Formations are relative: `x` is columns from the middle of the field, `y`
 * is rows from the line of scrimmage (0 = on it, -1 = a row behind). Flip
 * mirrors x (and every L and R).
 *
 * Routes are one move per hop: U up the field, D back, L and R sideways, and
 * "." to stand still (blockers). When a route runs out, the player stands
 * where it is. The carrier ignores its route and runs straight up.
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

const card = (c: PlayCard): PlayCard => c;

export const CARDS = {
  go: card({
    id: 'go',
    name: 'Go',
    blurb: 'Both wideouts run deep; the slots sit short.',
    players: [
      { x: -4, y: 0, route: 'UUUUUUUUUU' },
      { x: -2, y: 0, route: 'UUUD' },
      { x: 2, y: 0, route: 'UUUD' },
      { x: 4, y: 0, route: 'UUUUUUUUUU' },
    ],
  }),
  slant: card({
    id: 'slant',
    name: 'Slant',
    blurb: 'The wideouts cut inside, step by step.',
    players: [
      { x: -4, y: 0, route: 'URURURUR' },
      { x: -2, y: 0, route: 'UUUU' },
      { x: 2, y: 0, route: 'UUUU' },
      { x: 4, y: 0, route: 'ULULULUL' },
    ],
  }),
  out: card({
    id: 'out',
    name: 'Out',
    blurb: 'The slots break for the sidelines.',
    players: [
      { x: -4, y: 0, route: 'UUUUUUUU' },
      { x: -1, y: 0, route: 'UUULLL' },
      { x: 1, y: 0, route: 'UUURRR' },
      { x: 4, y: 0, route: 'UUUUUUUU' },
    ],
  }),
  curl: card({
    id: 'curl',
    name: 'Curl',
    blurb: 'Everyone runs four and turns back.',
    players: [
      { x: -4, y: 0, route: 'UUUUD' },
      { x: -2, y: 0, route: 'UUUUD' },
      { x: 2, y: 0, route: 'UUUUD' },
      { x: 4, y: 0, route: 'UUUUD' },
    ],
  }),
  screen: card({
    id: 'screen',
    name: 'Screen',
    blurb: 'A short toss behind a wall of blockers.',
    players: [
      { x: 2, y: -1, route: 'R' },
      { x: 1, y: 0, route: '.' },
      { x: 2, y: 0, route: '.' },
      { x: -4, y: 0, route: 'UUUUUUUU' },
    ],
  }),
  draw: card({
    id: 'draw',
    name: 'Draw',
    blurb: 'Hand it off and run up the middle. No throw.',
    handoff: 0,
    players: [
      { x: 0, y: -1, route: '' },
      { x: -1, y: 0, route: '.' },
      { x: 1, y: 0, route: '.' },
      { x: 4, y: 0, route: 'UUUUUUUU' },
    ],
  }),
  verticals: card({
    id: 'verticals',
    name: 'Four Verticals',
    blurb: 'Everybody goes deep. Somebody gets open.',
    players: [
      { x: -4, y: 0, route: 'UUUUUUUUUU' },
      { x: -2, y: 0, route: 'UUUUUUUUUU' },
      { x: 2, y: 0, route: 'UUUUUUUUUU' },
      { x: 4, y: 0, route: 'UUUUUUUUUU' },
    ],
  }),
  mesh: card({
    id: 'mesh',
    name: 'Mesh',
    blurb: 'Two receivers cross, scraping their covers off.',
    players: [
      { x: -3, y: 0, route: 'UURRRRRR' },
      { x: 3, y: 0, route: 'UUULLLLLL' },
      { x: -4, y: 0, route: 'UUUUUUUU' },
      { x: 4, y: 0, route: 'UUUUUUUU' },
    ],
  }),
  flood: card({
    id: 'flood',
    name: 'Flood',
    blurb: 'Three receivers flood one side at three depths.',
    players: [
      { x: 1, y: 0, route: 'URRR' },
      { x: 2, y: 0, route: 'UUURRR' },
      { x: 3, y: 0, route: 'UUUUUURR' },
      { x: -4, y: 0, route: 'UUUUUUUU' },
    ],
  }),
  quickOut: card({
    id: 'quickOut',
    name: 'Quick Out',
    blurb: 'One step and out to the sideline, both sides.',
    players: [
      { x: -2, y: 0, route: 'ULLL' },
      { x: 2, y: 0, route: 'URRR' },
      { x: -4, y: 0, route: 'UUUUUU' },
      { x: 4, y: 0, route: 'UUUUUU' },
    ],
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
