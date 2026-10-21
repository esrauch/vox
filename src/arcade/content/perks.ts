/**
 * TRICK OR TREAT! (GAMEPLAY.md, Building Up): the perks, how rare each is,
 * and the names of the players who might join you. The rules for taking a
 * perk are in sim/team.ts.
 */
import type { Form, Position, Rarity } from '../sim/types';

/** How often each rarity turns up in an offer (shares of 1). */
export const RARITY_WEIGHT: Readonly<Record<Rarity, number>> = {
  common: 0.6,
  rare: 0.32,
  epic: 0.08,
};

/** The perks that aren't recruits, by rarity. A perk you already have (a one-off) isn't offered again. */
export const PERK_RARITY = {
  allStat: 'common',
  extraSweep: 'common',
  kindStat: 'rare',
  slowSweep: 'rare',
  secondWind: 'rare',
  magnet: 'rare',
  hotArm: 'rare',
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

/** A recruit's rarity: a plain human is common, a monster rare, and a star (extra stats) epic. */
export const RECRUIT_STAR_BONUS = 15;

/** Every position, for recruits' preferences. */
export const POSITIONS: readonly Position[] = ['blocker', 'runner', 'catcher'];
