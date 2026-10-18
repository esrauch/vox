import * as THREE from 'three';
import { QB_POS } from '../sim/grid';
import { getGeometry, modelHeight, voxelMaterial } from '../voxel/models';
import { tilt } from '../experiments';
import { tileToWorld } from './view';

/** The QB, throwing arm raised (it holds the ball). */
const QB_MODEL = 'team/qb';
/** The QB with its throwing arm lowered, once the ball has left its hand. */
const QB_THROWN_MODEL = 'team/qbThrown';

const X_AXIS = new THREE.Vector3(1, 0, 0);
/** The QB stands slightly forward on its tile. */
const QB_OFFSET = new THREE.Vector3(0, 0, 0.15);
/** The raised hand relative to the QB's feet (the model's right arm, at the top), leaning back with the tilt. */
const HAND = new THREE.Vector3(0.4, modelHeight(QB_MODEL) + 0.02, 0.05).applyAxisAngle(
  X_AXIS,
  tilt,
);

/** Where the QB holds the ball, in world space: every throw starts here. */
export function qbHand(): THREE.Vector3 {
  return tileToWorld(QB_POS).add(QB_OFFSET).add(HAND);
}

/**
 * The QB. It never moves and faces the camera so its carved face is visible.
 * It holds its throwing arm up while it has the ball, and lowers it the
 * moment the ball leaves its hand.
 */
export class QbView {
  private readonly mesh = new THREE.Mesh(getGeometry(QB_MODEL), voxelMaterial);

  constructor(scene: THREE.Scene) {
    this.mesh.position.copy(tileToWorld(QB_POS)).add(QB_OFFSET);
    this.mesh.castShadow = true;
    this.mesh.rotation.x = tilt;
    scene.add(this.mesh);
  }

  update(holdingBall: boolean): void {
    this.mesh.geometry = getGeometry(holdingBall ? QB_MODEL : QB_THROWN_MODEL);
  }
}
