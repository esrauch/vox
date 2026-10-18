/**
 * The game controller: ties the conductor (music and the global tick), the
 * simulation, the three.js views and the DOM HUD together, and routes input.
 *
 * Each frame, the sim steps every beat that has been *heard* since the last
 * one, in every phase; the phase only decides who moves (see sim/step.ts).
 *
 * The flow (GAMEPLAY.md, The Core Loop): before each down, tap one of three
 * play cards (Flip mirrors it); pull back to snap the ball and aim, release to throw; the
 * down ends; after a won drive, draft a card; a failed 4th down ends the run.
 */
import type * as THREE from 'three';
import { playCard } from '../content/cards';
import { tuning } from '../content/tuning';
import { AimView } from '../render/aim';
import { BallView } from '../render/ball';
import { DriveLines, Turf } from '../render/field';
import { HazardViews } from '../render/hazards';
import { Crossfade } from '../render/crossfade';
import { NextDefenseView, WAITING_OPACITY } from '../render/nextDefense';
import { PocketView } from '../render/pocket';
import { QbView } from '../render/qb';
import { RoutePreview } from '../render/routes';
import { ForestScenery } from '../render/scenery';
import { UnitViews } from '../render/units';
import { View } from '../render/view';
import { createRun, dispatch, downAndDistance, yardsText } from '../sim/run';
import { flightTicks } from '../sim/flight';
import { step, throwProblem } from '../sim/step';
import type { Action, DriveKind, RunState, SimEvent, Vec } from '../sim/types';
import { Hud, type CardFace } from '../ui/hud';
import { Conductor } from './conductor';
import { THROW_PROBLEM_TEXT, react } from './feedback';
import { aimTarget, throwTiming } from './slingshot';

/** How long the camera takes to glide forward into the next drive. */
const GLIDE_MS = 1300;

/** Sim ticks per beat of the music. */
const TICKS_PER_BEAT = tuning.clock.ticksPerBeat;

export interface GameOptions {
  seed: number;
}

const DRIVE_KIND_NAME: Readonly<Record<DriveKind, string>> = {
  intro: 'Intro',
  challenge: 'Challenge',
  gimmick: 'Gimmick',
  boss: 'Boss',
};

const face = (id: string): CardFace => {
  const c = playCard(id);
  return { name: c.name, blurb: c.blurb };
};

export class Game {
  private state: RunState;
  private seed: number;
  private readonly conductor = new Conductor();
  /** The song beat this run's tick 0 fell on: sim tick = (song beat - runStart) × ticks per beat. */
  private runStart = 0;
  private paused = false;

  private readonly view: View;
  private readonly turf: Turf;
  private readonly scenery: ForestScenery;
  private readonly nextDefense: NextDefenseView;
  private readonly crossfade: Crossfade;
  private readonly units: UnitViews;
  private readonly hazards: HazardViews;
  private readonly lines: DriveLines;
  private readonly routes: RoutePreview;
  private readonly pocket: PocketView;
  private readonly qb: QbView;
  private readonly ball: BallView;
  private readonly aimView: AimView;
  private readonly hud: Hud;

  /** Pulling back to aim: where the pull started (screen px) and where it points. */
  private aim: { start: { x: number; y: number }; target: Vec } | null = null;
  /**
   * Gliding forward into the next drive: the camera starts `rows` back (so the
   * new line of scrimmage sits where the old first-down line was) and eases
   * forward from `since` (performance ms). The draft waits until it arrives.
   */
  private glide: { rows: number; since: number } | null = null;
  /** A released throw, waiting for the tick the sim takes it on. */
  private queuedThrow: { tick: number; target: Vec } | null = null;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: GameOptions) {
    this.seed = options.seed;
    this.state = createRun(this.seed);
    this.view = new View(canvas);
    const { scene } = this.view;
    this.turf = new Turf();
    this.scenery = new ForestScenery(scene, this.view);
    scene.add(this.turf.group, this.scenery.group);
    this.nextDefense = new NextDefenseView(scene);
    this.crossfade = new Crossfade(scene);
    this.lines = new DriveLines(scene);
    this.routes = new RoutePreview(scene);
    this.pocket = new PocketView(scene);
    this.units = new UnitViews(scene);
    this.hazards = new HazardViews(scene);
    this.qb = new QbView(scene);
    this.ball = new BallView(scene);
    this.aimView = new AimView(scene);
    this.hud = new Hud(uiRoot, {
      onAction: () => void this.onAction(),
      onCard: (hand) => this.act({ type: 'call', hand }),
      onFlip: () => this.act({ type: 'flip' }),
      onDraft: (offer) => this.act({ type: 'draft', offer }),
      onRemove: (owned) => this.act({ type: 'remove', owned }),
      onSkip: () => this.act({ type: 'skipDraft' }),
    });

    this.resetViews();
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
    const pos = this.simTickAt(now);
    const tick = Math.floor(pos);
    // Step every tick heard since the last frame. The music never waits, so
    // neither does the sim: after a hiccup it catches up rather than drifting.
    while (this.state.tick < tick) this.stepTick();

    const { screen, drive } = this.state;
    this.units.update(screen, pos - tick);
    this.hazards.update(pos, now / 1000);
    this.lines.update(drive);
    // One long field: it runs on past the first-down line, with the next
    // defense waiting up there, until the Boss drive ends it at the end zone.
    this.turf.setEnd(drive.kind === 'boss');
    this.scenery.setEnd(drive.kind === 'boss');
    this.nextDefense.update(this.state);
    this.routes.update(this.state);
    this.pocket.update(this.state, pos);
    const holding = this.ball.update(screen, pos, this.units, now / 1000);
    this.qb.update(screen.qb, holding);
    this.aimView.update(now / 1000);
    this.updateGlide(now);
    this.view.render();
  }

  /** The sim tick (with its fraction) heard at a performance-clock moment (ms). Ticks are eighth notes. */
  private simTickAt(perfMs?: number): number {
    const song = this.conductor.beatAt(perfMs);
    return song === null ? this.state.tick : (song - this.runStart) * TICKS_PER_BEAT;
  }

  private stepTick(): void {
    const next = this.state.tick + 1;
    const queued = this.queuedThrow;
    if (queued && queued.tick <= next) this.queuedThrow = null;
    const input = queued?.tick === next ? { throwAt: queued.target } : {};

    const prev = this.state;
    const { state, events } = step(prev, input);
    this.state = state;
    this.afterChange(events, prev);
  }

  /** Apply an action between beats (calling a play, Flip, HIKE, the draft). */
  private act(action: Action): void {
    if (!this.conductor.started || this.paused) return;
    this.conductor.play('uiClick');
    const prev = this.state;
    const { state, events } = dispatch(prev, action);
    this.state = state;
    this.afterChange(events, prev);
  }

  /** After the state changes: rebuild or animate the views, react, and refresh the HUD. */
  private afterChange(events: readonly SimEvent[], prev: RunState): void {
    if (events.some((e) => e.type === 'downStarted' || e.type === 'driveStarted')) {
      // A won drive marching on into the next: glide forward to it.
      const marching =
        events.some((e) => e.type === 'driveStarted') && this.state.phase === 'draft';
      const rows = prev.drive.firstDown - this.state.drive.start;
      // Nothing pops at the hand-over: the old drive stays put and fades as the camera leaves it…
      if (marching) {
        this.crossfade.end();
        this.crossfade.leave(this.fieldObjects(), rows);
        this.glide = { rows, since: performance.now() };
      }
      this.resetViews();
      // …and the next drive fades in: the defense from its waiting ghosts, everything else from nothing.
      if (marching) {
        this.crossfade.arrive(this.units.objects(), WAITING_OPACITY);
        this.crossfade.arrive([...this.qb.objects(), ...this.pocket.objects()], 0);
        this.crossfade.arrive([...this.ball.objects(), ...this.lines.objects()], 0);
      }
    } else {
      this.units.sync(this.state.screen);
      this.units.beginBeat(prev.screen, this.state.screen);
    }
    react(
      events,
      this.state.screen,
      this.hud,
      (id) => this.conductor.play(id),
      prev.drive.kind === 'boss',
    );
    this.syncHud();
  }

  private updateGlide(now: number): void {
    const glide = this.glide;
    if (!glide) return;
    const t = Math.min(1, (now - glide.since) / GLIDE_MS);
    const ease = t * t * (3 - 2 * t);
    this.view.scroll(glide.rows * (1 - ease));
    this.crossfade.update(t);
    if (t < 1) return;
    this.glide = null;
    this.crossfade.end();
    this.syncHud(); // the draft can show now
  }

  /** Everything drawn on the field that changes from drive to drive. */
  private fieldObjects(): THREE.Object3D[] {
    return [
      ...this.units.objects(),
      ...this.qb.objects(),
      ...this.pocket.objects(),
      ...this.ball.objects(),
      ...this.lines.objects(),
    ];
  }

  /** Rebuild the views of everything on the field (a new down or drive). */
  private resetViews(): void {
    this.units.reset(this.state.screen);
    this.hazards.reset(this.state.screen);
    this.ball.launch(null);
    this.queuedThrow = null;
  }

  // ── Phases and the HUD ──────────────────────────────────────────────────

  private async onAction(): Promise<void> {
    this.conductor.play('uiClick');
    const { phase } = this.state;
    if (!this.conductor.started) {
      // Entering the game: the run's tick 0 is the song's beat 0.
      await this.conductor.start();
      this.runStart = -this.state.tick / TICKS_PER_BEAT;
    } else if (this.paused) {
      this.paused = false;
      await this.conductor.resume();
    } else if (phase === 'setup') {
      this.act({ type: 'hike' });
      return;
    } else if (phase === 'over' || phase === 'won') {
      this.seed++;
      this.state = createRun(this.seed);
      this.runStart = Math.floor(this.conductor.beatAt() ?? 0);
      this.resetViews();
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
    const { phase, drive, deck, called } = this.state;
    const { drivesWon, yards } = this.state;
    const summary = `${drivesWon} ${drivesWon === 1 ? 'drive' : 'drives'} won · ${yardsText(yards)} yds`;
    const banner =
      phase === 'over' || phase === 'won'
        ? summary
        : `${drive.index + 1}/4 ${DRIVE_KIND_NAME[drive.kind]}: ${drive.name}`;
    // Between downs the line of scrimmage has moved but the down hasn't: the pop says what happened.
    const live = phase === 'setup' || phase === 'play';
    this.hud.setTop(banner, live ? downAndDistance(this.state) : null);

    const ready = this.conductor.started && !this.paused;
    this.hud.setHand(ready && phase === 'setup' ? deck.hand.map(face) : null, called?.hand ?? null);
    this.hud.setDraft(
      ready && phase === 'draft' && !this.glide
        ? { offer: this.state.offer.map(face), deck: deck.owned.map(face) }
        : null,
    );

    if (!this.conductor.started) this.hud.setPrompt('Fourth & Ghoul', 'PLAY');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else if (phase === 'setup') this.hud.setPrompt(called ? 'Pull back to snap' : null, null);
    else if (phase === 'over') this.hud.setPrompt('Turnover on downs!', 'AGAIN');
    else if (phase === 'won') this.hud.setPrompt('The forest is cleared!', 'AGAIN');
    else this.hud.setPrompt(null, null);
    if (phase !== 'play') this.setAim(null);
  }

  // ── Input: slingshot throws ─────────────────────────────────────────────

  private setAim(aim: { start: { x: number; y: number }; target: Vec } | null): void {
    this.aim = aim;
    this.aimView.set(
      aim && {
        from: this.state.screen.qb,
        target: aim.target,
        valid: throwProblem(this.state, aim.target) === null,
      },
    );
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.conductor.started || this.paused) return;
    // With a play called, pulling back snaps the ball: the same pull then aims the throw.
    if (this.state.phase === 'setup' && this.state.called) this.act({ type: 'hike' });
    const { phase, screen } = this.state;
    // In play, a drag that starts anywhere on the screen aims a throw.
    if (phase !== 'play' || screen.ball.at !== 'qb') return;
    this.view.canvas.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    this.setAim({ start, target: aimTarget(screen.qb, start, start) });
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.aim) return;
    const target = aimTarget(this.state.screen.qb, this.aim.start, {
      x: e.clientX,
      y: e.clientY,
    });
    this.setAim({ ...this.aim, target });
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.aim) this.release(this.aim.target, e.timeStamp);
  }

  /** Releasing throws if the aim is allowed (the sim takes it on the next beat); otherwise it cancels. */
  private release(target: Vec, perfMs: number): void {
    this.setAim(null);
    if (this.paused || this.state.phase !== 'play') return;
    const problem = throwProblem(this.state, target);
    if (problem) {
      // Letting go short of the throwing range just cancels; anywhere else, say why.
      if (problem !== 'tooClose') this.hud.pop(THROW_PROBLEM_TEXT[problem], 'bad');
      return;
    }
    const flight = flightTicks(this.state.screen.qb, target);
    const timing = throwTiming(this.simTickAt(perfMs), this.state.tick, flight);
    this.queuedThrow = { tick: timing.tick, target };
    this.ball.launch({ target, releasedAt: timing.releasedAt, landsOn: timing.landsOn });
  }
}
