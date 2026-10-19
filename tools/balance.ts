/**
 * Headless balance runs: plays thousands of runs straight through the sim
 * (no rendering, no audio, no browser) with a simple bot, and reports how
 * far teams get and how the checks come out. For comparing builds and
 * tuning numbers, not for absolute difficulty: the bot plays worse than a
 * good player.
 *
 *   npx tsx tools/balance.ts [runs per scenario]
 *
 * The bot calls a random play (and a random Flip), then throws to the
 * receiver with the best catch odds, leading it along its route, with some
 * aim error. It throws once someone is likely to catch it, or anyway just
 * before the pocket collapses.
 */
import { playCard } from '../src/content/cards';
import { MONSTERS } from '../src/content/roster';
import { catchChance } from '../src/sim/coverage';
import { DRIVE_KINDS } from '../src/sim/drive';
import { flightTicks } from '../src/sim/flight';
import { COLS, END_ROW, vec } from '../src/sim/grid';
import { createRng, deriveSeed, type Rng } from '../src/sim/rng';
import { teamHand } from '../src/sim/roster';
import { createRun, dispatch } from '../src/sim/run';
import { step, throwProblem } from '../src/sim/step';
import type { Form, PlayerUnit, RunState, SimEvent, Vec } from '../src/sim/types';

const RUNS = Number(process.argv[2]) || 200;
/** Throw once the best receiver's odds are at least this. */
const THROW_AT = 0.75;
/** How far off the bot's aim can be (tiles, each way). */
const AIM_ERROR = 0.45;

type DraftPolicy = 'skip' | 'train' | 'mash' | 'four';

interface Scenario {
  readonly name: string;
  /** The roster's forms at the start (default: four humans). */
  readonly forms?: readonly Form[];
  readonly draft: DraftPolicy;
}

const SCENARIOS: readonly Scenario[] = [
  { name: 'Four humans, skip every draft', draft: 'skip' },
  { name: 'Humans, always train', draft: 'train' },
  { name: 'Drafting toward a Monster Mash', draft: 'mash' },
  { name: 'Drafting toward Four of a Kind', draft: 'four' },
  {
    name: 'Monster Mash from the start',
    forms: ['human', 'ghost', 'werewolf', 'golem'],
    draft: 'skip',
  },
  {
    name: 'Four Ghosts from the start',
    forms: ['ghost', 'ghost', 'ghost', 'ghost'],
    draft: 'skip',
  },
  {
    name: 'Four Werewolves from the start',
    forms: ['werewolf', 'werewolf', 'werewolf', 'werewolf'],
    draft: 'skip',
  },
  {
    name: 'Four Golems from the start',
    forms: ['golem', 'golem', 'golem', 'golem'],
    draft: 'skip',
  },
];

interface Tally {
  runs: number;
  drivesWon: number;
  fullWins: number;
  /** Drive attempts and wins by "area:kind". */
  attempts: Map<string, number>;
  wins: Map<string, number>;
  passes: number;
  completions: number;
  downs: number;
  yards: number;
  /** Check outcomes, from the events. */
  carrierShakes: number;
  contacts: number;
  breaks: number;
  breakTries: number;
  contestedWon: number;
  contestedTries: number;
  markShakes: number;
  hands: Map<string, number>;
}

function newTally(): Tally {
  return {
    runs: 0,
    drivesWon: 0,
    fullWins: 0,
    attempts: new Map(),
    wins: new Map(),
    passes: 0,
    completions: 0,
    downs: 0,
    yards: 0,
    carrierShakes: 0,
    contacts: 0,
    breaks: 0,
    breakTries: 0,
    contestedWon: 0,
    contestedTries: 0,
    markShakes: 0,
    hands: new Map(),
  };
}

const bump = (m: Map<string, number>, k: string, by = 1): void => {
  m.set(k, (m.get(k) ?? 0) + by);
};

/** Where a player will be after `ticks` more hops along its route (the carrier isn't asked). */
function futurePos(p: PlayerUnit, ticks: number): Vec {
  let { x, y } = p.pos;
  for (let i = 0; i < ticks; i++) {
    const move = p.route[p.routeStep + i];
    if (move === 'U') y++;
    else if (move === 'D') y--;
    else if (move === 'L') x--;
    else if (move === 'R') x++;
  }
  return vec(Math.max(0, Math.min(COLS - 1, x)), Math.max(0, Math.min(END_ROW, y)));
}

/** The bot's throw this tick, if any. */
function botThrow(state: RunState, rng: Rng): Vec | null {
  const { screen, pocket } = state;
  if (state.phase !== 'play' || screen.ball.at !== 'qb' || state.downTick < 1) return null;
  let best: { target: Vec; odds: number } | null = null;
  for (const p of screen.players) {
    if (/^[.]*$/.test(p.route)) continue;
    // Lead it: where it will be when a ball thrown now comes down.
    const ticks = flightTicks(screen.qb, futurePos(p, flightTicks(screen.qb, p.pos))) + 1;
    const target = futurePos(p, ticks);
    if (throwProblem(state, target)) continue;
    const odds = catchChance(state, { ...p, pos: target });
    // Prefer deeper targets among equal odds: yards matter.
    const score = odds + target.y * 0.001;
    if (!best || score > best.odds) best = { target, odds: score };
  }
  if (!best) return null;
  const late = pocket !== null && pocket.left <= 2;
  if (best.odds < THROW_AT && !late) return null;
  const err = (): number => (rng.next() * 2 - 1) * AIM_ERROR;
  return { x: best.target.x + err(), y: best.target.y + err() };
}

function draftPick(state: RunState, policy: DraftPolicy): number | null {
  const { offer, roster } = state;
  const train = offer.findIndex((o) => o.kind === 'train');
  const transform = offer.findIndex((o) => o.kind === 'transform');
  const t = offer[transform];
  switch (policy) {
    case 'skip':
      return null;
    case 'train':
      return train >= 0 ? train : null;
    case 'mash': {
      // Take a monster the team doesn't have yet, while keeping one human.
      const humans = roster.filter((p) => p.form === 'human').length;
      const fits = t?.kind === 'transform' && !roster.some((p) => p.form === t.form) && humans > 1;
      return fits ? transform : train >= 0 ? train : null;
    }
    case 'four': {
      // Commit to the first monster offered, and take only that one.
      const monster = roster.find((p) => p.form !== 'human')?.form;
      const fits = t?.kind === 'transform' && (!monster || t.form === monster);
      return fits ? transform : train >= 0 ? train : null;
    }
  }
}

function countEvents(t: Tally, prev: RunState, events: readonly SimEvent[]): void {
  const carrierId = prev.screen.ball.at === 'carried' ? prev.screen.ball.by : null;
  for (const e of events) {
    switch (e.type) {
      case 'thrown':
        t.passes++;
        break;
      case 'caught':
        t.completions++;
        if (e.contested) {
          t.contestedWon++;
          t.contestedTries++;
        }
        break;
      case 'dropped':
        t.contestedTries++;
        break;
      case 'shook':
        if (e.id === carrierId) {
          t.carrierShakes++;
          t.contacts++;
        } else t.markShakes++;
        break;
      case 'brokeTackle':
        t.contacts++;
        t.breaks++;
        t.breakTries++;
        break;
      case 'tackled':
        t.contacts++;
        t.breakTries++;
        break;
      case 'downEnded':
        t.downs++;
        t.yards += e.gained;
        break;
      default:
        break;
    }
  }
}

function playRun(seed: number, scenario: Scenario, t: Tally): void {
  const rng = createRng(deriveSeed(seed, 'bot'));
  let state = createRun(seed);
  scenario.forms?.forEach((f, i) => {
    const p = state.roster[i];
    if (p) p.form = f;
  });
  let driveKey = '';
  const apply = (r: { state: RunState; events: SimEvent[] }, prev: RunState): void => {
    countEvents(t, prev, r.events);
    state = r.state;
  };
  for (let guard = 0; guard < 20000 && state.phase !== 'over' && state.phase !== 'won'; guard++) {
    const key = `${state.drive.area}:${state.drive.kind}`;
    if (state.phase === 'setup' && key !== driveKey) {
      driveKey = key;
      bump(t.attempts, key);
      const hand = teamHand(state.roster);
      bump(t.hands, hand ? (hand.kind === 'mash' ? 'Monster Mash' : `Four ${hand.form}s`) : 'none');
    }
    if (state.phase === 'setup') {
      const prev = state;
      apply(dispatch(state, { type: 'call', hand: rng.int(0, state.deck.hand.length - 1) }), prev);
      if (rng.next() < 0.5) apply(dispatch(state, { type: 'flip' }), state);
      apply(dispatch(state, { type: 'hike' }), state);
      continue;
    }
    if (state.phase === 'draft') {
      const pick = draftPick(state, scenario.draft);
      apply(
        dispatch(state, pick === null ? { type: 'skipDraft' } : { type: 'draft', offer: pick }),
        state,
      );
      continue;
    }
    const throwAt = botThrow(state, rng);
    const prev = state;
    const r = step(state, throwAt ? { throwAt } : {});
    if (r.events.some((e) => e.type === 'driveWon')) bump(t.wins, key);
    apply(r, prev);
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
      `completions ${pct(t.completions, t.passes)} · yards/down ${(t.yards / 2 / t.downs).toFixed(1)}`,
  );
  console.log(
    `  checks: catch (contested) ${pct(t.contestedWon, t.contestedTries)} of ${t.contestedTries} · ` +
      `carrier shake ${pct(t.carrierShakes, t.contacts)} · break ${pct(t.breaks, t.breakTries)} · ` +
      `marks shaken ${(t.markShakes / t.runs).toFixed(1)}/run`,
  );
  const rows = [0, 1, 2].map((area) =>
    DRIVE_KINDS.map((k) => {
      const key = `${area}:${k}`;
      return `${k.padEnd(9)} ${pct(t.wins.get(key) ?? 0, t.attempts.get(key) ?? 0)} (${t.attempts.get(key) ?? 0})`;
    }).join('  '),
  );
  rows.forEach((r, i) => console.log(`  area ${['I  ', 'II ', 'III'][i]}  ${r}`));
  const hands = [...t.hands.entries()].map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`  team hand at drive starts: ${hands}`);
}

console.log(
  `Balance runs: ${RUNS} per scenario. Plays: ${['run', 'slant', 'out', 'go', 'screen', 'mesh'].map((id) => playCard(id).name).join(', ')}. Monsters: ${MONSTERS.join(', ')}.`,
);
for (const scenario of SCENARIOS) {
  const t = newTally();
  for (let seed = 1; seed <= RUNS; seed++) playRun(seed, scenario, t);
  report(scenario, t);
}
