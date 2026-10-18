import * as THREE from 'three';
import { hexToNumber, team } from '../content/palettes';
import type { ScreenState, Vec } from '../sim/types';
import { getGeometry, voxelMaterial } from '../voxel/models';
import { tilt } from './experiments';
import { qbHand } from './qb';
import { flightDistance } from '../sim/flight';
import { arcPoint } from './throwArc';
import type { UnitViews } from './units';
import { tileToWorld } from './view';

/** The team's ball: the jack-o'-lantern football. */
const BALL_MODEL = 'team/ball';
/** Where a carrier holds the ball, relative to its feet: overhead, leaning with the tilt. */
const CARRIED = new THREE.Vector3(0, 1.3, 0.1).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
/** How long (beats) a caught ball takes to glide into the receiver's hands. */
const CATCH_BLEND_BEATS = 0.35;
/** The ball is shown bigger while carried, so the carrier is unmistakable. */
const CARRIED_SCALE = 1.6;

/** A throw in the air, as drawn: from the moment of release to the beat it lands. */
export interface Flight {
  readonly target: Vec;
  /** Fractional beat position of the release. */
  readonly releasedAt: number;
  readonly landsOn: number;
}

/** How far (tiles) an incomplete pass skids on after it lands. */
const INCOMPLETE_SKID = 1.4;

/**
 * The ball, wherever it is: in the QB's raised hand, flying (with a landing
 * ring and one pip per beat left), held overhead by a carrier (who also gets
 * a pulsing ring on the ground), or dead when the down is over: a blocked
 * pass bounces off whatever blocked it, and an incomplete one skips on along
 * the turf.
 *
 * A throw is drawn from the moment of release (`launch`), a fraction of a beat
 * before the sim takes it on the next beat, flying a little faster or slower
 * so it still lands on the beat.
 */
export class BallView {
  private readonly ball = new THREE.Mesh(getGeometry(BALL_MODEL), voxelMaterial);
  private readonly landing = new THREE.Group();
  private readonly pips: THREE.Mesh[] = [];
  private readonly carrierRing: THREE.Mesh;
  private launched: Flight | null = null;
  /** When the ball went dead (beat position), for the bounce. */
  private deadSince: number | null = null;
  /** A catch: the ball glides from where it was drawn into the receiver's hands, instead of snapping. */
  private catchBlend: { from: THREE.Vector3; since: number } | null = null;
  private wasCarried = false;

  constructor(scene: THREE.Scene) {
    this.ball.castShadow = true;

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

    scene.add(this.ball, this.landing, this.carrierRing);
  }

  /** The ball and the carrier's ring (for the hand-over between drives, render/crossfade.ts). */
  objects(): THREE.Object3D[] {
    return [this.ball, this.carrierRing];
  }

  /** The ball just left the QB's hand (before the sim takes the throw); null forgets it. */
  launch(flight: Flight | null): void {
    this.launched = flight;
  }

  /**
   * Draw the ball at `beatPos` (the current beat plus its phase). Returns
   * whether the QB still holds it, so the QB can raise or lower its arm.
   */
  update(screen: ScreenState, beatPos: number, units: UnitViews, time: number): boolean {
    const ball = screen.ball;
    const flight = this.flight(screen, beatPos);
    this.ball.visible = true;
    this.ball.rotation.y = time * 1.5;
    if (ball.at !== 'dead') this.deadSince = null;
    const carried = ball.at === 'carried';
    if (carried && !this.wasCarried)
      this.catchBlend = { from: this.ball.position.clone(), since: beatPos };
    if (!carried) this.catchBlend = null;
    this.wasCarried = carried;
    this.ball.scale.setScalar(ball.at === 'carried' ? CARRIED_SCALE : 1);
    this.landing.visible = flight !== null;
    this.carrierRing.visible = ball.at === 'carried';

    if (flight) {
      const span = flight.landsOn - flight.releasedAt;
      const t = Math.min(1, Math.max(0, (beatPos - flight.releasedAt) / span));
      const distance = flightDistance(screen.qb, flight.target);
      arcPoint(
        this.ball.position,
        qbHand(screen.qb),
        tileToWorld(flight.target, 0.15),
        t,
        distance,
      );
      this.ball.rotation.x = t * Math.PI * 4;

      this.landing.position.copy(tileToWorld(flight.target, 0.03));
      const beatsLeft = Math.max(0, Math.ceil(flight.landsOn - beatPos));
      this.pips.forEach((pip, i) => (pip.visible = i < beatsLeft));
      this.landing.scale.setScalar(1 + (1 - (beatPos % 1)) * 0.15);
    } else if (ball.at === 'qb') {
      this.ball.position.copy(qbHand(screen.qb));
    } else if (ball.at === 'dead') {
      // A blocked pass pops up off the defender and drops beside it; an incomplete one just lies there.
      this.deadSince ??= beatPos;
      const t = Math.min(1, (beatPos - this.deadSince) / 1.5);
      const ground = tileToWorld(ball.pos, 0.15);
      if (ball.how === 'blocked') {
        ground.x += t * 0.6;
        ground.y += Math.sin(t * Math.PI) * 1.6 + (1 - t) * 0.9;
        this.ball.rotation.x = t * Math.PI * 3;
      } else if (ball.how === 'incomplete') {
        // It hits the turf still going: skips on the way it was thrown, in two shrinking hops.
        const dx = ball.pos.x - screen.qb.x;
        const dy = ball.pos.y - screen.qb.y;
        const len = Math.hypot(dx, dy) || 1;
        const run = (1 - (1 - t) * (1 - t)) * INCOMPLETE_SKID;
        ground.x += (dx / len) * run;
        ground.z -= (dy / len) * run;
        ground.y += Math.abs(Math.sin(t * Math.PI * 2)) * 0.7 * (1 - t);
        this.ball.rotation.x = t * Math.PI * 4 * (1 - t / 2);
      }
      this.ball.position.copy(ground);
    } else if (ball.at === 'carried') {
      const p = units.positionOf(ball.by);
      if (p) {
        this.ball.position.set(p.x + CARRIED.x, CARRIED.y, p.z + CARRIED.z);
        const blend = this.catchBlend;
        if (blend) {
          const t = Math.min(1, (beatPos - blend.since) / CATCH_BLEND_BEATS);
          const ease = t * t * (3 - 2 * t);
          this.ball.position.lerpVectors(blend.from, this.ball.position, ease);
          if (t >= 1) this.catchBlend = null;
        }
        this.carrierRing.position.set(p.x, 0.03, p.z);
        this.carrierRing.scale.setScalar(1 + Math.abs(Math.sin(time * Math.PI * 2)) * 0.12);
      }
    }
    return ball.at === 'qb' && !flight;
  }

  /**
   * The flight to draw, if any: the launched throw until the sim's ball has
   * moved on (or never took it: the QB lost the ball, or a new screen began),
   * otherwise the sim's own flight.
   */
  private flight(screen: ScreenState, beatPos: number): Flight | null {
    const ball = screen.ball;
    const l = this.launched;
    const launchedStill =
      l !== null &&
      beatPos >= l.releasedAt &&
      beatPos < l.landsOn &&
      // Until the sim takes the throw (on the tick after the release).
      ((ball.at === 'qb' && beatPos < Math.floor(l.releasedAt) + 2) ||
        (ball.at === 'flight' && ball.landsOn === l.landsOn));
    if (launchedStill) return l;
    this.launched = null;
    if (ball.at !== 'flight') return null;
    return { target: ball.target, releasedAt: ball.releasedOn, landsOn: ball.landsOn };
  }
}
