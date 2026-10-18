import * as THREE from 'three';
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { defenseFor, lineUpDefense } from '../sim/drive';
import type { RunState } from '../sim/types';
import { tilt } from './experiments';
import { tileToWorld } from './view';
import { getGeometry, voxelMaterial } from '../voxel/models';

/** How see-through the next defense stands while it waits. */
export const WAITING_OPACITY = 0.4;

/**
 * The next drive's defense, already standing up the field past the
 * first-down line, where it will line up for the next drive's first down
 * (GAMEPLAY.md, One Long Field). The field is one long field: the next drive
 * starts on this drive's first-down line, so its defense is there all along.
 * It's scenery, faded like ghosts waiting in the mist so it never reads as
 * part of this down; when the drive is won the camera glides up to it and the
 * real defense takes its place, on the same tiles.
 *
 * Not on the Boss drive: after it, there's no next drive.
 */
export class NextDefenseView {
  private readonly group = new THREE.Group();
  private readonly material = voxelMaterial.clone();
  /** Which drive it's showing the defense for ("seed/area/index"), so it's only rebuilt when that changes. */
  private shown: string | null = null;

  constructor(scene: THREE.Scene) {
    this.material.transparent = true;
    this.material.opacity = WAITING_OPACITY;
    this.material.depthWrite = false;
    scene.add(this.group);
  }

  update(state: RunState): void {
    const { drive, phase } = state;
    const waiting =
      drive.kind !== 'boss' && (phase === 'setup' || phase === 'play' || phase === 'downOver');
    this.group.visible = waiting;
    if (!waiting) return;
    const key = `${state.seed}/${drive.area}/${drive.index}`;
    if (key === this.shown) return;
    this.shown = key;
    this.group.clear();

    // Lined up the way the next drive's first down will be, then moved up the
    // field so its line of scrimmage sits on this drive's first-down line.
    const start = tuning.drive.startRow;
    const spec = defenseFor(state.seed, drive.area, drive.index + 1);
    const ahead = drive.firstDown - start;
    for (const d of lineUpDefense(spec, start, start + tuning.drive.distance, 0)) {
      const body = new THREE.Mesh(getGeometry(DEFENDERS[d.kind].model), this.material);
      body.position.copy(tileToWorld({ x: d.pos.x, y: d.pos.y + ahead }));
      body.rotation.x = tilt;
      this.group.add(body);
    }
  }
}
