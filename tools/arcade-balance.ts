/**
 * Headless balance runs for the arcade sim (src/arcade): plays whole runs
 * straight through the simulation (no rendering, no audio, no browser) with
 * a bot, and reports how far teams get, how downs end and how long they
 * take. For comparing team builds and tuning numbers, not for absolute
 * difficulty: the bot isn't a good player.
 *
 *   npm run balance:arcade [runs per scenario]
 *
 * The bot plays the timing game like a fair, not great, player: it calls a
 * random card of the three (Flip half the time). On a pass it throws when a
 * bullet fired right now would be caught, reacting only some of the time it
 * could; with the pocket nearly gone it runs half the time and throws the
 * other half. In Break it! it hits the bar's sweet spot BREAK_SKILL of the
 * time (tapping at random otherwise), mashes at about 8 taps a second, and
 * jukes the right way 90% of the time, 0.3 s after the arrow shows. There are no upgrades yet: each scenario fixes
 * the team's forms.
 */
import { qbOf } from '../src/arcade/sim/ai';
import { bulletEnd, contact, pocketTime, sweepAngle } from '../src/arcade/sim/ball';
import { DRIVE_KINDS, createRun, dispatch, startingRoster } from '../src/arcade/sim/run';
import { FORM_STATS, ROSTER_ROLES } from '../src/arcade/content/team';
import { rngFor } from '../src/arcade/sim/random';
import { breakMarker, jukeShowing } from '../src/arcade/sim/breakit';
import { canThrow, step } from '../src/arcade/sim/step';
import type { ArcadeEvent, Form, Role, RunState, Stats, StepInput } from '../src/arcade/sim/types';
import { lerp } from '../src/arcade/sim/vec';
import type { Rng } from '../src/sim/rng';

const RUNS = Number(process.argv[2]) || 200;
/** Of the steps where a throw would be caught, the share it reacts on (a person isn't instant). */
const REACT = 0.25;
/** With this share of the pocket left, it gives up waiting: half the time it runs, half it throws anyway. */
const PANIC = 0.12;
/** How often it hits Break it!'s sweet spot (otherwise it taps at a random moment). */
const BREAK_SKILL = 0.6;
/** Mash: its chance of a tap each step (about 8 taps a second). */
const MASH_RATE = 8 / 60;
/** Juke: how long it takes to react to the arrow (seconds), and how often it picks the right side. */
const JUKE_REACTION = 0.3;
const JUKE_RIGHT = 0.9;

interface Scenario {
  readonly name: string;
  /** Forms by role (default: all human). */
  readonly forms?: Partial<Record<Role, Form>>;
  /** Training added to every player's stats… */
  readonly training?: Partial<Stats>;
  /** …or only to one role's. */
  readonly roleTraining?: Partial<Record<Role, Partial<Stats>>>;
  /** Take a random TRICK OR TREAT! perk after each won drive (otherwise skip). */
  readonly perks?: boolean;
}

/** BALANCE_SCENARIO='{"name": "...", ...}' runs just that one scenario instead. */
const custom = process.env.BALANCE_SCENARIO;
const SCENARIOS: readonly Scenario[] = custom
  ? [JSON.parse(custom) as Scenario]
  : [
      { name: 'All human (never upgrade)' },
      { name: 'Random TRICK OR TREAT! perks', perks: true },
      { name: 'Trained: +10 Hustle', training: { hustle: 10 } },
      { name: 'Trained: +10 Hands', training: { hands: 10 } },
      { name: 'Trained: +10 Heft', training: { heft: 10 } },
      { name: 'Golem Blockers', forms: { blocker: 'golem' } },
      { name: 'Werewolf Runners', forms: { runner: 'werewolf' } },
      { name: 'Ghost Catchers', forms: { catcher: 'ghost' } },
      {
        name: 'All three monsters',
        forms: { blocker: 'golem', runner: 'werewolf', catcher: 'ghost' },
      },
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
  handoffs: number;
  /** Yards and downs on handoffs, and on everything else. */
  run: { yards: number; downs: number };
  pass: { yards: number; downs: number };
  catches: number;
  contested: number;
  pancakes: number;
  grabs: number;
  drags: number;
  /** Passes batted down, by who did it. */
  battedBy: Map<string, number>;
  breaks: number;
}

const bump = (m: Map<string, number>, k: string, by = 1): void => {
  m.set(k, (m.get(k) ?? 0) + by);
};

/** Its plan for a Break it!: where on the meter it will tap. */
interface Plan {
  tackleAt: number;
  tapAt: number;
  /** Juke: when it saw the arrow, and which side it'll tap. */
  sawAt: number | null;
  side: -1 | 1;
}

/** Whether a bullet fired along the line right now would be caught (a quick look along its flight). */
function wouldCatch(state: RunState): boolean {
  const qb = qbOf(state);
  if (!qb) return false;
  const end = bulletEnd(state, qb.pos, sweepAngle(state));
  for (let u = 0.02; u <= 1.0001; u += 0.02) {
    const at = lerp(qb.pos, end, Math.min(1, u));
    const outcome = contact(state, qb.pos, at, u >= 1, end);
    if (outcome) return outcome.kind === 'caught';
  }
  return false;
}

function botInput(state: RunState, rng: Rng, plan: Plan): StepInput {
  if (state.phase === 'breakit' && state.tackle) {
    const t = state.tackle;
    const fresh = plan.tackleAt !== t.startedAt;
    if (fresh) {
      plan.tackleAt = t.startedAt;
      plan.sawAt = null;
    }
    switch (t.kind) {
      case 'bar':
        if (fresh) {
          plan.tapAt =
            rng.next() < BREAK_SKILL
              ? t.sweet.from + rng.next() * (t.sweet.to - t.sweet.from)
              : rng.next();
        }
        return (breakMarker(state) ?? 0) >= plan.tapAt ? { breakTap: true } : {};
      case 'mash':
        return rng.next() < MASH_RATE ? { breakTap: true } : {};
      case 'juke':
        if (!jukeShowing(state)) return {};
        if (plan.sawAt === null) {
          plan.sawAt = state.time;
          plan.side = rng.next() < JUKE_RIGHT ? t.side : t.side === 1 ? -1 : 1;
        }
        return state.time - plan.sawAt >= JUKE_REACTION ? { juke: plan.side } : {};
    }
  }
  if (!canThrow(state)) return {};
  const left = 1 - (state.time - state.snappedAt) / pocketTime(state);
  if (left < PANIC) return { throw: true };
  if (wouldCatch(state) && rng.next() < REACT) return { throw: true };
  return {};
}

function count(
  t: Tally,
  events: readonly ArcadeEvent[],
  state: RunState,
  ran: { now: boolean },
): void {
  for (const e of events) {
    switch (e.type) {
      case 'thrown':
        t.passes++;
        break;
      case 'handoff':
      case 'scrambled':
        t.handoffs++;
        ran.now = true;
        break;
      case 'grabbed':
        t.grabs++;
        break;
      case 'dragged':
        t.drags++;
        break;
      case 'caught':
        t.catches++;
        if (e.contested) t.contested++;
        break;
      case 'pancake':
        t.pancakes++;
        break;
      case 'batted': {
        const by = state.field.defenders.find((d) => d.id === e.by);
        bump(t.battedBy, `${by ? by.kind : 'witch'}${e.contested ? ' (contested)' : ''}`);
        break;
      }
      case 'brokeTackle':
        t.breaks++;
        break;
      case 'downEnded':
        t.downs++;
        t.yards += e.gained;
        t.downTime += state.time - state.snappedAt;
        bump(t.results, e.result);
        {
          const kind = ran.now ? t.run : t.pass;
          kind.yards += e.gained;
          kind.downs++;
        }
        ran.now = false;
        break;
      default:
        break;
    }
  }
}

/**
 * TRICK OR TREAT! for the bot: with `perks` on, a random perk; a recruit
 * takes the weakest slot of the position it prefers. With it off, it skips.
 */
function draftPick(state: RunState, rng: Rng, perks: boolean): RunState {
  if (!perks || state.offer.length === 0) return dispatch(state, { type: 'skipDraft' }).state;
  const picked = dispatch(state, { type: 'pick', offer: rng.int(0, state.offer.length - 1) }).state;
  const recruit = picked.recruit;
  if (!recruit) return picked;
  const total = (st: { hustle: number; hands: number; heft: number }): number =>
    st.hustle + st.hands + st.heft;
  const slots = picked.roster
    .map((p, slot) => ({ p, slot }))
    .filter(({ slot }) => ROSTER_ROLES[slot] === recruit.preferred)
    .sort((a, b) => total(a.p.stats) - total(b.p.stats));
  return dispatch(picked, { type: 'place', slot: slots[0]?.slot ?? 0 }).state;
}

function playRun(seed: number, scenario: Scenario, t: Tally): void {
  const rng = rngFor(seed, 'bot');
  // Each scenario's team: the starting humans, turned into its kinds and given its training.
  const roster = startingRoster().map((p) => {
    const kind = scenario.forms?.[p.preferred] ?? p.kind;
    const extra = {
      hustle: 0,
      hands: 0,
      heft: 0,
      ...scenario.training,
      ...scenario.roleTraining?.[p.preferred],
    };
    const form = FORM_STATS[kind];
    return {
      ...p,
      kind,
      stats: {
        hustle: p.stats.hustle + form.hustle + extra.hustle,
        hands: p.stats.hands + form.hands + extra.hands,
        heft: p.stats.heft + form.heft + extra.heft,
      },
    };
  });
  let state = createRun(seed, roster);
  const plan: Plan = { tackleAt: -1, tapAt: 1, sawAt: null, side: 1 };
  const ran = { now: false };
  let driveKey = '';
  for (let guard = 0; guard < 200000 && state.phase !== 'over' && state.phase !== 'won'; guard++) {
    const key = `${state.drive.area}:${state.drive.kind}`;
    if (key !== driveKey) {
      driveKey = key;
      bump(t.attempts, key);
    }
    if (state.phase === 'draft') {
      state = draftPick(state, rng, scenario.perks ?? false);
      continue;
    }
    if (state.phase === 'setup') {
      if (rng.next() < 0.5) state = dispatch(state, { type: 'flip' }).state;
      const called = dispatch(state, {
        type: 'call',
        hand: rng.int(0, state.hand.length - 1),
      }).state;
      const hiked = dispatch(called, { type: 'hike' });
      count(t, hiked.events, state, ran);
      state = hiked.state;
      continue;
    }
    const r = step(state, botInput(state, rng, plan));
    if (r.events.some((e) => e.type === 'driveWon')) bump(t.wins, key);
    count(t, r.events, state, ran);
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
  const batted = [...t.battedBy.entries()].map(([k, n]) => `${k} ${n}`).join(', ');
  if (batted) console.log(`  batted by: ${batted}`);
  console.log(
    `  yards a run ${(t.run.yards / Math.max(1, t.run.downs)).toFixed(1)} (${t.run.downs}) · yards a pass play ${(t.pass.yards / Math.max(1, t.pass.downs)).toFixed(1)} · completions ${pct(t.catches, t.passes)} (contested ${pct(t.contested, t.catches)}) · ` +
      `pancakes ${(t.pancakes / t.runs).toFixed(1)}/run · Break it! ${t.grabs}: broke ${pct(t.breaks, t.grabs)}, dragged ${pct(t.drags, t.grabs)}`,
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
    handoffs: 0,
    run: { yards: 0, downs: 0 },
    pass: { yards: 0, downs: 0 },
    catches: 0,
    contested: 0,
    pancakes: 0,
    grabs: 0,
    drags: 0,
    battedBy: new Map(),
    breaks: 0,
  };
  for (let seed = 1; seed <= RUNS; seed++) playRun(seed, scenario, t);
  report(scenario, t);
}
