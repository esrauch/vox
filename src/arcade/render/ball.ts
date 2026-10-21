/**
 * The ball: a jack-o'-lantern, in the QB's hand, flying flat as a bullet
 * (sim/ball.ts), held over the carrier's head, or lying where the down
 * ended. It's the field's light: a warm lamp inside it lights everyone
 * around it and casts the shadows, so they swing as the ball flies. The
 * pumpkin itself is unlit, so it glows rather than going dark around the
 * lamp inside it.
 */
import * as THREE from 'three';
import { getGeometry } from '../../voxel/models';
import type { RunState } from '../sim/types';
import { lerp } from '../sim/vec';
import type { ArcadeBodies } from './bodies';
import { toWorld } from './world';

/** The lamp inside the pumpkin. */
const LIGHT_COLOR = 0xffa64d;
const LIGHT_INTENSITY = 60;
/** How far its light reaches (yards), and how it falls off. */
const LIGHT_RANGE = 22;
const LIGHT_DECAY = 1.6;
/** The lamp sits this far above the ball, so the ball never shadows its own light. */
const LIGHT_LIFT = 0.6;

export class ArcadeBall {
  private readonly ball = new THREE.Mesh(
    getGeometry('team/ball'),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
  );
  private readonly light = new THREE.PointLight(
    LIGHT_COLOR,
    LIGHT_INTENSITY,
    LIGHT_RANGE,
    LIGHT_DECAY,
  );
  private readonly landing: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    // It glows and lights the field; it doesn't block its own lamp.
    this.ball.castShadow = false;
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(512, 512);
    this.light.shadow.bias = -0.002;
    Object.assign(this.light.shadow.camera, { near: 0.2, far: LIGHT_RANGE });
    scene.add(this.light);
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
    this.light.position.copy(this.ball.position).add(new THREE.Vector3(0, LIGHT_LIFT, 0));
    // A little flicker, like a candle.
    this.light.intensity =
      LIGHT_INTENSITY * (0.92 + 0.08 * Math.sin(state.time * 23) * Math.sin(state.time * 7));
  }
}
