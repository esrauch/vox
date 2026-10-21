/**
 * The ball: a jack-o'-lantern. Before the throw it floats where the QB
 * stands, bobbing (there's no QB to draw: it throws itself); then it flies
 * flat as a bullet (sim/ball.ts), rides over the carrier's head (or floats
 * upfield on its own when the QB runs it), or lies where the down ended.
 * Embers drift off it all the time, trail behind it in flight, and burst
 * out when it's thrown, caught or knocked down. It's the field's light: a warm lamp inside it lights everyone
 * around it and casts the shadows, so they swing as the ball flies. The
 * pumpkin itself is unlit, so it glows rather than going dark around the
 * lamp inside it.
 */
import * as THREE from 'three';
import { getGeometry } from '../../voxel/models';
import type { RunState } from '../sim/types';
import { lerp } from '../sim/vec';
import type { ArcadeBodies } from './bodies';
import { Embers } from './embers';
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
  private readonly embers: Embers;

  constructor(scene: THREE.Scene) {
    // It glows and lights the field; it doesn't block its own lamp.
    this.ball.castShadow = false;
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(512, 512);
    this.light.shadow.bias = -0.002;
    Object.assign(this.light.shadow.camera, { near: 0.2, far: LIGHT_RANGE });
    scene.add(this.light);
    this.embers = new Embers(scene);
    this.landing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.65, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
    );
    this.landing.visible = false;
    scene.add(this.ball, this.landing);
  }

  /** A burst of embers from the ball (a throw, a catch, a knock-down). */
  burst(count: number, speed?: number): void {
    this.embers.burst(this.ball.position.clone().add(new THREE.Vector3(0, 0.5, 0)), count, speed);
  }

  update(state: RunState, origin: number, bodies: ArcadeBodies, dt: number): void {
    const ball = state.field.ball;
    this.landing.visible = false;
    // It never spins: the carved face always looks back at the camera (models face +z, toward it).
    this.ball.rotation.set(0, 0, 0);
    switch (ball.at) {
      case 'qb': {
        // Floating where the QB would stand, bobbing, waiting to throw itself.
        const qb = state.field.players.find((p) => p.role === 'qb');
        if (qb)
          this.ball.position.copy(toWorld(qb.pos, origin, 0.7 + 0.15 * Math.sin(state.time * 3)));
        break;
      }
      case 'flight': {
        const u = Math.min(1, (state.time - ball.thrownAt) / (ball.landsAt - ball.thrownAt));
        // A bullet: flat and fast, at chest height.
        this.ball.position.copy(toWorld(lerp(ball.from, ball.target, u), origin, 1));
        break;
      }
      case 'carried': {
        const head = bodies.headOf(ball.by);
        const runner = state.field.players.find((p) => p.id === ball.by);
        if (head) this.ball.position.copy(head);
        // The QB running it: the pumpkin goes itself, bounding upfield.
        else if (runner) {
          const hop = Math.abs(Math.sin(state.time * 9)) * 0.5;
          this.ball.position.copy(toWorld(runner.pos, origin, 0.3 + hop));
        }
        break;
      }
      case 'dead':
        this.ball.position.copy(toWorld(ball.pos, origin, 0.12));
        break;
    }
    this.light.position.copy(this.ball.position).add(new THREE.Vector3(0, LIGHT_LIFT, 0));
    // Embers: a gentle drift off it, and a trail of sparks while it flies.
    const glow = this.ball.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    if (ball.at === 'flight') this.embers.stream(glow, 160, dt, 1.2, 0.3);
    else if (ball.at !== 'dead') this.embers.stream(glow, 18, dt);
    this.embers.update(dt);
    // A little flicker, like a candle.
    this.light.intensity =
      LIGHT_INTENSITY * (0.92 + 0.08 * Math.sin(state.time * 23) * Math.sin(state.time * 7));
  }
}
