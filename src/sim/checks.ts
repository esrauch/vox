/**
 * Checks (GAMEPLAY.md, Checks): every contest between one of your players and
 * a defender is your stat minus theirs, plus modifiers, looked up on one
 * curve that favors you. The roll comes from the run's seed, the tick and who
 * is involved, so the same run always plays out the same way.
 *
 * - **Shake** (Hustle): getting away from a mark at a route's cut, or from a tackler.
 * - **Catch** (Hands): a contested catch.
 * - **Break** (Heft): breaking a tackle, when the shake fails.
 *
 * Skills bend the dice: a reroll rolls a failure again; Frenzy gives the next
 * check of the kind an edge after a success. The safety net adds edge for
 * every failure in a row.
 */
import { tuning } from '../content/tuning';
import { createRng, deriveSeed } from './rng';
import type { CheckKind, Defender, PlayerUnit, RunState, Stats } from './types';

export const CHECK_STAT: Readonly<Record<CheckKind, keyof Stats>> = {
  shake: 'hustle',
  catch: 'hands',
  break: 'heft',
};

/** The chance a check succeeds with this edge. */
export function chance(edge: number): number {
  const curve = tuning.checks.curve;
  const i = Math.max(0, Math.min(curve.length - 1, Math.round(edge) + 4));
  return curve[i] ?? 1;
}

/**
 * Your player's edge on a check against a defender, before any skill:
 * stats, `modifier` (the throw's quality, extra defenders), the safety net
 * and a waiting Frenzy.
 */
export function checkEdge(
  state: RunState,
  kind: CheckKind,
  player: PlayerUnit,
  defender: Defender,
  modifier = 0,
): number {
  const stat = CHECK_STAT[kind];
  const streak = state.roster[player.slot]?.streak[kind] ?? 0;
  const frenzy = player.frenzyReady.includes(kind) ? tuning.checks.frenzy : 0;
  return (
    player.stats[stat] - defender.stats[stat] + modifier + streak * tuning.checks.safetyNet + frenzy
  );
}

/** Roll a check (modifying the state: the safety net's streak, Frenzy). Returns whether it succeeded. */
export function check(
  state: RunState,
  kind: CheckKind,
  player: PlayerUnit,
  defender: Defender,
  modifier = 0,
): boolean {
  const p = chance(checkEdge(state, kind, player, defender, modifier));
  const roll = (attempt: number): number =>
    createRng(
      deriveSeed(state.seed, 'check', state.tick, kind, player.id, defender.id, attempt),
    ).next();
  let ok = roll(0) < p;
  if (!ok && player.rerolls.includes(kind)) ok = roll(1) < p;

  player.frenzyReady = player.frenzyReady.filter((k) => k !== kind);
  if (ok && player.frenzy.includes(kind)) player.frenzyReady.push(kind);
  const rostered = state.roster[player.slot];
  if (rostered) rostered.streak[kind] = ok ? 0 : rostered.streak[kind] + 1;
  return ok;
}
