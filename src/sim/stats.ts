/**
 * What the Three H's mean in play. Only the 0 values are decided; the 1+
 * meanings here are placeholders to tune later.
 */
import type { Stats } from './types';

/** Hustle → ticks between hops. Everyone (Hustle 0) hops every tick: two half-yards per beat. *(What 1+ buys is TBD.)* */
export function hopInterval(_stats: Stats): number {
  return 1;
}

/** Whether a unit with these stats hops on `tick`. */
export function actsOn(stats: Stats, tick: number): boolean {
  return tick % hopInterval(stats) === 0;
}
