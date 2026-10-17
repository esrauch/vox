import * as THREE from 'three';
import { hexToNumber, team } from '../content/palettes';
import { QB_POS } from '../sim/grid';
import type { ScreenState, Vec } from '../sim/types';
import { getGeometry, modelHeight, voxelMaterial } from '../voxel/models';
import { tuning } from '../content/tuning';
import { QB_MODEL } from './field';
import type { UnitViews } from './units';
import { tilt } from './experiments';
import { tileToWorld } from './view';

const RETICLE_COLOR = hexToNumber(team.jersey);
const BAD_COLOR = 0xe8344e;
/** How many dashes make up the aiming arc, and how high it arcs. */
const DASHES = 18;
const ARC_HEIGHT = 3.2;
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
 * The ball and the field indicators that move: the free (not grid-locked)
 * reticle with an animated dashed arc while aiming, and the landing ring with
 * one pip per beat until the ball lands.
 */
export class Markers {
  private readonly ball: THREE.Mesh;
  private readonly reticle = new THREE.Group();
  private readonly reticleMat = new THREE.MeshBasicMaterial({
    color: RETICLE_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  private readonly arc = new THREE.Group();
  private readonly dashes: THREE.Mesh[] = [];
  private aim: { target: Vec; valid: boolean } | null = null;
  private readonly landing = new THREE.Group();
  private readonly pips: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.ball = new THREE.Mesh(getGeometry(BALL_MODEL), voxelMaterial);
    this.ball.castShadow = true;

    // The reticle: rings at the "perfect" and "ok" catch distances, plus a centre dot.
    for (const [inner, outer] of [
      [tuning.catch.perfect - 0.05, tuning.catch.perfect],
      [tuning.catch.ok - 0.05, tuning.catch.ok],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 40), this.reticleMat);
      ring.rotation.x = -Math.PI / 2;
      this.reticle.add(ring);
    }
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), this.reticleMat);
    dot.rotation.x = -Math.PI / 2;
    this.reticle.add(dot);
    this.reticle.visible = false;

    // The aiming arc: small dashes along the throw's path, marching toward the target.
    const dashGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    for (let i = 0; i < DASHES; i++) {
      const dash = new THREE.Mesh(dashGeo, this.reticleMat);
      this.dashes.push(dash);
      this.arc.add(dash);
    }
    this.arc.visible = false;

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

    scene.add(this.ball, this.reticle, this.arc, this.landing);
  }

  /** While aiming: where the throw would land (a free point in tile units), and whether it's allowed. */
  setAim(aim: { target: Vec; valid: boolean } | null): void {
    this.aim = aim;
    this.reticle.visible = aim !== null;
    this.arc.visible = aim !== null;
    if (aim) {
      this.reticle.position.copy(tileToWorld(aim.target, 0.03));
      this.reticleMat.color.set(aim.valid ? RETICLE_COLOR : BAD_COLOR);
    }
  }

  /** `beatPos` is the current beat plus its phase, e.g. 12.4. */
  update(screen: ScreenState, beatPos: number, units: UnitViews, time: number): void {
    const ball = screen.ball;
    this.ball.visible = ball.at !== 'none';
    this.landing.visible = ball.at === 'flight';
    this.ball.rotation.y = time * 1.5;

    if (this.aim) {
      // March the dashes along the arc from the QB's hand to the reticle.
      const from = heldPosition();
      const to = tileToWorld(this.aim.target, 0.1);
      const march = (time * 1.2) % (1 / DASHES);
      this.dashes.forEach((dash, i) => {
        const t = i / DASHES + march;
        dash.position.lerpVectors(from, to, t);
        dash.position.y += Math.sin(t * Math.PI) * ARC_HEIGHT;
        dash.visible = t <= 1;
      });
    }

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
      this.ball.position.y += Math.sin(t * Math.PI) * ARC_HEIGHT;
      this.ball.rotation.x = t * Math.PI * 4;

      this.landing.position.copy(tileToWorld(ball.target, 0.03));
      const beatsLeft = Math.max(0, Math.ceil(ball.landsOn - beatPos));
      this.pips.forEach((pip, i) => (pip.visible = i < beatsLeft));
      this.landing.scale.setScalar(1 + (1 - (beatPos % 1)) * 0.15);
    }
  }
}
