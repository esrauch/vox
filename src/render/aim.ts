import * as THREE from 'three';
import { common, hexToNumber, team } from '../content/palettes';
import { tuning } from '../content/tuning';
import type { Vec } from '../sim/types';
import { qbHand } from './qb';
import { flightDistance } from '../sim/flight';
import { arcPoint } from './throwArc';
import { tileToWorld } from './view';

const RETICLE_COLOR = hexToNumber(team.jersey);
const BAD_COLOR = hexToNumber(common.danger);
/** How many dashes make up the aiming arc. */
const DASHES = 18;

/**
 * The aim preview while pulling back: a free (not grid-locked) reticle with
 * rings at the perfect and ok catch distances, and a dashed arc from the QB's
 * hand to it, marching toward the target. Red where a throw isn't allowed.
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
    this.reticle.position.copy(tileToWorld(aim.target, 0.03));
    this.material.color.set(aim.valid ? RETICLE_COLOR : BAD_COLOR);
  }

  /** `time` in seconds drives the marching dashes. */
  update(time: number): void {
    if (!this.target) return;
    const from = qbHand(this.from);
    const to = tileToWorld(this.target, 0.1);
    const distance = flightDistance(this.from, this.target);
    const march = (time * 0.12) % (1 / DASHES);
    this.dashes.forEach((dash, i) => {
      const t = i / DASHES + march;
      arcPoint(dash.position, from, to, t, distance);
      dash.visible = t <= 1;
    });
  }
}
