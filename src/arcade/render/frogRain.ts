/**
 * Mister Frog's Frog Rain (GAMEPLAY.md, The Run): the lane it falls in,
 * shown on the turf from before the snap (so you can pick a play, or Flip,
 * to keep out of it), and each frog: its shadow growing on the turf, then
 * the frog dropping out of the sky onto it, then shrinking away.
 */
import * as THREE from 'three';
import { common, hexToNumber } from '../../content/palettes';
import { arcadeTuning } from '../content/tuning';
import type { RunState } from '../sim/types';
import { v } from '../sim/vec';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import { toWorld } from './world';

/** How long a frog is seen falling before it lands (seconds), and from how high (yards). */
const FALL_TIME = 0.5;
const FALL_HEIGHT = 8;
/** How long a landed frog takes to shrink away. */
const GONE_TIME = 0.6;

interface Drop {
  readonly frog: THREE.Mesh;
  readonly shadow: THREE.Mesh;
}

export class ArcadeFrogRain {
  private readonly lane: THREE.Mesh;
  private readonly edges: THREE.Mesh[];
  private readonly drops: Drop[] = [];
  private readonly shadowGeo = new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI / 2);
  private readonly shadowMat = new THREE.MeshBasicMaterial({
    color: hexToNumber(common.ink),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  constructor(private readonly scene: THREE.Scene) {
    const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.lane = new THREE.Mesh(
      flat,
      new THREE.MeshBasicMaterial({
        color: hexToNumber(common.candyPurple),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    const edgeMat = new THREE.MeshBasicMaterial({
      color: hexToNumber(common.candyPurple),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.edges = [new THREE.Mesh(flat, edgeMat), new THREE.Mesh(flat, edgeMat)];
    scene.add(this.lane, ...this.edges);
  }

  update(state: RunState, origin: number): void {
    const lane = state.field.frogLane;
    const showLane =
      lane !== null &&
      (state.phase === 'setup' || state.phase === 'play' || state.phase === 'breakit');
    this.lane.visible = showLane;
    for (const e of this.edges) e.visible = showLane;
    if (lane && showLane) {
      const length = lane.to - lane.from;
      const mid = toWorld(v(lane.x, (lane.from + lane.to) / 2), origin, 0.025);
      this.lane.position.copy(mid);
      this.lane.scale.set(lane.half * 2, 1, length);
      this.edges.forEach((e, i) => {
        e.position.copy(mid).setX(lane.x + (i === 0 ? -lane.half : lane.half));
        e.position.y = 0.03;
        e.scale.set(0.12, 1, length);
      });
    }

    const frogs = state.field.frogs;
    while (this.drops.length < frogs.length) this.drops.push(this.makeDrop());
    const warn = arcadeTuning.frogRain.warn;
    this.drops.forEach((d, i) => {
      const f = frogs[i];
      if (!f || f.left > warn || state.phase === 'downOver') {
        d.frog.visible = false;
        d.shadow.visible = false;
        return;
      }
      const ground = toWorld(v(f.x, f.y), origin);
      // The shadow grows and darkens as the frog comes down; gone once it has landed.
      const coming = Math.max(0, f.left) / warn;
      d.shadow.visible = f.left > 0;
      d.shadow.position.copy(ground).setY(0.04);
      d.shadow.scale.setScalar(0.4 + 0.6 * (1 - coming));
      // The frog: falling for the last moment, then sitting there, shrinking away.
      d.frog.visible = f.left < FALL_TIME;
      d.frog.position.copy(ground).setY(Math.max(0, f.left) * (FALL_HEIGHT / FALL_TIME));
      d.frog.scale.setScalar(f.left > 0 ? 1 : Math.max(0, 1 + f.left / GONE_TIME));
    });
  }

  private makeDrop(): Drop {
    const frog = new THREE.Mesh(getGeometry('forest/frog'), voxelMaterial);
    frog.castShadow = true;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    this.scene.add(frog, shadow);
    return { frog, shadow };
  }
}
