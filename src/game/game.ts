/**
 * The game controller: ties the conductor (music and the global tick), the
 * simulation, the three.js views and the DOM HUD together, and routes input.
 *
 * Each frame, the sim steps every beat that has been *heard* since the last
 * one, in every phase; the phase only decides who moves (see sim/step.ts).
 */
import { AimView } from '../render/aim';
import { BallView } from '../render/ball';
import { createField } from '../render/field';
import { QbView } from '../render/qb';
import { createForestScenery } from '../render/scenery';
import { UnitViews } from '../render/units';
import { View } from '../render/view';
import { eq, inSetupZone } from '../sim/grid';
import { createRun, dispatch, yards } from '../sim/run';
import { step, throwProblem } from '../sim/step';
import type { Action, RunState, Vec } from '../sim/types';
import { Hud } from '../ui/hud';
import { Conductor } from './conductor';
import { THROW_PROBLEM_TEXT, react } from './feedback';
import { aimTarget, throwTiming } from './slingshot';

export interface GameOptions {
  seed: number;
}

export class Game {
  private state: RunState;
  private seed: number;
  private readonly conductor = new Conductor();
  /** The song beat this run's beat 0 fell on: sim beat = song beat - runStart. */
  private runStart = 0;
  private paused = false;

  private readonly view: View;
  private readonly units: UnitViews;
  private readonly qb: QbView;
  private readonly ball: BallView;
  private readonly aimView: AimView;
  private readonly hud: Hud;

  /** Pulling back to aim: where the pull started (screen px) and where it points. */
  private aim: { start: { x: number; y: number }; target: Vec } | null = null;
  /** A released throw, waiting for the beat the sim takes it on. */
  private queuedThrow: { beat: number; target: Vec } | null = null;
  /** Dragging a player in setup. */
  private drag: { id: number; slot: number; tile: Vec } | null = null;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: GameOptions) {
    this.seed = options.seed;
    this.state = createRun(this.seed);
    this.view = new View(canvas);
    const { scene } = this.view;
    scene.add(createField(), createForestScenery(scene, this.view));
    this.units = new UnitViews(scene);
    this.qb = new QbView(scene);
    this.ball = new BallView(scene);
    this.aimView = new AimView(scene);
    this.hud = new Hud(uiRoot, { onAction: () => void this.onAction() });

    this.units.reset(this.state.screen);
    this.syncHud();
    const refit = (): void => this.view.setInsets(this.hud.insets());
    window.addEventListener('resize', refit);
    refit();

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    // Leaving the page pauses: the audio is suspended, so the beat stops too.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pause();
    });

    this.view.renderer.setAnimationLoop((now) => this.frame(now));
  }

  // ── The beat ────────────────────────────────────────────────────────────

  private frame(now: number): void {
    const pos = this.simBeatAt(now);
    const beat = Math.floor(pos);
    // Step every beat heard since the last frame. The music never waits, so
    // neither does the sim: after a hiccup it catches up rather than drifting.
    while (this.state.beat < beat) this.stepBeat();

    this.units.update(this.state.screen, beat, pos - beat);
    const holding = this.ball.update(this.state.screen, pos, this.units, now / 1000);
    this.qb.update(holding);
    this.aimView.update(now / 1000);
    this.view.render();
  }

  /** The sim beat (with its fraction) heard at a performance-clock moment (ms). */
  private simBeatAt(perfMs?: number): number {
    const song = this.conductor.beatAt(perfMs);
    return song === null ? this.state.beat : song - this.runStart;
  }

  private stepBeat(): void {
    const next = this.state.beat + 1;
    const queued = this.queuedThrow;
    if (queued && queued.beat <= next) this.queuedThrow = null;
    const input = queued?.beat === next ? { throwAt: queued.target } : {};

    const prev = this.state;
    const { state, events } = step(prev, input);
    this.state = state;
    if (events.some((e) => e.type === 'screenStarted')) this.units.reset(state.screen);
    else this.units.beginBeat(prev.screen, state.screen, state.beat);
    react(events, state.screen, this.hud, (id) => this.conductor.play(id));
    this.syncHud();
  }

  // ── Phases and the HUD ──────────────────────────────────────────────────

  private act(action: Action): void {
    this.state = dispatch(this.state, action).state;
  }

  private async onAction(): Promise<void> {
    this.conductor.play('uiClick');
    const { phase } = this.state;
    if (!this.conductor.started) {
      // Entering the game: the run's beat 0 is the song's beat 0.
      await this.conductor.start();
      this.runStart = -this.state.beat;
    } else if (this.paused) {
      this.paused = false;
      await this.conductor.resume();
    } else if (phase === 'setup') {
      // The beat is already running: players start on their next hop beat.
      this.act({ type: 'hike' });
    } else if (phase === 'cleared') {
      this.act({ type: 'nextScreen' });
      this.units.reset(this.state.screen);
    } else if (phase === 'over') {
      this.seed++;
      this.state = createRun(this.seed);
      this.runStart = Math.floor(this.conductor.beatAt() ?? 0) - this.state.beat;
      this.queuedThrow = null;
      this.units.reset(this.state.screen);
    }
    this.syncHud();
  }

  /** Suspend the audio, and with it the beat. Everything picks up exactly where it was on RESUME. */
  private pause(): void {
    if (!this.conductor.started || this.paused) return;
    this.paused = true;
    this.setAim(null);
    this.conductor.pause();
    this.syncHud();
  }

  private syncHud(): void {
    const { phase, screen } = this.state;
    this.hud.setBalls(this.state.balls);
    this.hud.setYards(yards(this.state), screen.index);
    if (!this.conductor.started) this.hud.setPrompt('Fourth & Ghoul', 'PLAY');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else if (phase === 'setup') this.hud.setPrompt('Place your squad', 'HIKE!');
    else if (phase === 'cleared') this.hud.setPrompt('TOUCHDOWN!', 'NEXT');
    else if (phase === 'over') this.hud.setPrompt(`${yards(this.state)} yards`, 'AGAIN');
    else this.hud.setPrompt(null, null);
    if (phase !== 'play') this.setAim(null);
  }

  // ── Input: slingshot throws in play, dragging players in setup ──────────

  private setAim(aim: { start: { x: number; y: number }; target: Vec } | null): void {
    this.aim = aim;
    this.aimView.set(
      aim && { target: aim.target, valid: throwProblem(this.state, aim.target) === null },
    );
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.conductor.started || this.paused) return;
    const { phase, screen } = this.state;
    // In play, a drag that starts anywhere on the screen aims a throw.
    if (phase === 'play') {
      if (screen.ball.at !== 'qb') return;
      this.view.canvas.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY };
      this.setAim({ start, target: aimTarget(start, start) });
      return;
    }
    if (phase !== 'setup') return;
    const tile = this.view.tileAt(e.clientX, e.clientY);
    const player = tile && screen.players.find((s) => eq(s.pos, tile));
    if (!tile || !player) return;
    this.drag = { id: player.id, slot: player.slot, tile };
    this.units.setDragging({ id: player.id, tile });
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.aim) {
      const target = aimTarget(this.aim.start, { x: e.clientX, y: e.clientY });
      this.setAim({ ...this.aim, target });
      return;
    }
    if (!this.drag) return;
    const tile = this.view.tileAt(e.clientX, e.clientY);
    if (tile && inSetupZone(tile)) {
      this.drag.tile = tile;
      this.units.setDragging({ id: this.drag.id, tile });
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.aim) {
      this.release(this.aim.target, e.timeStamp);
      return;
    }
    if (!this.drag) return;
    this.act({ type: 'place', slot: this.drag.slot, tile: this.drag.tile });
    this.drag = null;
    this.units.setDragging(null);
    this.units.reset(this.state.screen);
  }

  /** Releasing throws if the aim is allowed (the sim takes it on the next beat); otherwise it cancels. */
  private release(target: Vec, perfMs: number): void {
    this.setAim(null);
    if (this.paused || this.state.phase !== 'play') return;
    const problem = throwProblem(this.state, target);
    if (problem) {
      // Letting go short of the throwing band just cancels; anywhere else, say why.
      if (problem !== 'tooClose') this.hud.pop(THROW_PROBLEM_TEXT[problem], 'bad');
      return;
    }
    const timing = throwTiming(this.simBeatAt(perfMs), this.state.beat);
    this.queuedThrow = { beat: timing.beat, target };
    this.ball.launch({ target, releasedAt: timing.releasedAt, landsOn: timing.landsOn });
  }
}
