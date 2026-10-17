import * as THREE from 'three';
import { bigs, hexToNumber } from '../content/palettes';
import { BIG_POS } from '../sim/grid';
import type { ScreenState, Vec } from '../sim/types';
import { tileOutline } from './field';
import type { UnitViews } from './units';
import { tileToWorld } from './view';

const RETICLE_COLOR = hexToNumber(bigs.elderBough.primary);
const BALL_COLOR = hexToNumber(bigs.elderBough.primary);

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
    this.ball = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.34, 0.34),
      new THREE.MeshLambertMaterial({ color: BALL_COLOR, emissive: 0x552200 }),
    );
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

    if (ball.at === 'big') {
      this.ball.position.copy(tileToWorld(BIG_POS, 1.45));
    } else if (ball.at === 'carried') {
      const p = units.positionOf(ball.by);
      if (p) this.ball.position.set(p.x, 0.85, p.z);
    } else if (ball.at === 'flight') {
      // A parabola from the Big's hand to the landing tile, timed to the beat.
      const t = Math.min(
        1,
        Math.max(0, (beatPos - ball.releasedOn) / (ball.landsOn - ball.releasedOn)),
      );
      const from = tileToWorld(BIG_POS, 1.45);
      const to = tileToWorld(ball.target, 0.3);
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
