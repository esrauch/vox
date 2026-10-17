/**
 * What the Three H's mean in play. Only the 0 values are decided (MILESTONES
 * M0); the 1+ meanings here are placeholders to tune in M2.
 */
import type { Stats } from './types';

/** Hustle → beats between hops. Hustle 0 hops every 2 beats. *(1+ is TBD: every beat for now.)* */
export function hopInterval(stats: Stats): number {
  return stats.hustle <= 0 ? 2 : 1;
}

/** Whether a unit with these stats hops (or attacks) on `beat`. */
export function actsOn(stats: Stats, beat: number): boolean {
  return beat % hopInterval(stats) === 0;
}

/** Hits a unit survives before the next one kills it. Heft 0 dies on the first hit. *(1+ TBD.)* */
export function hitsSurvived(stats: Stats): number {
  return Math.max(0, stats.heft);
}
