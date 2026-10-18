import * as THREE from 'three';
import { DEFENDERS } from '../content/defenders';
import { hexToNumber, team } from '../content/palettes';
import { eq } from '../sim/grid';
import { getGeometry, voxelMaterial } from '../voxel/models';
import type { ScreenState, Unit, Vec } from '../sim/types';
import { tilt } from '../experiments';
import { tileOutline } from './field';
import { tileToWorld } from './view';

const RECRUIT_COLOR = hexToNumber(team.accent);
/** The vanilla rookie football player. */
const WALK_ON_MODEL = 'team/walkOn';

/** How much of a beat a hop takes. The rest of the beat the unit stands still. */
const HOP_SHARE = 0.55;

interface UnitView {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
  /** Height of the body's origin above the ground: 0 for voxel models, half-height for cubes. */
  readonly base: number;
  readonly arrow: THREE.Mesh;
  from: Vec;
  to: Vec;
  /** The beat this unit died on, if it did (it shrinks away during that beat). */
  diedOn: number | null;
  /** Where it is right now, after animation. */
  readonly current: THREE.Vector3;
}

/**
 * Every player and defender on the field. Walk-ons and defenders are voxel
 * models; recruits are still placeholder cubes. They hop from their old
 * tile to their new one at the start of each beat, always face the camera
 * (an arrow shows where they'll hop next), tip over when knocked down and
 * shrink away when they die.
 */
export class UnitViews {
  private readonly views = new Map<number, UnitView>();
  private readonly materials = new Map<number, THREE.MeshLambertMaterial>();
  private readonly recruitBox = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  private readonly arrowGeo = new THREE.ConeGeometry(0.13, 0.28, 4).rotateX(-Math.PI / 2);
  private readonly arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  /** The carrier's arrow is bigger and gold: it's the one you steer. */
  private readonly carrierArrowMat = new THREE.MeshBasicMaterial({
    color: hexToNumber(team.accent),
  });
  private dragging: { id: number; tile: Vec } | null = null;
  /**
   * The tile the carrier will be on after its next hop (its own tile while it
   * waits): the steering feedback, outlined in gold on the turf so it never
   * hides behind a player the way an up-field arrow does.
   */
  private readonly nextTile = tileOutline({ x: 0, y: 0 }, hexToNumber(team.accent), 0.9);

  constructor(private readonly scene: THREE.Scene) {
    this.nextTile.visible = false;
    scene.add(this.nextTile);
  }

  /** Rebuild every view from scratch (a new screen or a restart). */
  reset(screen: ScreenState): void {
    for (const v of this.views.values()) this.scene.remove(v.root);
    this.views.clear();
    for (const u of [...screen.players, ...screen.defenders]) this.views.set(u.id, this.create(u));
  }

  /**
   * After a beat step: every unit animates from where it was to where it is
   * now. `beat` is the beat just resolved.
   */
  beginBeat(prev: ScreenState, next: ScreenState, beat: number): void {
    const before = new Map([...prev.players, ...prev.defenders].map((u) => [u.id, u]));
    for (const u of [...next.players, ...next.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      view.from = before.get(u.id)?.pos ?? u.pos;
      view.to = u.pos;
      if (!u.alive && before.get(u.id)?.alive) view.diedOn = beat;
    }
  }

  /** Animate to `phase` (0..1) of the current beat. */
  update(screen: ScreenState, beat: number, phase: number): void {
    const carrier = screen.ball.at === 'carried' ? screen.ball.by : null;
    const carrierUnit = screen.players.find(
      (s) => s.id === carrier && s.alive && s.downBeats === 0,
    );
    this.nextTile.visible = !!carrierUnit;
    if (carrierUnit) {
      this.nextTile.position.copy(tileToWorld(carrierUnit.intent ?? carrierUnit.pos, 0.02));
    }
    for (const u of [...screen.players, ...screen.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      this.updateOne(u, view, beat, phase, u.id === carrier);
    }
  }

  /** The animated world position of a unit (for the carried ball and badges). */
  positionOf(id: number): THREE.Vector3 | null {
    return this.views.get(id)?.current ?? null;
  }

  /** While dragging in setup, show the player at the tile under the finger. */
  setDragging(drag: { id: number; tile: Vec } | null): void {
    this.dragging = drag;
  }

  private create(u: Unit): UnitView {
    // Walk-ons and defenders are voxel models; recruits are still placeholder cubes.
    const model =
      u.side === 'defender'
        ? DEFENDERS[u.kind].model
        : u.kindId === 'walkOn'
          ? WALK_ON_MODEL
          : null;
    const body = model
      ? new THREE.Mesh(getGeometry(model), voxelMaterial)
      : new THREE.Mesh(this.recruitBox, this.material(RECRUIT_COLOR));
    body.castShadow = true;
    const base = model ? 0 : 0.275;
    const arrow = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    const root = new THREE.Group();
    root.add(body, arrow);
    this.scene.add(root);
    const current = tileToWorld(u.pos);
    return { root, body, base, arrow, from: u.pos, to: u.pos, diedOn: null, current };
  }

  private material(color: number): THREE.MeshLambertMaterial {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color });
      this.materials.set(color, m);
    }
    return m;
  }

  private updateOne(u: Unit, view: UnitView, beat: number, phase: number, carrier: boolean): void {
    if (!u.alive) {
      const dying = view.diedOn === beat;
      view.root.visible = dying;
      if (dying) view.body.scale.setScalar(Math.max(0.01, 1 - phase * 1.6));
      view.arrow.visible = false;
      return;
    }
    view.root.visible = true;

    // Hop: an arc from the old tile to the new one over the first part of the beat.
    const t = Math.min(1, phase / HOP_SHARE);
    const ease = t * t * (3 - 2 * t);
    const dragged = this.dragging?.id === u.id ? this.dragging.tile : null;
    const from = tileToWorld(dragged ?? view.from);
    const to = tileToWorld(dragged ?? view.to);
    const moving = !eq(view.from, view.to) && !dragged;
    const lift = dragged ? 0.5 : moving ? Math.sin(t * Math.PI) * 0.45 : 0;
    view.current.lerpVectors(from, to, moving ? ease : 1);
    view.root.position.set(view.current.x, lift, view.current.z);

    // Squash on landing, tip over when knocked down.
    const land = moving && t >= 1 ? Math.max(0, 1 - (phase - HOP_SHARE) / 0.2) : 0;
    view.body.scale.set(1 + land * 0.15, 1 - land * 0.2, 1 + land * 0.15);
    view.body.position.y = view.base * (1 - land * 0.2);
    view.body.rotation.z = u.downBeats > 0 ? Math.PI / 2 : 0;
    view.body.rotation.x = tilt;
    if (u.downBeats > 0) view.body.position.y = Math.max(view.base * 0.8, 0.25);

    // Face where it will hop next.
    view.arrow.visible = !!u.intent && u.downBeats === 0 && !dragged;
    view.arrow.material = carrier ? this.carrierArrowMat : this.arrowMat;
    view.arrow.scale.setScalar(carrier ? 1.6 : 1);
    if (u.intent) {
      const dx = u.intent.x - u.pos.x;
      const dy = u.intent.y - u.pos.y;
      const reach = carrier ? 0.55 : 0.42;
      view.arrow.position.set(dx * reach, 0.06, -dy * reach);
      view.arrow.rotation.y = Math.atan2(-dx, dy);
    }
    // Models never turn: they always face the camera, and the arrow shows where they'll hop.
  }
}
