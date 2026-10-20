/**
 * The sweeping aim line (GAMEPLAY.md, A Down): from the QB along the line's
 * angle, as far as a bullet would fly, as a row of dashes marching outward.
 * It shows only while the QB has the ball on a pass play.
 */
import * as THREE from 'three';
import { hexToNumber, team } from '../../content/palettes';
import { bulletEnd, sweepAngle } from '../sim/ball';
import { qbOf } from '../sim/ai';
import { canThrow } from '../sim/step';
import type { RunState } from '../sim/types';
import { dist, lerp } from '../sim/vec';
import { toWorld } from './world';

/** Yards between dashes. */
const SPACING = 0.9;
const MAX_DASHES = 48;

export class ArcadeSweep {
  private readonly group = new THREE.Group();
  private readonly dashes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.22, 0.05, 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: hexToNumber(team.accent),
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < MAX_DASHES; i++) {
      const d = new THREE.Mesh(geo, mat);
      this.dashes.push(d);
      this.group.add(d);
    }
    scene.add(this.group);
  }

  update(state: RunState, origin: number): void {
    const qb = qbOf(state);
    const show = canThrow(state) && qb !== null;
    this.group.visible = show;
    if (!show || !qb) return;
    const angle = sweepAngle(state);
    const end = bulletEnd(state, qb.pos, angle);
    const length = dist(qb.pos, end);
    const march = (state.time * 3) % SPACING;
    this.dashes.forEach((dash, i) => {
      const along = 1.2 + i * SPACING + march;
      dash.visible = along < length;
      if (!dash.visible) return;
      dash.position.copy(toWorld(lerp(qb.pos, end, along / length), origin, 0.05));
      dash.rotation.y = -angle;
    });
  }
}

/** The players the line is over right now (a bullet now would reach them): they light up. */
export function litPlayers(state: RunState): Set<number> {
  const lit = new Set<number>();
  const qb = qbOf(state);
  if (!qb || !canThrow(state)) return lit;
  const end = bulletEnd(state, qb.pos, sweepAngle(state));
  const dx = end.x - qb.pos.x;
  const dy = end.y - qb.pos.y;
  const len2 = dx * dx + dy * dy;
  for (const p of state.field.players) {
    if (p.role === 'qb' || p.job.kind !== 'route') continue;
    const t = Math.max(
      0,
      Math.min(1, ((p.pos.x - qb.pos.x) * dx + (p.pos.y - qb.pos.y) * dy) / len2),
    );
    const near = Math.hypot(qb.pos.x + dx * t - p.pos.x, qb.pos.y + dy * t - p.pos.y);
    if (near <= p.reach && dist(p.pos, qb.pos) >= 3) lit.add(p.id);
  }
  return lit;
}
