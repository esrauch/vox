/**
 * The four plays (GAMEPLAY.md, A Down). Each down one is picked at random,
 * and randomly mirrored. A route is waypoints relative to the player's start
 * (yards: x across, y upfield); `block` stays home and blocks; a handoff play
 * gives one roster slot the ball at the snap.
 */
export type Assignment =
  | { readonly kind: 'route'; readonly to: readonly { readonly x: number; readonly y: number }[] }
  | { readonly kind: 'block' };

export interface Play {
  readonly id: string;
  readonly name: string;
  /** One assignment per roster slot (2 Blockers, 2 Runners, 3 Catchers). Blockers always block. */
  readonly slots: readonly Assignment[];
  /** A handoff to this roster slot: no throw. */
  readonly handoff?: number;
}

const block: Assignment = { kind: 'block' };
const route = (...to: [number, number][]): Assignment => ({
  kind: 'route',
  to: to.map(([x, y]) => ({ x, y })),
});

export const PLAYS: readonly Play[] = [
  {
    id: 'slants',
    name: 'Slants',
    // The outside Catchers cut inside; the slot goes deep; a Runner leaks into the flat.
    slots: [
      block,
      block,
      block,
      route([4, 1], [9, 2]),
      route([0, 3], [6, 9]),
      route([0, 3], [-6, 9]),
      route([0, 18]),
    ],
  },
  {
    id: 'deepShot',
    name: 'Deep Shot',
    // All three Catchers go long; both Runners stay home to block.
    slots: [block, block, block, block, route([0, 24]), route([0, 24]), route([-2, 20])],
  },
  {
    id: 'curlFlat',
    name: 'Curl & Flat',
    // The Catchers run out and turn back; the Runners swing out to the flats.
    slots: [
      block,
      block,
      route([-5, 1], [-9, 2]),
      route([5, 1], [9, 2]),
      route([0, 7], [0.5, 5.5]),
      route([0, 7], [-0.5, 5.5]),
      route([0, 6], [-0.5, 4.5]),
    ],
  },
  {
    id: 'dive',
    name: 'Dive',
    // A handoff straight up the middle; the other Runner leads; the Catchers run off.
    handoff: 2,
    slots: [block, block, route([0, 2]), block, route([0, 16]), route([0, 16]), route([0, 14])],
  },
];
