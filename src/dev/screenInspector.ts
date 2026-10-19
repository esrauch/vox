/**
 * Dev page for the simulation: step a run beat by beat, call plays, hike, and
 * queue throws by tapping tiles. Open /dev/screen.html?seed=N.
 */
import { DEFENDERS } from '../content/defenders';
import { witchColumn } from '../sim/hazards';
import { tuning } from '../content/tuning';
import { playCard } from '../content/cards';
import { COLS, ROWS, eq, vec } from '../sim/grid';
import { createRun, dispatch, downAndDistance } from '../sim/run';
import { step, throwProblem } from '../sim/step';
import type { Form, RunState, SimEvent, SimResult, Unit, Vec } from '../sim/types';
import { offerFace } from '../game/rosterText';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const grid = $('grid');
const status = $('status');
const help = $('help');
const log = $('log');
const seedInput = $<HTMLInputElement>('seed');
const buttons = {
  hike: $<HTMLButtonElement>('hike'),
  step: $<HTMLButtonElement>('step'),
  auto: $<HTMLButtonElement>('auto'),
  next: $<HTMLButtonElement>('next'),
  reset: $<HTMLButtonElement>('reset'),
};

const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed') ?? 1) || 1;
let state: RunState = createRun(seed);
let queuedThrow: Vec | null = null;
let autoTimer: ReturnType<typeof setInterval> | null = null;

seedInput.value = String(seed);

// Rows are drawn top (end zone) to bottom (the QB).
const cells: HTMLDivElement[][] = [];
for (let y = ROWS - 1; y >= 0; y--) {
  const row: HTMLDivElement[] = [];
  for (let x = 0; x < COLS; x++) {
    const cell = document.createElement('div');
    cell.addEventListener('click', () => onTile(vec(x, y)));
    grid.append(cell);
    row.push(cell);
  }
  cells[y] = row;
}

buttons.hike.addEventListener('click', () => take(dispatch(state, { type: 'hike' })));
buttons.step.addEventListener('click', advance);
buttons.next.textContent = 'Call next play';
buttons.next.addEventListener('click', () => {
  if (state.phase === 'draft') take(dispatch(state, { type: 'draft', offer: 0 }));
  else take(dispatch(state, { type: 'call', hand: ((state.called?.hand ?? -1) + 1) % 3 }));
});
buttons.reset.addEventListener('click', () => {
  seed = Number(seedInput.value) || 1;
  history.replaceState(null, '', `?seed=${seed}`);
  state = createRun(seed);
  log.replaceChildren();
  stopAuto();
  render();
});
buttons.auto.addEventListener('click', () => {
  if (autoTimer) stopAuto();
  else {
    autoTimer = setInterval(advance, 60_000 / tuning.beat.defaultBpm / 1.5);
    buttons.auto.textContent = 'Auto ⏸';
  }
});

render();

function onTile(tile: Vec): void {
  if (state.phase === 'play') {
    const problem = throwProblem(state, tile);
    queuedThrow = problem ? null : tile;
    if (problem) logLine(`can't throw there: ${problem}`);
  }
  render();
}

function advance(): void {
  if (state.phase === 'over' || state.phase === 'won') {
    stopAuto();
    return;
  }
  const result = step(state, queuedThrow ? { throwAt: queuedThrow } : {});
  queuedThrow = null;
  take(result);
}

/** Adopt a step or action's new state and log what happened. */
function take(result: SimResult): void {
  state = result.state;
  act(result.events);
}

function act(events: SimEvent[]): void {
  for (const e of events) if (e.type !== 'hop') logLine(`tick ${state.tick}: ${describe(e)}`);
  render();
}

function stopAuto(): void {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  buttons.auto.textContent = 'Auto ▶';
}

function render(): void {
  const { screen } = state;
  const ball = screen.ball;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = vec(x, y);
      const cell = cells[y]?.[x];
      if (!cell) continue;
      const classes = ['cell'];
      if ((x + y) % 2 === 1) classes.push('dark');
      if (y === state.drive.los) classes.push('setup');
      if (y === state.drive.firstDown) classes.push('end');
      if (ball.at === 'flight' && eq(ball.target, tile)) classes.push('target');
      if (eq(queuedThrow, tile)) classes.push('queued');

      let html = '';
      if (eq(tile, screen.qb)) {
        classes.push('qb');
        html = '★';
        if (ball.at === 'qb') html += '<span class="ball">●</span>';
      }
      const unit = [...screen.players, ...screen.defenders].find((u) => eq(u.pos, tile));
      if (unit) html += unitHtml(unit);
      if (screen.hazards.some((h) => h.row === y && witchColumn(h, state.tick) === x)) {
        html += '<span class="hazard">⋔</span>';
      }
      if (ball.at === 'flight' && eq(ball.target, tile)) {
        html += `<span class="badge">${ball.landsOn - state.tick}</span>`;
      }
      cell.className = classes.join(' ');
      cell.innerHTML = html;
    }
  }

  const called = state.called && state.deck.hand[state.called.hand];
  status.textContent =
    `drive ${state.drive.index + 1} (${state.drive.kind}) · ${downAndDistance(state)} · ` +
    `${state.phase} · tick ${state.tick} · ${state.yards} yds` +
    (called
      ? ` · called ${playCard(called).name}${state.called?.flipped ? ' (flipped)' : ''}`
      : '');
  buttons.hike.disabled = state.phase !== 'setup' || !state.called;
  buttons.next.disabled = state.phase !== 'setup' && state.phase !== 'draft';
  help.textContent =
    state.phase === 'setup'
      ? `Hand: ${state.deck.hand.map((c) => playCard(c).name).join(', ')}. Call a play, then Hike.`
      : state.phase === 'play'
        ? 'Tap a tile to queue a throw for the next beat (lands 2 beats later). Step or Auto to advance.'
        : state.phase === 'draft'
          ? `Draft: ${state.offer.map((o) => offerFace(o).name).join(', ')}. "Call next play" takes the first.`
          : state.phase === 'downOver'
            ? 'The down is over. Step on.'
            : 'The run is over. New run.';
}

/** One letter per form: human, Ghost, Werewolf, Golem. */
const FORM_GLYPH: Readonly<Record<Form, string>> = {
  human: 'h',
  ghost: 'G',
  werewolf: 'W',
  golem: 'O',
};

function unitHtml(u: Unit): string {
  const arrow = u.intent ? arrowFor(u.pos, u.intent) : '';
  const state = u.downTicks > 0 ? 'down' : '';
  if (u.side === 'player') {
    const glyph = FORM_GLYPH[u.form];
    const carrying = state === '' && isCarrier(u.id) ? '<span class="ball">●</span>' : '';
    return `<span class="player ${state}">${glyph}${arrow}</span>${carrying}`;
  }
  const glyph = DEFENDERS[u.kind].glyph;
  return `<span class="defender ${state}">${glyph}${arrow}</span>`;
}

function isCarrier(id: number): boolean {
  return state.screen.ball.at === 'carried' && state.screen.ball.by === id;
}

function arrowFor(from: Vec, to: Vec): string {
  if (to.y > from.y) return '↑';
  if (to.y < from.y) return '↓';
  if (to.x > from.x) return '→';
  return '←';
}

function describe(e: SimEvent): string {
  const { type, ...rest } = e;
  return `${type} ${JSON.stringify(rest)}`;
}

function logLine(text: string): void {
  const li = document.createElement('li');
  li.textContent = text;
  log.prepend(li);
  while (log.children.length > 60) log.lastChild?.remove();
}
