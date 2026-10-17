import type * as THREE from 'three';

/** How high a throw arcs above the straight line from the QB's hand to its target. */
const ARC_HEIGHT = 3.2;

/** The point `t` (0..1) of the way along a throw's arc, written into `out`. Shared by the ball and the aim preview. */
export function arcPoint(
  out: THREE.Vector3,
  from: THREE.Vector3,
  to: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  out.lerpVectors(from, to, t);
  out.y += Math.sin(t * Math.PI) * ARC_HEIGHT;
  return out;
}
