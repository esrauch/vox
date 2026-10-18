import type * as THREE from 'three';
import { arcPeak } from '../sim/flight';

/**
 * The point `t` (0..1) of the way along a throw's arc, written into `out`:
 * the same sliding arc the sim uses (sim/flight.ts), higher the longer the
 * pass. `distance` is in tiles. Shared by the ball and the aim preview.
 */
export function arcPoint(
  out: THREE.Vector3,
  from: THREE.Vector3,
  to: THREE.Vector3,
  t: number,
  distance: number,
): THREE.Vector3 {
  out.lerpVectors(from, to, t);
  out.y += 4 * arcPeak(distance) * t * (1 - t);
  return out;
}
