/**
 * Your team (GAMEPLAY.md, Your Team): the QB plus seven players in three
 * roles, where they line up, their base stats, and the monster forms.
 */
import type { Form, Role, Stats } from '../sim/types';

/** The seven players, in roster order: 2 Blockers, 2 Runners, 3 Catchers. */
export const ROSTER_ROLES: readonly Role[] = [
  'blocker',
  'blocker',
  'runner',
  'runner',
  'catcher',
  'catcher',
  'catcher',
];

/** Where each roster slot lines up, relative to the line of scrimmage (x across, y upfield). */
export const LINEUP: readonly { readonly x: number; readonly y: number }[] = [
  { x: -0.9, y: -0.7 },
  { x: 0.9, y: -0.7 },
  { x: -1.1, y: -4.5 },
  { x: 1.1, y: -4.5 },
  { x: -7, y: -0.7 },
  { x: 7, y: -0.7 },
  { x: 4.2, y: -1.2 },
];

/** The QB lines up this far behind the line of scrimmage. */
export const QB_DEPTH = 4;

/** Every role's base stats: a plain human in that role. */
export const ROLE_STATS: Readonly<Record<Role, Stats>> = {
  qb: { hustle: 0, hands: 0, heft: 0 },
  blocker: { hustle: -1, hands: -1, heft: 2 },
  runner: { hustle: 1, hands: -1, heft: 0 },
  catcher: { hustle: 0, hands: 1, heft: -1 },
};

/** Body size by role (yards). */
export const ROLE_RADIUS: Readonly<Record<Role, number>> = {
  qb: 0.5,
  blocker: 0.6,
  runner: 0.45,
  catcher: 0.45,
};

/** What each form adds to a player's stats. Each monster suits one role (GAMEPLAY.md, Building Up). */
export const FORM_STATS: Readonly<Record<Form, Stats>> = {
  human: { hustle: 0, hands: 0, heft: 0 },
  golem: { hustle: -1, hands: 0, heft: 4 },
  werewolf: { hustle: 3, hands: 0, heft: 1 },
  ghost: { hustle: 2, hands: 2, heft: -1 },
};
