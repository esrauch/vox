import * as THREE from 'three';
import { hexToNumber, team } from '../content/palettes';
import { inBounds, vec } from '../sim/grid';
import type { RunState, Vec } from '../sim/types';
import { tileToWorld } from './view';

/** Dots per tile along a route. */
const DOTS_PER_TILE = 3;

/**
 * The called play's routes, drawn on the turf before the snap (GAMEPLAY.md,
 * A Down): a dotted path from each player along every move of its route,
 * with a bigger dot where it ends up. Hidden once the ball is snapped.
 */
export class RoutePreview {
  private readonly group = new THREE.Group();
  private readonly dotGeo = new THREE.CircleGeometry(0.06, 10).rotateX(-Math.PI / 2);
  private readonly endGeo = new THREE.CircleGeometry(0.14, 14).rotateX(-Math.PI / 2);
  private readonly material = new THREE.MeshBasicMaterial({
    color: hexToNumber(team.accent),
    transparent: true,
    opacity: 0.85,
  });
  private key = '';

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(state: RunState): void {
    const show = state.phase === 'setup' && state.called !== null;
    this.group.visible = show;
    const players = show ? state.screen.players : [];
    const key = players.map((p) => `${p.id}:${p.pos.x},${p.pos.y}:${p.route}`).join('|');
    if (key === this.key) return;
    this.key = key;
    this.group.clear();
    for (const p of players) {
      const path = routePath(p.pos, p.route);
      for (let i = 1; i < path.length; i++) {
        const a = tileToWorld(path[i - 1] as Vec, 0.03);
        const b = tileToWorld(path[i] as Vec, 0.03);
        for (let d = 1; d <= DOTS_PER_TILE; d++) {
          const dot = new THREE.Mesh(this.dotGeo, this.material);
          dot.position.lerpVectors(a, b, d / DOTS_PER_TILE);
          this.group.add(dot);
        }
      }
      const end = new THREE.Mesh(this.endGeo, this.material);
      end.position.copy(tileToWorld(path[path.length - 1] as Vec, 0.03));
      this.group.add(end);
    }
  }
}

/** The tiles a route visits, starting where the player lines up (it stops at the field's edge). */
function routePath(from: Vec, route: string): Vec[] {
  const path = [from];
  let at = from;
  for (const m of route) {
    const next =
      m === 'U'
        ? vec(at.x, at.y + 1)
        : m === 'D'
          ? vec(at.x, at.y - 1)
          : m === 'L'
            ? vec(at.x - 1, at.y)
            : m === 'R'
              ? vec(at.x + 1, at.y)
              : at;
    if (!inBounds(next)) break;
    if (next !== at) path.push(next);
    at = next;
  }
  return path;
}
