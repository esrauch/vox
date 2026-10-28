/**
 * The sweeping aim line (GAMEPLAY.md, A Down): from the QB along the line's
 * angle, as a row of dashes marching outward, stopping where a bullet thrown
 * now would first be caught or batted down (everyone where they stand: it
 * doesn't look ahead in time), or at the bullet's range. The receiver it
 * stops on lights up. It shows only while the QB has the ball on a pass play.
 */
import * as THREE from 'three';
import { hexToNumber, team } from '../../content/palettes';
import { aimContact, bulletEnd, contact, lobTarget, sweepAngle } from '../sim/ball';
import { arcadeTuning } from '../content/tuning';
import { qbOf } from '../sim/ai';
import { canThrow } from '../sim/step';
import type { RunState, Vec } from '../sim/types';
import { dist, lerp, sub, v } from '../sim/vec';
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
    // The line stops where a bullet thrown now would first be caught or batted (or at its range).
    // Two-tap throwing: it runs its full range while it sweeps, and once stopped, out to the marker.
    const full = bulletEnd(state, qb.pos, angle);
    const end = state.twoTapAim ? (lobTarget(state, qb.pos) ?? full) : (aimNow(state)?.at ?? full);
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

/** What a bullet thrown now would meet first (aimContact), or null when there's no throw to make. */
export function aimNow(state: RunState): ReturnType<typeof aimContact> | null {
  const qb = qbOf(state);
  if (!qb || !canThrow(state)) return null;
  return aimContact(state, qb.pos, bulletEnd(state, qb.pos, sweepAngle(state)));
}

/**
 * The receiver who'd catch a bullet thrown right now, with everyone where
 * they stand: it lights up. Two-tap throwing: while the line sweeps, every
 * receiver it passes within reach of; once it's stopped, whoever would catch
 * a lob coming down at the marker.
 */
export function litPlayers(state: RunState): Set<number> {
  const qb = qbOf(state);
  if (state.twoTapAim && qb && canThrow(state)) {
    const target = lobTarget(state, qb.pos);
    if (target) {
      const r = contact(state, qb.pos, target, true, target);
      return new Set(r?.kind === 'caught' ? [r.by.id] : []);
    }
    const end = bulletEnd(state, qb.pos, sweepAngle(state));
    return new Set(
      state.field.players
        .filter(
          (p) =>
            (p.role === 'catcher' || p.role === 'runner') &&
            p.down <= 0 &&
            dist(p.pos, qb.pos) >= arcadeTuning.throw.minDistance &&
            dist(p.pos, nearestOnSegment(qb.pos, end, p.pos)) <= p.reach,
        )
        .map((p) => p.id),
    );
  }
  const aim = aimNow(state);
  return new Set(aim?.outcome.kind === 'caught' ? [aim.outcome.by.id] : []);
}

/** The point on the segment from `a` to `b` nearest `p`. */
function nearestOnSegment(a: Vec, b: Vec, p: Vec): Vec {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 === 0) return a;
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2));
  return v(a.x + ab.x * u, a.y + ab.y * u);
}
