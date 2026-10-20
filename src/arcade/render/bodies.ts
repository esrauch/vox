/**
 * Everyone on the arcade field as voxel models. Placeholders until the role
 * and monster models exist (MILESTONES, A4): your players are the walk-on,
 * stretched into the three role silhouettes (wide Blockers, lean Runners,
 * tall Catchers), with a colored block on the head for a monster form.
 * Defenders are the forest set. Everyone turns to face where they're going,
 * and tips over when they're down.
 *
 * Rings on the turf: gold under the carrier; under each receiver before the
 * catch, green when no defender could reach a ball landing on it, red when
 * one could; and a purple ring around every Scarecrow (and Bat) showing how
 * far its arms reach for the ball, until someone catches it.
 */
import * as THREE from 'three';
import { common, hexToNumber, team } from '../../content/palettes';
import { DEFENDERS } from '../content/defense';
import { getGeometry, modelHeight, voxelMaterial } from '../../voxel/models';
import type { Body, DefenderKind, Form, Player, Role, RunState } from '../sim/types';
import { dist } from '../sim/vec';
import { toWorld } from './world';

const DEFENDER_MODEL: Readonly<Record<DefenderKind, string>> = {
  rusher: 'forest/blitzer',
  cover: 'forest/chaser',
  zone: 'forest/waller',
  safety: 'forest/safety',
  bat: 'forest/picker',
};

/** Placeholder role silhouettes: the walk-on, stretched (x/z wide, y tall). */
const ROLE_SHAPE: Readonly<Record<Role, { readonly wide: number; readonly tall: number }>> = {
  qb: { wide: 1, tall: 1 },
  blocker: { wide: 1.45, tall: 0.95 },
  runner: { wide: 0.9, tall: 0.95 },
  catcher: { wide: 0.85, tall: 1.25 },
};

const FORM_COLOR: Readonly<Record<Exclude<Form, 'human'>, number>> = {
  ghost: 0xf2f0ff,
  werewolf: 0x8a5a33,
  golem: 0x8c8f99,
};

const WALK_ON = 'team/walkOn';
const WALK_ON_HEIGHT = modelHeight(WALK_ON);
const OPEN = hexToNumber(common.slimeGreen);
const COVERED = hexToNumber(common.danger);
const CARRIER = hexToNumber(team.accent);
const COVERAGE = hexToNumber(common.candyPurple);

interface View {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
  readonly ring: THREE.Mesh;
  /** A Scarecrow's or Bat's reach for the ball, or null. */
  readonly reach: THREE.Mesh | null;
  yaw: number;
}

export class ArcadeBodies {
  private readonly views = new Map<number, View>();
  private readonly ringGeo = new THREE.RingGeometry(0.55, 0.7, 28).rotateX(-Math.PI / 2);
  /** A unit ring, scaled to each defender's reach. */
  private readonly reachGeo = new THREE.RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2);
  private readonly badgeGeo = new THREE.BoxGeometry(0.3, 0.24, 0.3);
  private readonly ringMats = new Map<number, THREE.MeshBasicMaterial>();
  private readonly badgeMats = new Map<number, THREE.MeshLambertMaterial>();

  constructor(private readonly scene: THREE.Scene) {}

  /** Make the views match the bodies on the field (a new down lines everyone up afresh). */
  sync(state: RunState): void {
    const bodies: Body[] = [...state.field.players, ...state.field.defenders];
    const ids = new Set(bodies.map((b) => b.id));
    for (const [id, v] of this.views) {
      if (ids.has(id)) continue;
      this.scene.remove(v.root, v.ring);
      if (v.reach) this.scene.remove(v.reach);
      this.views.delete(id);
    }
    for (const b of bodies) if (!this.views.has(b.id)) this.views.set(b.id, this.create(b));
  }

  /** `lit`: the receivers the sweeping line is over right now (render/sweep.ts). */
  update(state: RunState, origin: number, dt: number, lit: ReadonlySet<number> = new Set()): void {
    const carrierId = state.field.ball.at === 'carried' ? state.field.ball.by : null;
    const live = state.phase === 'play' || state.phase === 'setup';
    for (const b of [...state.field.players, ...state.field.defenders]) {
      const view = this.views.get(b.id);
      if (!view) continue;
      view.root.position.copy(toWorld(b.pos, origin));
      // Turn to face where it's going (models face +z), smoothly.
      if (Math.hypot(b.vel.x, b.vel.y) > 0.4) {
        const want = Math.atan2(b.vel.x, -b.vel.y);
        let d = want - view.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        view.yaw += d * Math.min(1, dt * 12);
      }
      view.root.rotation.y = view.yaw;
      view.body.rotation.z = b.down > 0 ? Math.PI / 2 : 0;
      // A little bob while running.
      const speed = Math.hypot(b.vel.x, b.vel.y);
      view.body.position.y =
        b.down > 0
          ? 0.2
          : Math.abs(Math.sin(state.time * 14 + b.id)) * Math.min(0.12, speed * 0.03);

      view.ring.position.set(view.root.position.x, 0.02, view.root.position.z);
      view.ring.scale.setScalar(1);
      if (view.reach && b.side === 'defense') {
        view.reach.visible = live && carrierId === null && b.down <= 0;
        view.reach.position.set(view.root.position.x, 0.015, view.root.position.z);
        view.reach.scale.setScalar(b.reach);
      }
      if (b.side === 'team' && b.id === carrierId) {
        view.ring.visible = true;
        view.ring.material = this.ringMat(CARRIER);
      } else if (b.side === 'team' && live && carrierId === null && b.job.kind === 'route') {
        view.ring.visible = true;
        // Lit up gold while the line is over it: that's the moment to throw.
        const isLit = lit.has(b.id);
        view.ring.material = this.ringMat(isLit ? CARRIER : open(state, b) ? OPEN : COVERED);
        view.ring.scale.setScalar(isLit ? 1.35 : 1);
      } else {
        view.ring.visible = false;
      }
    }
  }

  /** The world position of a body's head (for the carried ball). */
  headOf(id: number): THREE.Vector3 | null {
    const v = this.views.get(id);
    if (!v) return null;
    return v.root.position.clone().setY(WALK_ON_HEIGHT * v.body.scale.y + 0.15);
  }

  /** Everything drawn (for the crossfade between drives, render/crossfade.ts). */
  objects(): THREE.Object3D[] {
    return [...this.views.values()].flatMap((v) => [v.root, v.ring, ...(v.reach ? [v.reach] : [])]);
  }

  private create(b: Body): View {
    const model =
      b.side === 'defense' ? DEFENDER_MODEL[b.kind] : b.role === 'qb' ? 'team/qb' : WALK_ON;
    const body = new THREE.Mesh(getGeometry(model), voxelMaterial);
    body.castShadow = true;
    if (b.side === 'team') {
      const shape = ROLE_SHAPE[b.role];
      const golem = b.form === 'golem' ? 1.2 : 1;
      body.scale.set(shape.wide * golem, shape.tall * golem, shape.wide * golem);
      if (b.form !== 'human') {
        const badge = new THREE.Mesh(this.badgeGeo, this.badgeMat(FORM_COLOR[b.form]));
        badge.position.y = WALK_ON_HEIGHT + 0.12;
        body.add(badge);
      }
    }
    const root = new THREE.Group();
    root.add(body);
    const ring = new THREE.Mesh(this.ringGeo, this.ringMat(OPEN));
    ring.visible = false;
    this.scene.add(root, ring);
    const reach =
      b.side === 'defense' && DEFENDERS[b.kind].reachBonus > 0
        ? new THREE.Mesh(this.reachGeo, this.ringMat(COVERAGE))
        : null;
    if (reach) this.scene.add(reach);
    // Your team faces upfield, the defense faces you.
    return { root, body, ring, reach, yaw: b.side === 'team' ? Math.PI : 0 };
  }

  private ringMat(color: number): THREE.MeshBasicMaterial {
    let m = this.ringMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
      this.ringMats.set(color, m);
    }
    return m;
  }

  private badgeMat(color: number): THREE.MeshLambertMaterial {
    let m = this.badgeMats.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color });
      this.badgeMats.set(color, m);
    }
    return m;
  }
}

/** Open: no defender could reach a ball coming down on this player right now. */
function open(state: RunState, p: Player): boolean {
  return state.field.defenders.every((d) => d.down > 0 || dist(d.pos, p.pos) > d.reach + 0.5);
}
