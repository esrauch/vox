/**
 * The play's routes, drawn on the turf before the snap (GAMEPLAY.md, A
 * Down): a dotted path from each receiver through its waypoints, with an
 * arrowhead where it's going. The Runner the play sends upfield gets one
 * too (tap it to run). Hidden from the snap on.
 */
import * as THREE from 'three';
import { hexToNumber, team } from '../../content/palettes';
import type { RunState, Vec } from '../sim/types';
import { dist, lerp } from '../sim/vec';
import { toWorld } from './world';

/** Yards between dots. */
const SPACING = 0.6;

export class ArcadeRoutes {
  private readonly group = new THREE.Group();
  private readonly dotGeo = new THREE.CircleGeometry(0.09, 10).rotateX(-Math.PI / 2);
  private readonly arrowGeo = new THREE.ConeGeometry(0.28, 0.6, 3).rotateX(-Math.PI / 2);
  private readonly pass = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  private readonly run = new THREE.MeshBasicMaterial({
    color: hexToNumber(team.accent),
    transparent: true,
    opacity: 0.9,
  });
  private key = '';

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(state: RunState, origin: number): void {
    const show = state.phase === 'setup';
    this.group.visible = show;
    if (!show) return;
    // Every down lines up with new ids, so they (and where the field is) say when to redraw.
    const key = `${origin}|${state.field.players.map((p) => p.id).join(',')}`;
    if (key === this.key) return;
    this.key = key;
    this.group.clear();
    for (const p of state.field.players) {
      if (p.job.kind !== 'route') continue;
      const material = p.role === 'runner' ? this.run : this.pass;
      const path: Vec[] = [p.pos, ...p.job.to];
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        if (!a || !b) continue;
        const n = Math.max(1, Math.floor(dist(a, b) / SPACING));
        for (let k = 1; k <= n; k++) {
          const dot = new THREE.Mesh(this.dotGeo, material);
          dot.position.copy(toWorld(lerp(a, b, k / n), origin, 0.03));
          this.group.add(dot);
        }
      }
      const end = path[path.length - 1];
      const before = path[path.length - 2];
      if (end && before) {
        const arrow = new THREE.Mesh(this.arrowGeo, material);
        arrow.position.copy(toWorld(end, origin, 0.04));
        // The cone points along -z in world when unrotated; turn it to the last leg's direction.
        arrow.rotation.y = Math.atan2(-(end.x - before.x), end.y - before.y);
        this.group.add(arrow);
      }
    }
  }
}
