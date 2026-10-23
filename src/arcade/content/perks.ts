/**
 * TRICK OR TREAT! (GAMEPLAY.md, Building Up): what the two cards are worth
 * in each zone, and the names of the players who might join you. The rules for taking a card are in sim/team.ts.
 */
import type { Form, Position } from '../sim/types';

/**
 * Every offer is two cards: a new player, and a stat boost for one of
 * yours. These are by zone (Forest, Swamp, Farm), for the zone of the drive
 * about to be played.
 */
export const ZONE_OFFER: readonly {
  /** A new player's Hustle + Hands + Heft. */
  readonly recruitTotal: number;
  /**
   * The stat boost's total: half on the player's main stat, a quarter on
   * each of the other two (40 is +20 / +10 / +10). Tuned with the balance
   * runs against the new player (2026-10-22).
   */
  readonly boostTotal: number;
}[] = [
  { recruitTotal: 200, boostTotal: 40 },
  { recruitTotal: 250, boostTotal: 60 },
  { recruitTotal: 300, boostTotal: 80 },
];

/** Your starting seven, in slot order (2 Blockers, 2 Runners, 3 Catchers): plain humans. */
export const STARTING_NAMES: readonly string[] = [
  'Gus Grimsby',
  'Big Bert Barrow',
  'Kid Carver',
  'Lefty Graves',
  'Hollis Hollow',
  'Ned Nightly',
  'Moe Mausoleum',
];

/** Recruits' names, by kind. */
export const RECRUIT_NAMES: Readonly<Record<Form, readonly string[]>> = {
  human: ['Dusty Digger', 'Skip Shovel', 'Ike Inkwell', 'Pip Pumpkinpatch'],
  ghost: ['Boo Radish', 'Wispy Wallace', 'Sheet Happens', 'Casper Cartwheel'],
  golem: ['Rocky Rumble', 'Gravel Gus', 'Boulder Bob', 'Pebbles McStone'],
  werewolf: ['Howlin’ Hal', 'Fang Fennimore', 'Lupe Moonrun', 'Shaggy Shanks'],
};

/** Every position, for recruits' preferences. */
export const POSITIONS: readonly Position[] = ['blocker', 'runner', 'catcher'];
