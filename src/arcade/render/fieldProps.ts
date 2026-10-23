/**
 * The props on the field (sim/props.ts): trees, stumps and toadstools in the
 * Forest, gumdrops, lollipops and candy canes in the Candy Kingdom, each
 * where the sim has it, at its own size. Rebuilt whenever a new drive lays
 * its props (they're in the drive's own coordinates).
 */
import * as THREE from 'three';
import type { RunState } from '../sim/types';
import { v } from '../sim/vec';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import { toWorld } from './world';

export class ArcadeFieldProps {
  private readonly group = new THREE.Group();
  private key = '';

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(state: RunState, origin: number): void {
    const props = state.field.props;
    const key = `${origin}:${props.map((p) => p.id).join(',')}`;
    if (key === this.key) return;
    this.key = key;
    this.group.clear();
    for (const p of props) {
      const mesh = new THREE.Mesh(getGeometry(p.model), voxelMaterial);
      mesh.position.copy(toWorld(v(p.x, p.y), origin));
      mesh.scale.setScalar(p.scale);
      // A few quarter turns, so a row of the same prop doesn't look stamped (by its id, so it never changes).
      mesh.rotation.y = (p.id % 4) * (Math.PI / 2) * (p.model.endsWith('lollipop') ? 0 : 1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}
