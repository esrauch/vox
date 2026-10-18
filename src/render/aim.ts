import * as THREE from 'three';
import { common, hexToNumber, team } from '../content/palettes';
import { tuning } from '../content/tuning';
import type { Vec } from '../sim/types';
import { qbHand } from './qb';
import { ballHeight, flightDistance } from '../sim/flight';
import { arcPoint } from './throwArc';
import { tileToWorld } from './view';

const RETICLE_COLOR = hexToNumber(team.jersey);
const BAD_COLOR = hexToNumber(common.danger);
/** Dashes where the ball will be low enough to catch (or to bat down). */
const LOW_COLOR = hexToNumber(team.accent);
/** Dashes where it will be out of everyone's reach. */
const HIGH_COLOR = 0xffffff;
/** How many dashes make up the aiming arc. */
const DASHES = 24;

/**
 * The aim preview while pulling back: a free (not grid-locked) reticle with
 * rings at the perfect and ok catch distances, and a dashed arc from the QB's
 * hand to it, marching toward the target. The arc is the real flight
 * (sim/flight.ts): gold where the ball will be low enough to catch, and to
 * bat down; white where it's out of reach. All red where a throw isn't allowed.
 */
export class AimView {
  private readonly reticle = new THREE.Group();
  private readonly arc = new THREE.Group();
  private readonly dashes: THREE.Mesh[] = [];
  private readonly material = new THREE.MeshBasicMaterial({
    color: RETICLE_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  private readonly lowMat = new THREE.MeshBasicMaterial({ color: LOW_COLOR });
  private readonly highMat = new THREE.MeshBasicMaterial({
    color: HIGH_COLOR,
    transparent: true,
    opacity: 0.7,
  });
  private readonly badMat = new THREE.MeshBasicMaterial({ color: BAD_COLOR });
  private valid = true;
  private target: Vec | null = null;
  private from: Vec = { x: 0, y: 0 };

  constructor(scene: THREE.Scene) {
    for (const radius of [tuning.catch.perfect, tuning.catch.ok]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.05, radius, 40), this.material);
      ring.rotation.x = -Math.PI / 2;
      this.reticle.add(ring);
    }
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), this.material);
    dot.rotation.x = -Math.PI / 2;
    this.reticle.add(dot);

    const dashGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    for (let i = 0; i < DASHES; i++) {
      const dash = new THREE.Mesh(dashGeo, this.material);
      this.dashes.push(dash);
      this.arc.add(dash);
    }
    this.set(null);
    scene.add(this.reticle, this.arc);
  }

  /** Show the aim from the QB's tile to a free point (tile units), or hide it with null. */
  set(aim: { from: Vec; target: Vec; valid: boolean } | null): void {
    if (aim) this.from = aim.from;
    this.target = aim?.target ?? null;
    this.reticle.visible = aim !== null;
    this.arc.visible = aim !== null;
    if (!aim) return;
    this.valid = aim.valid;
    this.reticle.position.copy(tileToWorld(aim.target, 0.03));
    this.material.color.set(aim.valid ? RETICLE_COLOR : BAD_COLOR);
  }

  /** `time` in seconds drives the marching dashes. */
  update(time: number): void {
    const target = this.target;
    if (!target) return;
    const from = qbHand(this.from);
    const to = tileToWorld(target, 0.1);
    const distance = flightDistance(this.from, target);
    const march = (time * 0.12) % (1 / DASHES);
    this.dashes.forEach((dash, i) => {
      const t = i / DASHES + march;
      arcPoint(dash.position, from, to, t, distance);
      dash.visible = t <= 1;
      // Gold a little short of the real window (tuning.throw.shownReach), so it plays more forgiving than it looks.
      const low = ballHeight(distance, Math.min(1, t)) < tuning.throw.shownReach;
      dash.material = !this.valid ? this.badMat : low ? this.lowMat : this.highMat;
      dash.scale.setScalar(low ? 1.8 : 1);
    });
  }
}
