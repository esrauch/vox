/**
 * Per-beat decisions (GAMEPLAY.md, What's in the Way). Every unit's intent is
 * decided one beat ahead, so it always faces where it's about to hop.
 */
import { QB_POS, END_ROW, dist, eq, stepToward, vec } from './grid';
import type { Defender, ScreenState, PlayerUnit, Vec } from './types';

const isActive = (u: { alive: boolean; downBeats: number }): boolean =>
  u.alive && u.downBeats === 0;

export function updateIntents(screen: ScreenState): void {
  for (const s of screen.players) s.intent = s.alive ? playerIntent(s) : null;
  for (const d of screen.defenders) {
    const intent = d.alive ? defenderIntent(d, screen) : null;
    d.intent = intent && !eq(intent, QB_POS) && !eq(intent, d.pos) ? intent : null;
  }
}

/** Walk-ons are dumb: they hop straight up their column, even into danger. */
function playerIntent(s: PlayerUnit): Vec | null {
  if (s.pos.y >= END_ROW) return null;
  return vec(s.pos.x, s.pos.y + 1);
}

function defenderIntent(d: Defender, screen: ScreenState): Vec | null {
  switch (d.kind) {
    case 'chaser': {
      const target = chaseTarget(d, screen);
      return target ? stepToward(d.pos, target) : null;
    }
    case 'blitzer': {
      // Blitzers go straight for the QB. Reaching it (while it holds the ball) is a sack.
      return stepToward(d.pos, QB_POS);
    }
    case 'waller': {
      const target = wallTarget(d, screen);
      return target ? stepToward(d.pos, target) : null;
    }
    case 'picker':
      // A Picker (the Bat) loops its box circuit, whatever the ball does: a
      // pattern you learn, and it picks off any pass that comes down under it.
      return patrolNext(d);
  }
}

/** Chasers go for the carrier, then the ball's landing tile, then the nearest runner. */
function chaseTarget(d: Defender, screen: ScreenState): Vec | null {
  const { ball } = screen;
  if (ball.at === 'carried') {
    const carrier = screen.players.find((s) => s.id === ball.by);
    if (carrier?.alive) return carrier.pos;
  }
  if (ball.at === 'flight') return landingTile(ball.target);
  return nearest(d.pos, screen.players.filter(isActive));
}

/** Wall-ers hold their row and slide into the column of the nearest player coming their way. */
function wallTarget(d: Defender, screen: ScreenState): Vec | null {
  const below = screen.players.filter((s) => isActive(s) && s.pos.y < d.home.y);
  if (below.length === 0) return null;
  const target = [...below].sort(
    (a, b) =>
      d.home.y - a.pos.y - (d.home.y - b.pos.y) ||
      Math.abs(a.pos.x - d.pos.x) - Math.abs(b.pos.x - d.pos.x) ||
      a.id - b.id,
  )[0] as PlayerUnit;
  return vec(target.pos.x, d.home.y);
}

function nearest(from: Vec, units: readonly PlayerUnit[]): Vec | null {
  const best = [...units].sort((a, b) => dist(from, a.pos) - dist(from, b.pos) || a.id - b.id)[0];
  return best ? best.pos : null;
}

/** Throws land on free points; defenders head for the tile the ball comes down on. */
function landingTile(target: Vec): Vec {
  return vec(Math.round(target.x), Math.round(target.y));
}

/** The next tile of a defender's patrol circuit. */
export function patrolNext(d: Defender): Vec | null {
  if (!d.patrol || d.patrol.length === 0) return null;
  return d.patrol[(d.patrolIndex + 1) % d.patrol.length] ?? null;
}
