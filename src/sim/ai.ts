/**
 * Per-beat decisions (GAMEPLAY.md, What's in the Way). Every unit's intent is
 * decided one beat ahead, so it always faces where it's about to hop.
 */
import { BIG_POS, END_ROW, POCKET, dist, eq, stepToward, vec } from './grid';
import type { Defender, ScreenState, SmallUnit, Vec } from './types';

const isActive = (u: { alive: boolean; downBeats: number }): boolean =>
  u.alive && u.downBeats === 0;

export function updateIntents(screen: ScreenState): void {
  for (const s of screen.smalls) s.intent = s.alive ? smallIntent(s) : null;
  for (const d of screen.defenders) {
    const intent = d.alive ? defenderIntent(d, screen) : null;
    d.intent = intent && !eq(intent, BIG_POS) && !eq(intent, d.pos) ? intent : null;
  }
}

/** Walk-ons are dumb: runners hop straight up their column, even into danger. Blockers stay put. */
function smallIntent(s: SmallUnit): Vec | null {
  if (s.role === 'blocker' || s.pos.y >= END_ROW) return null;
  return vec(s.pos.x, s.pos.y + 1);
}

function defenderIntent(d: Defender, screen: ScreenState): Vec | null {
  switch (d.kind) {
    case 'chaser': {
      const target = chaseTarget(d, screen);
      return target ? stepToward(d.pos, target) : null;
    }
    case 'blitzer': {
      if (d.engaged) return null;
      return stepToward(d.pos, blitzTarget());
    }
    case 'waller': {
      const target = wallTarget(d, screen);
      return target ? stepToward(d.pos, target) : null;
    }
    case 'picker':
      return stepToward(d.pos, screen.ball.at === 'flight' ? screen.ball.target : d.home);
  }
}

/** Chasers go for the carrier, then the ball's landing tile, then the nearest runner. */
function chaseTarget(d: Defender, screen: ScreenState): Vec | null {
  const { ball } = screen;
  if (ball.at === 'carried') {
    const carrier = screen.smalls.find((s) => s.id === ball.by);
    if (carrier?.alive) return carrier.pos;
  }
  if (ball.at === 'flight') return ball.target;
  return nearest(
    d.pos,
    screen.smalls.filter((s) => isActive(s) && s.role === 'runner'),
  );
}

/** Blitzers always head for the pocket, so they have to go through the Blocker standing in it. */
function blitzTarget(): Vec {
  return POCKET;
}

/** Wall-ers hold their row and slide into the column of the nearest Small coming their way. */
function wallTarget(d: Defender, screen: ScreenState): Vec | null {
  const below = screen.smalls.filter((s) => isActive(s) && s.pos.y < d.home.y);
  if (below.length === 0) return null;
  const target = [...below].sort(
    (a, b) =>
      d.home.y - a.pos.y - (d.home.y - b.pos.y) ||
      Math.abs(a.pos.x - d.pos.x) - Math.abs(b.pos.x - d.pos.x) ||
      a.id - b.id,
  )[0] as SmallUnit;
  return vec(target.pos.x, d.home.y);
}

function nearest(from: Vec, units: readonly SmallUnit[]): Vec | null {
  const best = [...units].sort((a, b) => dist(from, a.pos) - dist(from, b.pos) || a.id - b.id)[0];
  return best ? best.pos : null;
}
