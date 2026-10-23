/**
 * The Witches on their Brooms (GAMEPLAY.md, The Defense: hazards): each
 * flies across her row above the turf, facing the way she's going, wrapping
 * round from one sideline to the other, with her shadow on the turf below.
 * A pass that comes near her is knocked down (sim/ball.ts).
 */
import * as THREE from 'three';
import { common, hexToNumber } from '../../content/palettes';
import { witchX } from '../sim/ball';
import type { RunState } from '../sim/types';
import { v } from '../sim/vec';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import { toWorld } from './world';

/** How high she flies (yards), and how much she bobs. */
const HEIGHT = 1.6;
const BOB = 0.12;

interface View {
  readonly witch: THREE.Mesh;
  readonly shadow: THREE.Mesh;
}

export class ArcadeWitches {
  private readonly views = new Map<number, View>();
  private readonly shadowGeo = new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2);
  private readonly shadowMat = new THREE.MeshBasicMaterial({
    color: hexToNumber(common.ink),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });

  constructor(private readonly scene: THREE.Scene) {}

  update(state: RunState, origin: number): void {
    const witches = state.field.witches;
    const ids = new Set(witches.map((w) => w.id));
    for (const [id, view] of this.views) {
      if (ids.has(id)) continue;
      this.scene.remove(view.witch, view.shadow);
      this.views.delete(id);
    }
    for (const w of witches) {
      let view = this.views.get(w.id);
      if (!view) {
        const witch = new THREE.Mesh(getGeometry('forest/witch'), voxelMaterial);
        witch.castShadow = true;
        const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
        this.scene.add(witch, shadow);
        view = { witch, shadow };
        this.views.set(w.id, view);
      }
      const ground = toWorld(v(witchX(w, state.time), w.y), origin);
      const bob = BOB * Math.sin(state.time * 3 + w.id);
      view.witch.position.copy(ground).setY(HEIGHT + bob);
      // The model faces +x: turned round when she flies the other way.
      view.witch.rotation.y = w.dir === 1 ? 0 : Math.PI;
      view.shadow.position.copy(ground).setY(0.04);
    }
  }
}
