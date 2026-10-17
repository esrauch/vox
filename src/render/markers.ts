import * as THREE from 'three';
import { hexToNumber, team } from '../content/palettes';
import { QB_POS } from '../sim/grid';
import type { ScreenState, Vec } from '../sim/types';
import { getGeometry, modelHeight, voxelMaterial } from '../voxel/models';
import { tuning } from '../content/tuning';
import { QB_MODEL, QB_THROWN_MODEL } from './field';
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
/** The QB stands slightly forward on its tile. */
const QB_OFFSET = new THREE.Vector3(0, 0, 0.15);
/** The raised hand relative to the QB's feet, leaning back with the character tilt. */
const HAND = new THREE.Vector3(0.4, HELD_Y, 0.05).applyAxisAngle(X_AXIS, tilt);
const heldPosition = (): THREE.Vector3 => tileToWorld(QB_POS).add(QB_OFFSET).add(HAND);
/** Where a carrier holds the ball, relative to its feet: held up overhead, leaning with the tilt. */
const CARRIED = new THREE.Vector3(0, 1.3, 0.1).applyAxisAngle(X_AXIS, tilt);
/** The ball is shown bigger while carried, so the carrier is unmistakable. */
const CARRIED_SCALE = 1.6;

interface Launch {
  readonly target: Vec;
  /** Fractional beat position of the release. */
  readonly releasedAt: number;
  readonly landsOn: number;
}

/**
 * The ball and the field indicators that move: the free (not grid-locked)
 * reticle with an animated dashed arc while aiming, and the landing ring with
 * one pip per beat until the ball lands.
 */
export class Markers {
  private readonly ball: THREE.Mesh;
  /** The QB never moves. It raises its throwing arm while it holds the ball and lowers it after the throw. */
  private readonly qb: THREE.Mesh;
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
  /** The throw just released: animated from the moment of release, before the sim takes it. */
  private launched: Launch | null = null;
  /** A pulsing ring on the ground around whoever is carrying the ball. */
  private readonly carrierRing: THREE.Mesh;
  private readonly landing = new THREE.Group();
  private readonly pips: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.ball = new THREE.Mesh(getGeometry(BALL_MODEL), voxelMaterial);
    this.ball.castShadow = true;

    // The QB faces the camera so its carved face is visible.
    this.qb = new THREE.Mesh(getGeometry(QB_MODEL), voxelMaterial);
    this.qb.position.copy(tileToWorld(QB_POS)).add(QB_OFFSET);
    this.qb.castShadow = true;
    this.qb.rotation.x = tilt;

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

    this.carrierRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 32),
      new THREE.MeshBasicMaterial({ color: hexToNumber(team.accent), side: THREE.DoubleSide }),
    );
    this.carrierRing.rotation.x = -Math.PI / 2;
    this.carrierRing.visible = false;

    scene.add(this.qb, this.ball, this.reticle, this.arc, this.landing, this.carrierRing);
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

  /** The ball left the QB's hand at beat position `releasedAt` and lands on beat `landsOn`; null forgets it. */
  launch(launch: Launch | null): void {
    this.launched = launch;
  }

  /** `beatPos` is the current beat plus its phase, e.g. 12.4. */
  update(screen: ScreenState, beatPos: number, units: UnitViews, time: number): void {
    const ball = screen.ball;
    // A released throw flies from the moment of release. Drop it once the sim's
    // ball has moved on, if the sim never took the throw (the QB lost the ball),
    // or if the beat count restarted (a new screen).
    const launch = this.launched;
    const flying =
      launch &&
      beatPos >= launch.releasedAt &&
      beatPos < launch.landsOn &&
      ((ball.at === 'qb' && beatPos < launch.landsOn - tuning.throw.flightBeats + 1) ||
        (ball.at === 'flight' && ball.landsOn === launch.landsOn))
        ? launch
        : ball.at === 'flight'
          ? { target: ball.target, releasedAt: ball.releasedOn, landsOn: ball.landsOn }
          : null;
    if (!flying) this.launched = null;
    this.qb.geometry = getGeometry(ball.at === 'qb' && !flying ? QB_MODEL : QB_THROWN_MODEL);
    this.ball.visible = ball.at !== 'none';
    this.landing.visible = flying !== null;
    this.ball.rotation.y = time * 1.5;

    if (this.aim) {
      // March the dashes along the arc from the QB's hand to the reticle.
      const from = heldPosition();
      const to = tileToWorld(this.aim.target, 0.1);
      const march = (time * 0.12) % (1 / DASHES);
      this.dashes.forEach((dash, i) => {
        const t = i / DASHES + march;
        dash.position.lerpVectors(from, to, t);
        dash.position.y += Math.sin(t * Math.PI) * ARC_HEIGHT;
        dash.visible = t <= 1;
      });
    }

    this.carrierRing.visible = ball.at === 'carried';
    this.ball.scale.setScalar(ball.at === 'carried' ? CARRIED_SCALE : 1);
    if (flying) {
      // A parabola from the QB's hand to the landing point, timed to the beat.
      const t = Math.min(
        1,
        Math.max(0, (beatPos - flying.releasedAt) / (flying.landsOn - flying.releasedAt)),
      );
      const from = heldPosition();
      const to = tileToWorld(flying.target, 0.6);
      this.ball.position.lerpVectors(from, to, t);
      this.ball.position.y += Math.sin(t * Math.PI) * ARC_HEIGHT;
      this.ball.rotation.x = t * Math.PI * 4;

      this.landing.position.copy(tileToWorld(flying.target, 0.03));
      const beatsLeft = Math.max(0, Math.ceil(flying.landsOn - beatPos));
      this.pips.forEach((pip, i) => (pip.visible = i < beatsLeft));
      this.landing.scale.setScalar(1 + (1 - (beatPos % 1)) * 0.15);
    } else if (ball.at === 'qb') {
      this.ball.position.copy(heldPosition());
    } else if (ball.at === 'carried') {
      const p = units.positionOf(ball.by);
      if (p) {
        this.ball.position.set(p.x + CARRIED.x, CARRIED.y, p.z + CARRIED.z);
        this.carrierRing.position.set(p.x, 0.03, p.z);
        this.carrierRing.scale.setScalar(1 + Math.abs(Math.sin(time * Math.PI * 2)) * 0.12);
      }
    }
  }
}
