/**
 * The Queen's Hex, seen on the Queen herself: while it's on (it pulses,
 * sim/ball.ts hexedNow), her crown glows purple and lights the field around
 * her, so you can see it coming and going and learn her rhythm.
 */
import * as THREE from 'three';
import { common, hexToNumber } from '../../content/palettes';
import { hexedNow } from '../sim/ball';
import { BOSS_SPOT } from '../sim/props';
import type { RunState } from '../sim/types';
import { toWorld } from './world';

/** Where her crown is: she's drawn twice her model's size. */
const CROWN_HEIGHT = 4.2;

export class ArcadeQueenHex {
  private readonly glow: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private level = 0;

  constructor(scene: THREE.Scene) {
    const purple = hexToNumber(common.candyPurple);
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 12),
      new THREE.MeshBasicMaterial({
        color: purple,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.light = new THREE.PointLight(purple, 0, 12, 1.5);
    scene.add(this.glow, this.light);
  }

  update(state: RunState, origin: number, dt: number): void {
    const queen = state.field.hex && state.phase !== 'downOver';
    // Fades in and out quickly, so the switch reads but doesn't flicker.
    const want = queen && hexedNow(state) ? 1 : 0;
    this.level += (want - this.level) * Math.min(1, dt * 12);
    const at = toWorld(BOSS_SPOT, origin, CROWN_HEIGHT);
    this.glow.visible = queen && this.level > 0.02;
    this.glow.position.copy(at);
    this.glow.scale.setScalar(0.8 + 0.4 * this.level);
    (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.55 * this.level;
    this.light.position.copy(at);
    this.light.intensity = queen ? 6 * this.level : 0;
  }
}
