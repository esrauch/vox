import * as THREE from 'three';
import { DEFENDERS } from '../content/defenders';
import { common, hexToNumber, team } from '../content/palettes';
import { coverageRadius, openness, type Openness } from '../sim/coverage';
import { eq } from '../sim/grid';
import { getGeometry, modelHeight, voxelMaterial } from '../voxel/models';
import type { Form, RunState, ScreenState, Unit, Vec } from '../sim/types';
import { tilt } from './experiments';
import { tileToWorld } from './view';

/** The plain football player: every one of your players, for now. */
const WALK_ON_MODEL = 'team/walkOn';
const WALK_ON_HEIGHT = modelHeight(WALK_ON_MODEL);
/** Placeholder looks for the monsters: a block of this color on the head. */
const FORM_COLOR: Readonly<Record<Exclude<Form, 'human'>, number>> = {
  ghost: 0xf2f0ff,
  werewolf: 0x8a5a33,
  golem: 0x8c8f99,
};
const GOLEM_SCALE = 1.2;

/** How much of a beat a hop takes. The rest of the beat the unit stands still. */
const HOP_SHARE = 0.55;

/** Your players' rings (GAMEPLAY.md, Coverage): green open, yellow tight, red covered. */
const OPENNESS_COLOR: Readonly<Record<Openness, number>> = {
  open: hexToNumber(common.slimeGreen),
  tight: hexToNumber(team.accent),
  covered: hexToNumber(common.danger),
};
const COVERAGE_COLOR = hexToNumber(common.candyPurple);

interface UnitView {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
  /** Height of the body's origin above the ground: 0 for voxel models, half-height for cubes. */
  readonly base: number;
  readonly arrow: THREE.Mesh;
  /** On the ground: a defender's purple coverage ring, or a player's green/yellow/red ring. */
  readonly ring: THREE.Mesh;
  from: Vec;
  to: Vec;
  /** Where it is right now, after animation. */
  readonly current: THREE.Vector3;
}

/**
 * Every player and defender on the field. Walk-ons and defenders are voxel
 * models; special players are still placeholder cubes. They hop from their
 * old tile to their new one at the start of each beat, always face the camera
 * (an arrow shows where they'll hop next) and tip over when knocked down.
 *
 * The rings on the turf are the coverage telegraph: every covering defender
 * shows its purple ring, and every one of your players shows its odds of
 * catching a pass arriving now: green likely, yellow a coin flip, red a long shot.
 */
export class UnitViews {
  private readonly views = new Map<number, UnitView>();
  private readonly materials = new Map<
    number,
    THREE.MeshBasicMaterial | THREE.MeshLambertMaterial
  >();
  private readonly badgeGeo = new THREE.BoxGeometry(0.3, 0.24, 0.3);
  private readonly arrowGeo = new THREE.ConeGeometry(0.13, 0.28, 4).rotateX(-Math.PI / 2);
  private readonly arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  /** A unit-radius ring, scaled to each defender's coverage. */
  private readonly coverageGeo = new THREE.RingGeometry(0.95, 1, 48).rotateX(-Math.PI / 2);
  private readonly playerRingGeo = new THREE.RingGeometry(0.3, 0.4, 24).rotateX(-Math.PI / 2);

  constructor(private readonly scene: THREE.Scene) {}

  /** Rebuild every view from scratch (a new down). */
  reset(screen: ScreenState): void {
    for (const v of this.views.values()) this.scene.remove(v.root, v.ring);
    this.views.clear();
    for (const u of [...screen.players, ...screen.defenders]) this.views.set(u.id, this.create(u));
  }

  /** Make sure every unit has a view (players appear when a play is called). */
  sync(screen: ScreenState): void {
    const ids = new Set([...screen.players, ...screen.defenders].map((u) => u.id));
    for (const [id, v] of this.views) {
      if (ids.has(id)) continue;
      this.scene.remove(v.root, v.ring);
      this.views.delete(id);
    }
    for (const u of [...screen.players, ...screen.defenders]) {
      if (!this.views.has(u.id)) this.views.set(u.id, this.create(u));
    }
  }

  /** After a beat step: every unit animates from where it was to where it is now. */
  beginBeat(prev: ScreenState, next: ScreenState): void {
    const before = new Map([...prev.players, ...prev.defenders].map((u) => [u.id, u]));
    for (const u of [...next.players, ...next.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      view.from = before.get(u.id)?.pos ?? u.pos;
      view.to = u.pos;
    }
  }

  /** Animate to `phase` (0..1) of the current beat. */
  update(state: RunState, phase: number): void {
    const { screen } = state;
    for (const u of [...screen.players, ...screen.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      this.updateOne(u, view, phase);
      this.updateRing(state, u, view);
    }
  }

  /** Everything drawn for the units (for the hand-over between drives, render/crossfade.ts). */
  objects(): THREE.Object3D[] {
    return [...this.views.values()].flatMap((v) => [v.root, v.ring]);
  }

  /** The animated world position of a unit (for the carried ball). */
  positionOf(id: number): THREE.Vector3 | null {
    return this.views.get(id)?.current ?? null;
  }

  private create(u: Unit): UnitView {
    const model = u.side === 'defender' ? DEFENDERS[u.kind].model : WALK_ON_MODEL;
    const body = new THREE.Mesh(getGeometry(model), voxelMaterial);
    body.castShadow = true;
    // Placeholder monsters (until their models exist): your player, with a
    // colored block on its head for its form, and a Golem a size bigger.
    if (u.side === 'player' && u.form !== 'human') {
      const badge = new THREE.Mesh(this.badgeGeo, this.lambert(FORM_COLOR[u.form]));
      badge.position.y = WALK_ON_HEIGHT + 0.12;
      body.add(badge);
      if (u.form === 'golem') body.scale.setScalar(GOLEM_SCALE);
    }
    const base = 0;
    const arrow = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    const root = new THREE.Group();
    root.add(body, arrow);
    const ring = new THREE.Mesh(
      u.side === 'defender' ? this.coverageGeo : this.playerRingGeo,
      this.basic(u.side === 'defender' ? COVERAGE_COLOR : OPENNESS_COLOR.open),
    );
    this.scene.add(root, ring);
    const current = tileToWorld(u.pos);
    return { root, body, base, arrow, ring, from: u.pos, to: u.pos, current };
  }

  private lambert(color: number): THREE.MeshLambertMaterial {
    const key = color * 2;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color });
      this.materials.set(key, m);
    }
    return m as THREE.MeshLambertMaterial;
  }

  private basic(color: number): THREE.MeshBasicMaterial {
    const key = color * 2 + 1;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
      this.materials.set(key, m);
    }
    return m as THREE.MeshBasicMaterial;
  }

  private updateOne(u: Unit, view: UnitView, phase: number): void {
    // Hop: an arc from the old tile to the new one over the first part of the beat.
    const t = Math.min(1, phase / HOP_SHARE);
    const ease = t * t * (3 - 2 * t);
    const from = tileToWorld(view.from);
    const to = tileToWorld(view.to);
    const moving = !eq(view.from, view.to);
    const lift = moving ? Math.sin(t * Math.PI) * 0.45 : 0;
    view.current.lerpVectors(from, to, moving ? ease : 1);
    view.root.position.set(view.current.x, lift, view.current.z);

    // Squash on landing, tip over when knocked down.
    const land = moving && t >= 1 ? Math.max(0, 1 - (phase - HOP_SHARE) / 0.2) : 0;
    view.body.scale.set(1 + land * 0.15, 1 - land * 0.2, 1 + land * 0.15);
    view.body.position.y = view.base * (1 - land * 0.2);
    view.body.rotation.z = u.downTicks > 0 ? Math.PI / 2 : 0;
    view.body.rotation.x = tilt;
    if (u.downTicks > 0) view.body.position.y = Math.max(view.base * 0.8, 0.25);

    // The arrow points where it will hop next. Models never turn.
    view.arrow.visible = !!u.intent && u.downTicks === 0;
    if (u.intent) {
      const dx = u.intent.x - u.pos.x;
      const dy = u.intent.y - u.pos.y;
      view.arrow.position.set(dx * 0.42, 0.06, -dy * 0.42);
      view.arrow.rotation.y = Math.atan2(-dx, dy);
    }
  }

  private updateRing(state: RunState, u: Unit, view: UnitView): void {
    const { screen } = state;
    view.ring.position.set(view.current.x, 0.02, view.current.z);
    if (u.side === 'defender') {
      // Coverage only matters while a pass can still be thrown or caught.
      const r = screen.ball.at === 'carried' ? 0 : coverageRadius(u);
      view.ring.visible = r > 0;
      view.ring.scale.setScalar(Math.max(r, 0.01));
      return;
    }
    // Open or covered matters until someone catches it (it can change while the ball's in the air).
    view.ring.visible = screen.ball.at === 'qb' || screen.ball.at === 'flight';
    view.ring.material = this.basic(OPENNESS_COLOR[openness(state, u)]);
  }
}
