/**
 * The four plays (GAMEPLAY.md, A Down). Each down one is picked at random,
 * and randomly mirrored. A route is waypoints relative to the player's start
 * (yards: x across, y upfield); `block` stays home and blocks. Every route
 * finishes going upfield (a curl's angled comeback is the one exception: the
 * curl is where it stops), and none goes deeper than a throw can reach
 * (tests/arcade/plays.test.ts). On any play
 * you can tap a Runner to hand it the ball instead of throwing (sim/run.ts);
 * the Dive is the play built for it.
 */
export type Assignment =
  | { readonly kind: 'route'; readonly to: readonly { readonly x: number; readonly y: number }[] }
  | { readonly kind: 'block' };

export interface Play {
  readonly id: string;
  readonly name: string;
  /** One assignment per roster slot (2 Blockers, 2 Runners, 3 Catchers). Blockers always block. */
  readonly slots: readonly Assignment[];
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
    // The outside Catchers cut inside, then straight upfield; the slot goes deep;
    // a Runner leaks out to the flat, then turns upfield along the sideline.
    slots: [
      block,
      block,
      block,
      route([2.8, 1], [6.3, 2], [6.3, 12]),
      route([0, 3], [4.2, 9], [4.2, 16]),
      route([0, 3], [-4.2, 9], [-4.2, 16]),
      route([0, 18]),
    ],
  },
  {
    id: 'deepShot',
    name: 'Deep Shot',
    // All three Catchers go long; both Runners stay home to block.
    slots: [block, block, block, block, route([0, 24]), route([0, 24]), route([-1.4, 20])],
  },
  {
    id: 'curlFlat',
    name: 'Curl & Flat',
    // The Catchers run out and curl back at an angle, toward the middle (the
    // curl is where they stop); the Runners swing out to the flats, then turn upfield.
    slots: [
      block,
      block,
      route([-3.5, 1], [-6.3, 2], [-6.3, 12]),
      route([3.5, 1], [6.3, 2], [6.3, 12]),
      route([0, 7], [1.5, 5.5]),
      route([0, 7], [-1.5, 5.5]),
      route([0, 6], [-1.5, 4.5]),
    ],
  },
  {
    id: 'dive',
    name: 'Dive',
    // Built for a handoff: a Runner charges up the middle, the other stays home; the Catchers run off.
    slots: [
      block,
      block,
      route([0, 3], [0, 12]),
      block,
      route([0, 16]),
      route([0, 16]),
      route([0, 14]),
    ],
  },
];
