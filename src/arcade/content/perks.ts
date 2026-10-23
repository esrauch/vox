/**
 * TRICK OR TREAT! (GAMEPLAY.md, Building Up): the perks, how rare each is,
 * and the names of the players who might join you. The rules for taking a
 * perk are in sim/team.ts.
 */
import type { Form, Position, Rarity } from '../sim/types';

/**
 * Every offer is three cards: a new player, a stat boost for one of yours,
 * and one perk from the pool at the zone's rarity. These are by zone
 * (Forest, Swamp, Farm), for the zone of the drive about to be played.
 */
export const ZONE_OFFER: readonly {
  /** A new player's Hustle + Hands + Heft. */
  readonly recruitTotal: number;
  /**
   * What the stat boost adds to one player's main stat. Tuned (balance runs, 2026-10-22) so
   * always taking it does about as well as always taking the new player.
   */
  readonly statBoost: number;
  /** The rarity of the third card (a lower one if none of that rarity is left). */
  readonly rarity: Rarity;
}[] = [
  { recruitTotal: 200, statBoost: 40, rarity: 'common' },
  { recruitTotal: 250, statBoost: 60, rarity: 'rare' },
  { recruitTotal: 300, statBoost: 80, rarity: 'epic' },
];

/**
 * The pool for the third card, by rarity. A perk you already have (a
 * one-off) isn't offered again. Hot Arm isn't here: it's Mister Frog's
 * Boss perk.
 */
export const PERK_RARITY = {
  allStat: 'common',
  extraSweep: 'common',
  kindStat: 'rare',
  slowSweep: 'rare',
  secondWind: 'rare',
  magnet: 'rare',
} as const satisfies Record<string, Rarity>;

/** How much the stat perks add (stats are on a 50-is-ordinary scale; 10 is a step). */
export const ALL_STAT_BONUS = 10;
export const KIND_STAT_BONUS = 20;
/** Monster Mash: this much to every stat for each player whose kind is unique on the team. */
export const MONSTER_MASH_BONUS = 10;

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
