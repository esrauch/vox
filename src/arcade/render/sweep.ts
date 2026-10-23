/**
 * The sweeping aim line (GAMEPLAY.md, A Down): from the QB along the line's
 * angle, as a row of dashes marching outward, stopping where a bullet thrown
 * now would first be caught or batted down (everyone where they stand: it
 * doesn't look ahead in time), or at the bullet's range. The receiver it
 * stops on lights up. It shows only while the QB has the ball on a pass play.
 * The Queen's Hex cuts it to a short purple stub, and nobody lights up.
 */
import * as THREE from 'three';
import { common, hexToNumber, team } from '../../content/palettes';
import { arcadeTuning } from '../content/tuning';
import { aimContact, bulletEnd, sweepAngle } from '../sim/ball';
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
  private readonly material = new THREE.MeshBasicMaterial({
    color: hexToNumber(team.accent),
    transparent: true,
    opacity: 0.9,
  });

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.22, 0.05, 0.5);
    for (let i = 0; i < MAX_DASHES; i++) {
      const d = new THREE.Mesh(geo, this.material);
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
    // The line stops where a bullet thrown now would first be caught or batted (or at its range);
    // under the Queen's Hex it's only a short purple stub, and you judge the rest yourself.
    const full = aimNow(state)?.at ?? bulletEnd(state, qb.pos, angle);
    const hexed = state.field.hex;
    const end = hexed
      ? lerp(qb.pos, full, Math.min(1, arcadeTuning.hex.stub / Math.max(1e-6, dist(qb.pos, full))))
      : full;
    const length = dist(qb.pos, end);
    this.material.color.set(hexToNumber(hexed ? common.candyPurple : team.accent));
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

/** What a bullet thrown now would meet first (aimContact), or null when there's no throw to make. */
export function aimNow(state: RunState): ReturnType<typeof aimContact> | null {
  const qb = qbOf(state);
  if (!qb || !canThrow(state)) return null;
  return aimContact(state, qb.pos, bulletEnd(state, qb.pos, sweepAngle(state)));
}

/** The receiver who'd catch a bullet thrown right now, with everyone where they stand: it lights up. */
export function litPlayers(state: RunState): Set<number> {
  // The Queen's Hex hides it.
  if (state.field.hex) return new Set();
  const aim = aimNow(state);
  return new Set(aim?.outcome.kind === 'caught' ? [aim.outcome.by.id] : []);
}
