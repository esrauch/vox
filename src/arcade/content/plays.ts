/**
 * The four plays (GAMEPLAY.md, A Down). Each down one is picked at random,
 * and randomly mirrored. A route is waypoints relative to the player's start
 * (yards: x across, y upfield); `block` stays home and blocks (only the
 * Blockers do). Every Runner gets out past the line of scrimmage; every route
 * finishes going upfield, except a curl's angled comeback (the curl is where
 * it stops); and none goes deeper than a throw can reach
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
    // one Runner checks down up the middle, the other leaks out to the flat and
    // turns upfield along the sideline.
    slots: [
      block,
      block,
      route([-1.5, 3], [-1.5, 9]),
      route([2.8, 1], [6.3, 2], [6.3, 12]),
      route([0, 3], [4.2, 9], [4.2, 16]),
      route([0, 3], [-4.2, 9], [-4.2, 16]),
      route([0, 18]),
    ],
  },
  {
    id: 'deepShot',
    name: 'Deep Shot',
    // All three Catchers go long; the Runners slip out past the line as check-downs.
    slots: [
      block,
      block,
      route([-2.5, 3], [-2.5, 8]),
      route([2.5, 3], [2.5, 8]),
      route([0, 24]),
      route([0, 24]),
      route([-1.4, 20]),
    ],
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
    // Built for a handoff: a Runner charges up the middle with the other leading
    // through the hole ahead of it; the Catchers run off.
    slots: [
      block,
      block,
      route([0, 3], [0, 12]),
      route([-0.6, 3], [-0.6, 12]),
      route([0, 16]),
      route([0, 16]),
      route([0, 14]),
    ],
  },
];
