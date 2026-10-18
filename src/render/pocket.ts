import * as THREE from 'three';
import { common, hexToNumber } from '../content/palettes';
import { MID_COL } from '../sim/grid';
import type { RunState } from '../sim/types';
import { getGeometry, voxelMaterial } from '../voxel/models';
import { tilt } from './experiments';
import { tileToWorld } from './view';

/** Your offensive line: three plain players across the middle, in front of the QB. */
const LINEMEN = 3;
const LINEMAN_MODEL = 'team/walkOn';
/** The most countdown pips shown (one per beat left). */
const MAX_PIPS = 8;

/**
 * The pocket (GAMEPLAY.md, A Down), Retro Bowl-style: your line in front of
 * the QB, with the pass rush pressed against it. As the pocket clock runs
 * down, the rush pushes the line back toward the QB, and pips over the line
 * count the beats left before the sack (white, then red for the last one). The linemen
 * are scenery: the pocket clock (sim/step.ts) decides the sack.
 */
export class PocketView {
  private readonly linemen: THREE.Group[] = [];
  private readonly pips: THREE.Mesh[] = [];
  private readonly pipMat = new THREE.MeshBasicMaterial({ color: hexToNumber(common.white) });
  private readonly urgentMat = new THREE.MeshBasicMaterial({ color: hexToNumber(common.danger) });
  /** Where the line got to, so it stays put after the throw. */
  private lineRow = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < LINEMEN; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(getGeometry(LINEMAN_MODEL), voxelMaterial);
      body.rotation.x = tilt;
      body.castShadow = true;
      root.add(body);
      this.linemen.push(root);
      scene.add(root);
    }
    const pipGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    for (let i = 0; i < MAX_PIPS; i++) {
      const pip = new THREE.Mesh(pipGeo, this.pipMat);
      this.pips.push(pip);
      scene.add(pip);
    }
  }

  /** `tickPos` is the current tick plus its fraction, for a smooth push. */
  update(state: RunState, tickPos: number): void {
    const { pocket, screen, drive, phase } = state;
    const los = drive.los;
    const qbRow = screen.qb.y;
    if (pocket && phase === 'play') {
      // How far the rush has pushed: 0 at the snap, 1 when the pocket collapses on the QB.
      const frac = tickPos - Math.floor(tickPos);
      const left = Math.max(0, pocket.left - frac);
      const progress = 1 - left / pocket.total;
      this.lineRow = los - (los - qbRow - 0.6) * progress;
    } else if (phase === 'setup' || phase === 'draft') {
      this.lineRow = los;
    }
    this.linemen.forEach((root, i) => {
      const at = tileToWorld({ x: MID_COL - 1 + i, y: this.lineRow });
      root.position.set(at.x, 0, at.z);
    });

    // One pip per beat left, in a row over the line; red for the last beat.
    const ticksLeft = pocket && phase === 'play' && screen.ball.at === 'qb' ? pocket.left : 0;
    const beatsLeft = Math.min(MAX_PIPS, Math.ceil(ticksLeft / 2));
    this.pips.forEach((pip, i) => {
      pip.visible = i < beatsLeft;
      if (!pip.visible) return;
      const at = tileToWorld(
        { x: MID_COL + (i - (beatsLeft - 1) / 2) * 0.42, y: this.lineRow },
        2.5,
      );
      pip.position.copy(at);
      pip.material = beatsLeft <= 1 ? this.urgentMat : this.pipMat;
    });
  }
}
