/**
 * Field yards → world units for the arcade game. One world unit is a yard;
 * x is across, and the field runs into the screen (−z). Each drive's sim
 * coordinates start at 0, so `origin` (the yards marched in earlier drives)
 * keeps the field one long, continuous strip.
 */
import * as THREE from 'three';
import type { Vec } from '../sim/types';

export function toWorld(p: Vec, origin: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(p.x, height, -(origin + p.y));
}

/** How far the long field runs, in yards from the run's start: behind the first line, and ahead. */
export const FIELD_BEHIND = 30;
export const FIELD_AHEAD = 150;
