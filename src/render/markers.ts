import * as THREE from 'three';
import { hexToNumber, team } from '../content/palettes';
import { QB_POS } from '../sim/grid';
import type { ScreenState, Vec } from '../sim/types';
import { getGeometry, modelHeight, voxelMaterial } from '../voxel/models';
import { QB_MODEL, tileOutline } from './field';
import type { UnitViews } from './units';
import { tilt } from './experiments';
import { tileToWorld } from './view';

const RETICLE_COLOR = hexToNumber(team.jersey);
/** The team's ball: the jack-o'-lantern football. */
const BALL_MODEL = 'team/ball';
/** How high the QB holds the ball: at the top of its raised arm. */
const HELD_Y = modelHeight(QB_MODEL) + 0.02;
/** The QB's raised throwing hand, relative to its tile (the model's right arm, slightly forward). */
const X_AXIS = new THREE.Vector3(1, 0, 0);
/** The QB stands slightly forward on its tile (see field.ts). */
const QB_OFFSET = new THREE.Vector3(0, 0, 0.15);
/** The raised hand relative to the QB's feet, leaning back with the character tilt. */
const HAND = new THREE.Vector3(0.4, HELD_Y, 0.05).applyAxisAngle(X_AXIS, tilt);
const heldPosition = (): THREE.Vector3 => tileToWorld(QB_POS).add(QB_OFFSET).add(HAND);
/** Where a carrier holds the ball, relative to its feet: at chest height, leaning with the tilt. */
const CARRIED = new THREE.Vector3(0, 0.8, 0).applyAxisAngle(X_AXIS, tilt);

/**
 * The ball and the field indicators that move: the reticle, and the landing
 * ring with one pip per beat until the ball lands (GAMEPLAY.md, Reading the Beat).
 */
export class Markers {
  private readonly ball: THREE.Mesh;
  private readonly reticle: THREE.Mesh;
  private readonly landing = new THREE.Group();
  private readonly pips: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.ball = new THREE.Mesh(getGeometry(BALL_MODEL), voxelMaterial);
    this.ball.castShadow = true;

    this.reticle = tileOutline({ x: 0, y: 0 }, RETICLE_COLOR, 0.96);
    this.reticle.visible = false;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.landing.add(ring);
    const pipGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const pipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 4; i++) {
      const pip = new THREE.Mesh(pipGeo, pipMat);
      pip.position.set(-0.15 + i * 0.1, 0.02, 0.52);
      this.pips.push(pip);
      this.landing.add(pip);
    }
    this.landing.visible = false;

    scene.add(this.ball, this.reticle, this.landing);
  }

  setReticle(tile: Vec | null): void {
    this.reticle.visible = tile !== null;
    if (tile) this.reticle.position.copy(tileToWorld(tile, 0.02));
  }

  /** `beatPos` is the current beat plus its phase, e.g. 12.4. */
  update(screen: ScreenState, beatPos: number, units: UnitViews, time: number): void {
    const ball = screen.ball;
    this.ball.visible = ball.at !== 'none';
    this.landing.visible = ball.at === 'flight';
    this.ball.rotation.y = time * 1.5;

    if (ball.at === 'qb') {
      this.ball.position.copy(heldPosition());
    } else if (ball.at === 'carried') {
      const p = units.positionOf(ball.by);
      if (p) this.ball.position.set(p.x + CARRIED.x, CARRIED.y, p.z + CARRIED.z);
    } else if (ball.at === 'flight') {
      // A parabola from the QB's hand to the landing tile, timed to the beat.
      const t = Math.min(
        1,
        Math.max(0, (beatPos - ball.releasedOn) / (ball.landsOn - ball.releasedOn)),
      );
      const from = heldPosition();
      const to = tileToWorld(ball.target, 0.6);
      this.ball.position.lerpVectors(from, to, t);
      this.ball.position.y += Math.sin(t * Math.PI) * 3.2;
      this.ball.rotation.x = t * Math.PI * 4;

      this.landing.position.copy(tileToWorld(ball.target, 0.03));
      const beatsLeft = Math.max(0, Math.ceil(ball.landsOn - beatPos));
      this.pips.forEach((pip, i) => (pip.visible = i < beatsLeft));
      this.landing.scale.setScalar(1 + (1 - (beatPos % 1)) * 0.15);
    }
  }
}
