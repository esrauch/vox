/**
 * The King's two crows (his drive): perched on the ends of his arms before
 * the snap, then flying at the ball, then flapping over whoever they've
 * landed on while you SHOO! them (sim/step.ts, royalCrows). Gone once
 * they're shooed or have struck.
 */
import * as THREE from 'three';
import { BOSS_SPOT } from '../sim/props';
import type { RunState } from '../sim/types';
import { add, v } from '../sim/vec';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import { toWorld } from './world';

/** Where they perch: the ends of the King's arms (he's drawn twice his model's size). */
const ARM_X = 1.3;
const ARM_HEIGHT = 2.7;
/** How high they fly, and how far apart the two are. */
const FLY_HEIGHT = 1.7;
const SPREAD = 0.5;

export class ArcadeRoyalCrows {
  private readonly crows: THREE.Mesh[];

  constructor(scene: THREE.Scene) {
    this.crows = [0, 1].map(() => {
      const crow = new THREE.Mesh(getGeometry('farm/crow'), voxelMaterial);
      crow.castShadow = true;
      crow.visible = false;
      scene.add(crow);
      return crow;
    });
  }

  update(state: RunState, origin: number): void {
    const c = state.field.crows;
    const show = c !== null && c.phase !== 'gone' && state.phase !== 'downOver';
    this.crows.forEach((crow, i) => {
      crow.visible = show;
      if (!c || !show) return;
      const side = i === 0 ? -1 : 1;
      const flap = Math.sin(state.time * (c.phase === 'perched' ? 2 : 14) + i * 1.7);
      if (c.phase === 'perched') {
        crow.position.copy(toWorld(add(BOSS_SPOT, v(side * ARM_X, 0)), origin, ARM_HEIGHT));
        crow.scale.set(1, 1 + 0.03 * flap, 1);
      } else {
        // Flying at the ball, or flapping over whoever they've landed on.
        const height = (c.phase === 'shoo' ? FLY_HEIGHT - 0.2 : FLY_HEIGHT) + 0.12 * flap;
        crow.position.copy(toWorld(add(c.pos, v(side * SPREAD, 0)), origin, height));
        crow.scale.set(1, 1 + 0.25 * flap, 1);
      }
    });
  }
}
