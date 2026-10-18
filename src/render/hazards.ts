import * as THREE from 'three';
import { common, hexToNumber } from '../content/palettes';
import { HAZARDS } from '../content/hazards';
import { COLS } from '../sim/grid';
import { witchTravel } from '../sim/hazards';
import type { Hazard, ScreenState } from '../sim/types';
import { getGeometry, voxelMaterial } from '../voxel/models';
import { tilt } from './experiments';
import { tileToWorld } from './view';

/** How high the Witch flies above her row. */
const FLY_HEIGHT = 1.5;
/** She's drawn this far past the field's edge (tiles) before she disappears. */
const OFF_FIELD = 1.5;

interface Copy {
  readonly root: THREE.Group;
  readonly shadow: THREE.Mesh;
}

interface HazardView {
  readonly hazard: Hazard;
  /**
   * Two copies: the Witch on her row, and the one flying in from off the
   * field while she flies out the far side. In the sim she simply wraps.
   */
  readonly copies: readonly [Copy, Copy];
}

/**
 * The hazards on the field. The Witch glides smoothly along her row (her sim
 * column is where she is on each beat), faces the way she's flying (the one
 * model that turns), leans back like every character, and casts a dark
 * shadow on her row: the telegraph for where the air lane is.
 */
export class HazardViews {
  private views: HazardView[] = [];
  private readonly shadowGeo = new THREE.CircleGeometry(0.42, 20);
  private readonly shadowMat = new THREE.MeshBasicMaterial({
    color: hexToNumber(common.ink),
    transparent: true,
    opacity: 0.35,
  });

  constructor(private readonly scene: THREE.Scene) {}

  /** Rebuild every view (a new or restarted screen). */
  reset(screen: ScreenState): void {
    for (const v of this.views) for (const c of v.copies) this.scene.remove(c.root, c.shadow);
    this.views = screen.hazards.map((hazard) => ({
      hazard,
      copies: [this.createCopy(hazard), this.createCopy(hazard)],
    }));
  }

  /** `beatPos` is the current sim beat plus its phase; `time` (s) drives a little bob. */
  update(beatPos: number, time: number): void {
    for (const { hazard, copies } of this.views) {
      const travel = witchTravel(hazard, beatPos);
      const x = ((travel % COLS) + COLS) % COLS;
      // The second copy trails one field-width behind: it's the one coming in.
      const xs = [x, x - hazard.dir * COLS];
      copies.forEach((copy, i) => {
        const cx = xs[i] ?? x;
        const visible = cx > -OFF_FIELD && cx < COLS - 1 + OFF_FIELD;
        copy.root.visible = visible;
        copy.shadow.visible = visible;
        if (!visible) return;
        const ground = tileToWorld({ x: cx, y: hazard.row });
        copy.root.position.set(ground.x, FLY_HEIGHT + Math.sin(time * 3 + i) * 0.06, ground.z);
        copy.shadow.position.set(ground.x, 0.02, ground.z);
      });
    }
  }

  private createCopy(hazard: Hazard): Copy {
    // Lean back like every character (around the world x axis), then face the way she flies.
    const root = new THREE.Group();
    const lean = new THREE.Group();
    lean.rotation.x = tilt;
    const mesh = new THREE.Mesh(getGeometry(HAZARDS[hazard.kind].model), voxelMaterial);
    mesh.castShadow = true;
    // The model faces +x (right); flying left, she turns around.
    mesh.rotation.y = hazard.dir === 1 ? 0 : Math.PI;
    lean.add(mesh);
    root.add(lean);
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1.3, 0.8, 1);
    this.scene.add(root, shadow);
    return { root, shadow };
  }
}
