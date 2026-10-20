/**
 * The aim while you pull back: a reticle where the ball will come down and a
 * dashed arc from the QB's hand along the real flight (sim/ball.ts). Gold
 * where it'll be low enough to touch, white where it's over everyone's head;
 * red all over when the throw isn't allowed.
 */
import * as THREE from 'three';
import { common, hexToNumber, team } from '../../content/palettes';
import { arcadeTuning } from '../content/tuning';
import { ballHeight } from '../sim/ball';
import type { Vec } from '../sim/types';
import { dist, lerp } from '../sim/vec';
import { toWorld } from './world';

const DASHES = 26;

export class ArcadeAim {
  private readonly group = new THREE.Group();
  private readonly reticle: THREE.Mesh;
  private readonly dashes: THREE.Mesh[] = [];
  private readonly low = new THREE.MeshBasicMaterial({ color: hexToNumber(team.accent) });
  private readonly high = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  private readonly bad = new THREE.MeshBasicMaterial({ color: hexToNumber(common.danger) });

  constructor(scene: THREE.Scene) {
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.6, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: hexToNumber(team.accent) }),
    );
    this.group.add(this.reticle);
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < DASHES; i++) {
      const d = new THREE.Mesh(geo, this.low);
      this.dashes.push(d);
      this.group.add(d);
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Show the aim from `from` to `target` (field yards), or hide it with null. */
  set(aim: { from: Vec; target: Vec; valid: boolean } | null, origin: number, time: number): void {
    this.group.visible = aim !== null;
    if (!aim) return;
    this.reticle.position.copy(toWorld(aim.target, origin, 0.03));
    (this.reticle.material as THREE.MeshBasicMaterial).color.set(
      aim.valid ? hexToNumber(team.accent) : hexToNumber(common.danger),
    );
    const d = dist(aim.from, aim.target);
    const march = (time * 0.15) % (1 / DASHES);
    this.dashes.forEach((dash, i) => {
      const u = i / DASHES + march;
      dash.visible = u <= 1;
      const h = ballHeight(d, Math.min(1, u));
      dash.position.copy(toWorld(lerp(aim.from, aim.target, Math.min(1, u)), origin, h));
      const low = h < arcadeTuning.throw.reachHeight;
      dash.material = !aim.valid ? this.bad : low ? this.low : this.high;
      dash.scale.setScalar(low ? 1.6 : 1);
    });
  }
}
