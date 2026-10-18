/**
 * Per-tick decisions (GAMEPLAY.md, The Defense). Every unit's intent is
 * decided one tick ahead, so it always shows where it's about to hop.
 *
 * - Your players run their card's route, one move per hop; the carrier runs
 *   straight up the field.
 * - Defenders do their job (content/defenders.ts). Once the ball is caught,
 *   every defender that moves chases the carrier, except planted Zones and
 *   patrolling Bats.
 */
import { DEFENDERS } from '../content/defenders';
import type { Move } from '../content/cards';
import { END_ROW, eq, inBounds, stepToward, vec } from './grid';
import type { Defender, PlayerUnit, ScreenState, Vec } from './types';

export function updateIntents(screen: ScreenState): void {
  const carrierId = screen.ball.at === 'carried' ? screen.ball.by : null;
  for (const p of screen.players) p.intent = playerIntent(p, p.id === carrierId);
  for (const d of screen.defenders) {
    const intent = defenderIntent(d, screen);
    d.intent = intent && !eq(intent, screen.qb) && !eq(intent, d.pos) ? intent : null;
  }
}

/** The carrier runs straight up; everyone else takes the next move of its route. */
function playerIntent(p: PlayerUnit, carrying: boolean): Vec | null {
  if (carrying) return p.pos.y < END_ROW ? vec(p.pos.x, p.pos.y + 1) : null;
  const move = p.route[p.routeStep] as Move | undefined;
  const to = move ? moveTile(p.pos, move) : null;
  return to && inBounds(to) ? to : null;
}

function moveTile(from: Vec, move: Move): Vec | null {
  switch (move) {
    case 'U':
      return vec(from.x, from.y + 1);
    case 'D':
      return vec(from.x, from.y - 1);
    case 'L':
      return vec(from.x - 1, from.y);
    case 'R':
      return vec(from.x + 1, from.y);
    case '.':
      return null;
  }
}

function defenderIntent(d: Defender, screen: ScreenState): Vec | null {
  const job = DEFENDERS[d.kind].job;
  if (job === 'zone') return null;
  if (job === 'patrol') return patrolNext(d);
  const carrier = carrierOf(screen);
  if (job === 'safety') return safetyIntent(d, screen, carrier);
  if (carrier) return stepToward(d.pos, carrier.pos);
  switch (job) {
    case 'cover': {
      // Man coverage, one tick behind: it heads for where its receiver is now,
      // so by the time it gets there the receiver has moved on.
      const mark = screen.players.find((p) => p.id === d.marking);
      return mark ? stepToward(d.pos, mark.pos) : null;
    }

    default:
      return null;
  }
}

/**
 * The Safety is the last line between the ball and the first-down line, so it
 * always gets into the right column first and only then comes down:
 * - with a carrier still in front of it: across to the carrier's column, then
 *   down to meet it (a carrier that's already past it is just chased);
 * - with the ball in the air: across to the column it will land in, holding its row;
 * - otherwise: holding its row, level with your deepest receiver.
 */
function safetyIntent(d: Defender, screen: ScreenState, carrier: PlayerUnit | null): Vec | null {
  const across = (x: number): Vec | null =>
    x === d.pos.x ? null : vec(d.pos.x + Math.sign(x - d.pos.x), d.pos.y);
  if (carrier) {
    if (carrier.pos.y > d.pos.y) return stepToward(d.pos, carrier.pos);
    return across(carrier.pos.x) ?? stepToward(d.pos, carrier.pos);
  }
  const { ball } = screen;
  if (ball.at === 'flight') return across(Math.round(ball.target.x));
  const deepest = [...screen.players].sort((a, b) => b.pos.y - a.pos.y || a.id - b.id)[0];
  return deepest ? across(deepest.pos.x) : null;
}

function carrierOf(screen: ScreenState): PlayerUnit | null {
  const { ball } = screen;
  if (ball.at !== 'carried') return null;
  return screen.players.find((p) => p.id === ball.by) ?? null;
}

/** The next tile of a defender's patrol circuit. */
export function patrolNext(d: Defender): Vec | null {
  if (!d.patrol || d.patrol.length === 0) return null;
  return d.patrol[(d.patrolIndex + 1) % d.patrol.length] ?? null;
}

/**
 * At the snap, each Cover picks a receiver to mark: the nearest one nobody
 * else is marking yet (Covers choose in id order).
 */
export function assignMarks(screen: ScreenState): void {
  const taken = new Set<number>();
  for (const d of [...screen.defenders].sort((a, b) => a.id - b.id)) {
    if (DEFENDERS[d.kind].job !== 'cover') continue;
    const mark = screen.players
      .filter((p) => !taken.has(p.id))
      .sort(
        (a, b) =>
          Math.hypot(a.pos.x - d.pos.x, a.pos.y - d.pos.y) -
            Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) || a.id - b.id,
      )[0];
    d.marking = mark?.id ?? null;
    if (mark) taken.add(mark.id);
  }
}
