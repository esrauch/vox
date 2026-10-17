import * as THREE from 'three';
import { bigs, common, hexToNumber } from '../content/palettes';
import { eq } from '../sim/grid';
import type { DefenderKind, ScreenState, Unit, Vec } from '../sim/types';
import { tileToWorld } from './view';

const SMALL_COLORS = {
  runner: hexToNumber(common.candyPurple),
  recruit: hexToNumber(bigs.elderBough.accent),
};
const DEFENDER_COLORS: Record<DefenderKind, number> = {
  chaser: 0xe8344e,
  blitzer: 0x9e1030,
  waller: 0xd9622b,
  picker: 0xff5fa2,
};

/** How much of a beat a hop takes. The rest of the beat the unit stands still. */
const HOP_SHARE = 0.55;

interface UnitView {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
  readonly arrow: THREE.Mesh;
  from: Vec;
  to: Vec;
  /** The beat this unit died on, if it did (it shrinks away during that beat). */
  diedOn: number | null;
  /** Where it is right now, after animation. */
  readonly current: THREE.Vector3;
}

/**
 * Placeholder cubes for every Small and defender (M1.3). They hop from their
 * old tile to their new one at the start of each beat, face where they'll hop
 * next, tip over when knocked down and shrink away when they die.
 */
export class UnitViews {
  private readonly views = new Map<number, UnitView>();
  private readonly materials = new Map<number, THREE.MeshLambertMaterial>();
  private readonly smallBox = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  private readonly defenderBox = new THREE.BoxGeometry(0.6, 0.75, 0.6);
  private readonly arrowGeo = new THREE.ConeGeometry(0.13, 0.28, 4).rotateX(-Math.PI / 2);
  private readonly arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private dragging: { id: number; tile: Vec } | null = null;

  constructor(private readonly scene: THREE.Scene) {}

  /** Rebuild every view from scratch (a new screen or a restart). */
  reset(screen: ScreenState): void {
    for (const v of this.views.values()) this.scene.remove(v.root);
    this.views.clear();
    for (const u of [...screen.smalls, ...screen.defenders]) this.views.set(u.id, this.create(u));
  }

  /**
   * After a beat step: every unit animates from where it was to where it is
   * now. `beat` is the beat just resolved.
   */
  beginBeat(prev: ScreenState, next: ScreenState, beat: number): void {
    const before = new Map([...prev.smalls, ...prev.defenders].map((u) => [u.id, u]));
    for (const u of [...next.smalls, ...next.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      view.from = before.get(u.id)?.pos ?? u.pos;
      view.to = u.pos;
      if (!u.alive && before.get(u.id)?.alive) view.diedOn = beat;
    }
  }

  /** Animate to `phase` (0..1) of the current beat. */
  update(screen: ScreenState, beat: number, phase: number): void {
    for (const u of [...screen.smalls, ...screen.defenders]) {
      const view = this.views.get(u.id);
      if (!view) continue;
      this.updateOne(u, view, beat, phase);
    }
  }

  /** The animated world position of a unit (for the carried ball and badges). */
  positionOf(id: number): THREE.Vector3 | null {
    return this.views.get(id)?.current ?? null;
  }

  /** While dragging in setup, show the Small at the tile under the finger. */
  setDragging(drag: { id: number; tile: Vec } | null): void {
    this.dragging = drag;
  }

  private create(u: Unit): UnitView {
    const color =
      u.side === 'defender'
        ? DEFENDER_COLORS[u.kind]
        : u.kindId !== 'walkOn'
          ? SMALL_COLORS.recruit
          : SMALL_COLORS.runner;
    const body = new THREE.Mesh(
      u.side === 'small' ? this.smallBox : this.defenderBox,
      this.material(color),
    );
    body.castShadow = true;
    const arrow = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    const root = new THREE.Group();
    root.add(body, arrow);
    this.scene.add(root);
    return { root, body, arrow, from: u.pos, to: u.pos, diedOn: null, current: tileToWorld(u.pos) };
  }

  private material(color: number): THREE.MeshLambertMaterial {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color });
      this.materials.set(color, m);
    }
    return m;
  }

  private updateOne(u: Unit, view: UnitView, beat: number, phase: number): void {
    const half = u.side === 'small' ? 0.275 : 0.375;

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
    view.body.position.y = half * (1 - land * 0.2);
    view.body.rotation.z = u.downBeats > 0 ? Math.PI / 2 : 0;
    if (u.downBeats > 0) view.body.position.y = half * 0.8;

    // Face where it will hop next.
    const engaged = u.side === 'defender' && u.engagedSince !== null;
    view.arrow.visible = !!u.intent && u.downBeats === 0 && !engaged && !dragged;
    if (u.intent) {
      const dx = u.intent.x - u.pos.x;
      const dy = u.intent.y - u.pos.y;
      view.arrow.position.set(dx * 0.42, 0.06, -dy * 0.42);
      view.arrow.rotation.y = Math.atan2(-dx, dy);
    }
  }
}
