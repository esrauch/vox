/**
 * Dev page for the M1.2 simulation core: step a screen beat by beat, place
 * Players in setup, and queue throws by tapping tiles. Open /dev/screen.html?seed=N.
 */
import { DEFENDERS } from '../content/defenders';
import { tuning } from '../content/tuning';
import { QB_POS, COLS, END_ROW, ROWS, SETUP_ROWS, eq, inThrowBand, vec } from '../sim/grid';
import { createRun, dispatch, yards } from '../sim/run';
import { step, throwProblem } from '../sim/step';
import type { RunState, SimEvent, Unit, Vec } from '../sim/types';

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
let selectedSlot: number | null = null;
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

buttons.hike.addEventListener('click', () => act(dispatch(state, { type: 'hike' })));
buttons.step.addEventListener('click', advance);
buttons.next.addEventListener('click', () => act(dispatch(state, { type: 'nextScreen' })));
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
  if (state.phase === 'setup') {
    const here = state.screen.players.find((s) => eq(s.pos, tile));
    if (selectedSlot === null) selectedSlot = here?.slot ?? null;
    else {
      dispatch(state, { type: 'place', slot: selectedSlot, tile });
      selectedSlot = null;
    }
  } else if (state.phase === 'play') {
    const problem = throwProblem(state, tile);
    queuedThrow = problem ? null : tile;
    if (problem) logLine(`can't throw there: ${problem}`);
  }
  render();
}

function advance(): void {
  if (state.phase !== 'play') {
    stopAuto();
    return;
  }
  const result = step(state, queuedThrow);
  queuedThrow = null;
  state = result.state;
  act(result.events);
}

function act(events: SimEvent[]): void {
  for (const e of events) if (e.type !== 'hop') logLine(`beat ${state.beat}: ${describe(e)}`);
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
      if (y < SETUP_ROWS) classes.push('setup');
      if (y === END_ROW) classes.push('end');
      if (!inThrowBand(y)) classes.push('out-of-range');
      if (ball.at === 'flight' && eq(ball.target, tile)) classes.push('target');
      if (eq(queuedThrow, tile)) classes.push('queued');
      const selected = screen.players.find((s) => s.slot === selectedSlot);
      if (selected && eq(selected.pos, tile)) classes.push('selected');

      let html = '';
      if (eq(tile, QB_POS)) {
        classes.push('qb');
        html = '★';
        if (ball.at === 'qb') html += '<span class="ball">●</span>';
      }
      const unit = [...screen.players, ...screen.defenders]
        .filter((u) => eq(u.pos, tile))
        .sort((a, b) => Number(b.alive) - Number(a.alive))[0];
      if (unit) html += unitHtml(unit);
      if (ball.at === 'flight' && eq(ball.target, tile)) {
        html += `<span class="badge">${ball.landsOn - state.beat}</span>`;
      }
      cell.className = classes.join(' ');
      cell.innerHTML = html;
    }
  }

  status.textContent =
    `screen ${screen.index} · ${state.phase} · beat ${state.beat} · ` +
    `balls ${state.balls} · ${yards(state)} yds`;
  buttons.hike.disabled = state.phase !== 'setup';
  buttons.step.disabled = state.phase !== 'play';
  buttons.auto.disabled = state.phase !== 'play';
  buttons.next.disabled = state.phase !== 'cleared';
  help.textContent =
    state.phase === 'setup'
      ? 'Setup: tap a player, then a tile in the bottom 3 rows.'
      : state.phase === 'play'
        ? 'Tap a tile to queue a throw for the next beat (lands 2 beats later). Step or Auto to advance.'
        : state.phase === 'cleared'
          ? 'Touchdown! Next screen.'
          : 'Game over. New run.';
}

function unitHtml(u: Unit): string {
  const arrow = u.intent ? arrowFor(u.pos, u.intent) : '';
  const state = !u.alive ? 'dead' : u.downBeats > 0 ? 'down' : '';
  if (u.side === 'player') {
    const glyph = !u.alive ? '✝' : u.kindId === 'walkOn' ? 'w' : 'R';
    const carrying = state === '' && isCarrier(u.id) ? '<span class="ball">●</span>' : '';
    const fend = u.fendOff > 0 ? '⛨' : '';
    return `<span class="player ${state}">${glyph}${fend}${arrow}</span>${carrying}`;
  }
  const glyph = u.alive ? DEFENDERS[u.kind].glyph : '✝';
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
