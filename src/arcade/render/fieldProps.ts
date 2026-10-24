/**
 * The props on the field (sim/props.ts): trees, stumps and toadstools in the
 * Forest, gumdrops, lollipops and candy canes in the Candy Kingdom, each
 * where the sim has it, drawn twice its kind's size (the sim's circle stays as it is).
 * On the run's last drive, the King stands guard and the pumpkin patch fills
 * the field behind him. Rebuilt whenever a new drive lays
 * its props (they're in the drive's own coordinates).
 */
import * as THREE from 'three';
import { KING } from '../sim/props';
import type { RunState } from '../sim/types';
import { v } from '../sim/vec';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import { toWorld } from './world';

/** Props are drawn this many times their kind's size; what you bump into (the sim's circle) stays the same. */
const DRAW_SCALE = 2;

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
      mesh.scale.setScalar(p.scale * DRAW_SCALE);
      // A few quarter turns, so a row of the same prop doesn't look stamped (by its id, so it never changes).
      mesh.rotation.y = p.facing ? 0 : (p.id % 4) * (Math.PI / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    // The run's last drive: Jack's pumpkin patch fills the field behind the King (just scenery).
    const king = props.find((p) => p.model === KING.model);
    if (king) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 11; col++) {
          const jitter = ((row * 7 + col * 13) % 5) / 10 - 0.2;
          const x = -8 + col * 1.6 + jitter;
          const y = king.y + 2.5 + row * 1.6 - jitter;
          const lantern = (row + col) % 5 === 0;
          const mesh = new THREE.Mesh(
            getGeometry(lantern ? 'forestProps/lantern' : 'forestProps/pumpkin'),
            voxelMaterial,
          );
          mesh.position.copy(toWorld(v(x, y), origin));
          mesh.scale.setScalar(1.3);
          mesh.rotation.y = ((row + col) % 4) * (Math.PI / 2);
          mesh.castShadow = true;
          this.group.add(mesh);
        }
      }
    }
  }
}
