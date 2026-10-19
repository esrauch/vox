/**
 * Seeded randomness for the arcade sim: the shared mulberry32 generator,
 * seeded from the run seed plus labels through a full avalanche mix
 * (murmur3's finalizer), so neighbouring seeds (1, 2, 3… in tests and
 * balance runs) don't give correlated draws.
 */
import { createRng, deriveSeed, type Rng } from '../../sim/rng';

function mix(h: number): number {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/** An independent generator for this run seed and these labels. */
export function rngFor(seed: number, ...parts: (string | number)[]): Rng {
  return createRng(mix(deriveSeed(mix(seed), ...parts)));
}
