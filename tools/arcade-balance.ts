/**
 * Headless balance runs for the arcade sim (src/arcade): plays whole runs
 * straight through the simulation (no rendering, no audio, no browser) with
 * a bot, and reports how far teams get, how downs end and how long they
 * take. For comparing team builds and tuning numbers, not for absolute
 * difficulty: the bot isn't a good player.
 *
 *   npm run balance:arcade [runs per scenario]
 *
 * The bot snaps at once and throws to the receiver with the most room where
 * the ball will come down (leading it, with some aim error), as soon as one
 * is clear, when a rusher gets close, or after a few seconds. Carrying, it
 * swipes away from the defender in its lane and away from the sideline.
 * There are no upgrades yet: each scenario fixes the team's forms.
 */
import { arcadeTuning } from '../src/arcade/content/tuning';
import { carrierOf, qbOf } from '../src/arcade/sim/ai';
import { flightTime } from '../src/arcade/sim/ball';
import { DRIVE_KINDS, createRun, dispatch, startingRoster } from '../src/arcade/sim/run';
import { rngFor } from '../src/arcade/sim/random';
import { step, throwProblem } from '../src/arcade/sim/step';
import type { ArcadeEvent, Form, Role, RunState, StepInput, Vec } from '../src/arcade/sim/types';
import { add, dist, scale, v } from '../src/arcade/sim/vec';
import type { Rng } from '../src/sim/rng';

const RUNS = Number(process.argv[2]) || 200;
/** Throw once the best receiver has this much room beyond any defender's reach (yards). */
const CLEAR = 1.0;
/** Throw anyway after this long, or with a rusher this close to the QB. */
const HOLD = 3.5;
const PRESSURE = 2.5;
const AIM_ERROR = 0.6;
const SWIPE_COOLDOWN = 0.25;

interface Scenario {
  readonly name: string;
  /** Forms by role (default: all human). */
  readonly forms?: Partial<Record<Role, Form>>;
  /** Training added to every player's stats. */
  readonly training?: number;
}

const SCENARIOS: readonly Scenario[] = [
  { name: 'All human (never upgrade)' },
  { name: 'Trained: +1 to everything', training: 1 },
  { name: 'Golem Blockers', forms: { blocker: 'golem' } },
  { name: 'Werewolf Runners', forms: { runner: 'werewolf' } },
  { name: 'Ghost Catchers', forms: { catcher: 'ghost' } },
  { name: 'All three monsters', forms: { blocker: 'golem', runner: 'werewolf', catcher: 'ghost' } },
];

interface Tally {
  runs: number;
  drivesWon: number;
  fullWins: number;
  attempts: Map<string, number>;
  wins: Map<string, number>;
  downs: number;
  downTime: number;
  yards: number;
  results: Map<string, number>;
  passes: number;
  catches: number;
  contested: number;
  pancakes: number;
  breaks: number;
}

const bump = (m: Map<string, number>, k: string, by = 1): void => {
  m.set(k, (m.get(k) ?? 0) + by);
};

/** The bot's input this step. */
function botInput(state: RunState, rng: Rng, lastSwipe: { at: number }): StepInput {
  if (state.phase !== 'play') return {};
  const { field } = state;
  const qb = qbOf(state);
  const since = state.time - state.snappedAt;

  if (field.ball.at === 'qb' && qb && since > 0.4) {
    const receivers = field.players.filter((p) => p.job.kind === 'route' && p.down <= 0);
    let best: { target: Vec; room: number } | null = null;
    for (const p of receivers) {
      // Lead it: where it will be when the ball comes down.
      const ft = flightTime(qb.pos, add(p.pos, scale(p.vel, 0.6)));
      const target = add(p.pos, scale(p.vel, ft));
      if (throwProblem(state, target)) continue;
      const room = Math.min(
        ...field.defenders
          .filter((d) => d.down <= 0)
          .map((d) => dist(add(d.pos, scale(d.vel, ft)), target) - d.reach),
        99,
      );
      if (!best || room > best.room) best = { target, room };
    }
    const pressure = field.defenders.some((d) => d.down <= 0 && dist(d.pos, qb.pos) < PRESSURE);
    if (best && (best.room > CLEAR || pressure || since > HOLD)) {
      const err = (): number => (rng.next() * 2 - 1) * AIM_ERROR;
      return { throwAt: v(best.target.x + err(), best.target.y + err()) };
    }
    return {};
  }

  const carrier = carrierOf(state);
  if (carrier && state.time - lastSwipe.at > SWIPE_COOLDOWN) {
    const hw = arcadeTuning.field.halfWidth;
    if (field.lane > hw - 2) return swipe(-1, state, lastSwipe);
    if (field.lane < -hw + 2) return swipe(1, state, lastSwipe);
    const ahead = field.defenders
      .filter((d) => d.down <= 0 && d.pos.y > carrier.pos.y - 1 && d.pos.y < carrier.pos.y + 6)
      .filter((d) => Math.abs(d.pos.x - field.lane) < 1.8)
      .sort((a, b) => dist(a.pos, carrier.pos) - dist(b.pos, carrier.pos))[0];
    if (ahead) return swipe(ahead.pos.x > field.lane ? -1 : 1, state, lastSwipe);
  }
  return {};
}

function swipe(dir: -1 | 1, state: RunState, lastSwipe: { at: number }): StepInput {
  lastSwipe.at = state.time;
  return { steer: dir };
}

function count(t: Tally, events: readonly ArcadeEvent[], state: RunState): void {
  for (const e of events) {
    switch (e.type) {
      case 'thrown':
        t.passes++;
        break;
      case 'caught':
        t.catches++;
        if (e.contested) t.contested++;
        break;
      case 'pancake':
        t.pancakes++;
        break;
      case 'brokeTackle':
        t.breaks++;
        break;
      case 'downEnded':
        t.downs++;
        t.yards += e.gained;
        t.downTime += state.time - state.snappedAt;
        bump(t.results, e.result);
        break;
      default:
        break;
    }
  }
}

function playRun(seed: number, scenario: Scenario, t: Tally): void {
  const rng = rngFor(seed, 'bot');
  const train = scenario.training ?? 0;
  const roster = startingRoster().map((p) => ({
    ...p,
    form: scenario.forms?.[p.role] ?? p.form,
    training: { hustle: train, hands: train, heft: train },
  }));
  let state = createRun(seed, roster);
  const lastSwipe = { at: -1 };
  let driveKey = '';
  for (let guard = 0; guard < 200000 && state.phase !== 'over' && state.phase !== 'won'; guard++) {
    const key = `${state.drive.area}:${state.drive.kind}`;
    if (key !== driveKey) {
      driveKey = key;
      bump(t.attempts, key);
    }
    if (state.phase === 'draft') {
      state = dispatch(state, { type: 'skipDraft' }).state;
      continue;
    }
    if (state.phase === 'setup') {
      state = dispatch(state, { type: 'snap' }).state;
      continue;
    }
    const r = step(state, botInput(state, rng, lastSwipe));
    if (r.events.some((e) => e.type === 'driveWon')) bump(t.wins, key);
    count(t, r.events, state);
    state = r.state;
  }
  t.runs++;
  t.drivesWon += state.drivesWon;
  if (state.phase === 'won') t.fullWins++;
}

const pct = (a: number, b: number): string =>
  b === 0 ? '  —  ' : `${((100 * a) / b).toFixed(0).padStart(3)}%`;

function report(scenario: Scenario, t: Tally): void {
  console.log(`\n## ${scenario.name}  (${t.runs} runs)`);
  console.log(
    `  drives won ${(t.drivesWon / t.runs).toFixed(1)} of 12 · beat the game ${pct(t.fullWins, t.runs)} · ` +
      `yards/down ${(t.yards / t.downs).toFixed(1)} · down length ${(t.downTime / t.downs).toFixed(1)}s`,
  );
  const results = [...t.results.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${pct(n, t.downs)}`)
    .join(' · ');
  console.log(`  downs end: ${results}`);
  console.log(
    `  completions ${pct(t.catches, t.passes)} (contested ${pct(t.contested, t.catches)}) · ` +
      `pancakes ${(t.pancakes / t.runs).toFixed(1)}/run · broken tackles ${(t.breaks / t.runs).toFixed(1)}/run`,
  );
  [0, 1, 2].forEach((area) => {
    const row = DRIVE_KINDS.map((k) => {
      const key = `${area}:${k}`;
      return `${k.padEnd(9)} ${pct(t.wins.get(key) ?? 0, t.attempts.get(key) ?? 0)}`;
    }).join('  ');
    console.log(`  area ${['I  ', 'II ', 'III'][area]}  ${row}`);
  });
}

console.log(`Arcade balance runs: ${RUNS} per scenario.`);
for (const scenario of SCENARIOS) {
  const t: Tally = {
    runs: 0,
    drivesWon: 0,
    fullWins: 0,
    attempts: new Map(),
    wins: new Map(),
    downs: 0,
    downTime: 0,
    yards: 0,
    results: new Map(),
    passes: 0,
    catches: 0,
    contested: 0,
    pancakes: 0,
    breaks: 0,
  };
  for (let seed = 1; seed <= RUNS; seed++) playRun(seed, scenario, t);
  report(scenario, t);
}
