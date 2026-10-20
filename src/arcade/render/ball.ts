/**
 * The ball: in the QB's hand, flying flat as a bullet (sim/ball.ts), held
 * over the carrier's head, or lying where the down ended.
 */
import * as THREE from 'three';
import { getGeometry, voxelMaterial } from '../../voxel/models';
import type { RunState } from '../sim/types';
import { lerp } from '../sim/vec';
import type { ArcadeBodies } from './bodies';
import { toWorld } from './world';

export class ArcadeBall {
  private readonly ball = new THREE.Mesh(getGeometry('team/ball'), voxelMaterial);
  private readonly landing: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.ball.castShadow = true;
    this.landing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.65, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
    );
    this.landing.visible = false;
    scene.add(this.ball, this.landing);
  }

  update(state: RunState, origin: number, bodies: ArcadeBodies): void {
    const ball = state.field.ball;
    this.landing.visible = false;
    this.ball.rotation.y = state.time * 6;
    switch (ball.at) {
      case 'qb': {
        const qb = state.field.players.find((p) => p.role === 'qb');
        if (qb)
          this.ball.position.copy(toWorld(qb.pos, origin, 1.0)).add(new THREE.Vector3(0.3, 0, 0));
        break;
      }
      case 'flight': {
        const u = Math.min(1, (state.time - ball.thrownAt) / (ball.landsAt - ball.thrownAt));
        // A bullet: flat and fast, at chest height.
        this.ball.position.copy(toWorld(lerp(ball.from, ball.target, u), origin, 1));
        this.ball.rotation.x = state.time * 30;
        break;
      }
      case 'carried': {
        const head = bodies.headOf(ball.by);
        if (head) this.ball.position.copy(head);
        break;
      }
      case 'dead':
        this.ball.position.copy(toWorld(ball.pos, origin, 0.12));
        break;
    }
  }
}
