/**
 * The game controller (M1.3): ties the beat clock, the simulation, the
 * three.js view and the DOM HUD together.
 *
 * The simulation steps exactly when the *heard* beat ticks over: each frame,
 * any beats that have been heard since the last frame are stepped. A throw
 * tapped on the ball button resolves on the beat the clock judges it for.
 */
import { installVisibilityPause, unlockAudio } from '../audio/context';
import { scheduleClick } from '../audio/metronome';
import { BeatClock } from '../beat/clock';
import { tuning } from '../content/tuning';
import { createField } from '../render/field';
import { Markers } from '../render/markers';
import { UnitViews } from '../render/units';
import { View, tileToWorld } from '../render/view';
import { loadSettings } from '../settings';
import { BIG_POS, eq, inSetupZone } from '../sim/grid';
import { createRun, dispatch, yards } from '../sim/run';
import { step, throwProblem } from '../sim/step';
import type { RunState, SimEvent, Vec } from '../sim/types';
import { Hud, type Badge } from '../ui/hud';

/** Beats the sim may catch up in one frame before the game pauses instead. */
const MAX_CATCH_UP = 2;

export interface GameOptions {
  seed: number;
}

export class Game {
  private state: RunState;
  private readonly view: View;
  private readonly units: UnitViews;
  private readonly markers: Markers;
  private readonly hud: Hud;
  private readonly settings = loadSettings();
  private clock: BeatClock | null = null;
  private reticle: Vec | null = null;
  private queuedThrow: { beat: number; target: Vec } | null = null;
  private drag: { id: number; slot: number; tile: Vec } | null = null;
  private seed: number;
  /** Sim beat = clock beat + offset (the clock restarts from 0 on hike and on resume). */
  private beatOffset = 0;
  private paused = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: GameOptions) {
    this.seed = options.seed;
    this.state = createRun(this.seed);
    this.view = new View(canvas);
    this.view.scene.add(createField());
    this.units = new UnitViews(this.view.scene);
    this.markers = new Markers(this.view.scene);
    this.hud = new Hud(uiRoot, {
      onBall: (e) => this.onBallButton(e),
      onAction: () => void this.onAction(),
    });

    this.units.reset(this.state.screen);
    this.syncHud();
    const refit = (): void => this.view.setInsets(this.hud.insets());
    window.addEventListener('resize', refit);
    refit();

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', () => this.onPointerUp());
    canvas.addEventListener('pointercancel', () => this.onPointerUp());
    installVisibilityPause((hidden) => {
      if (hidden) this.pause();
    });

    this.view.renderer.setAnimationLoop((now) => this.frame(now));
  }

  // ── Frame loop ──────────────────────────────────────────────────────────

  private frame(now: number): void {
    const clockPos = this.clock?.running ? this.clock.position(now) : null;
    const pos = clockPos && { index: clockPos.index + this.beatOffset, phase: clockPos.phase };

    // If frames stalled for more than a couple of beats (the page was covered,
    // the phone hiccuped), pause rather than fast-forwarding through them.
    if (pos && this.state.phase === 'play' && pos.index - this.state.beat > MAX_CATCH_UP) {
      this.pause();
    }
    // Step every beat that has been heard since the last frame.
    while (pos && !this.paused && this.state.phase === 'play' && this.state.beat < pos.index) {
      this.stepBeat();
    }
    if (this.state.phase !== 'play' && this.clock?.running) this.clock.stop();

    const playing = this.state.phase === 'play' && !this.paused && pos !== null;
    const beat = playing ? pos.index : this.state.beat;
    const phase = playing ? Math.max(0, pos.phase) : 1;
    this.units.update(this.state.screen, beat, phase);
    this.markers.update(this.state.screen, beat + phase, this.units, now / 1000);
    this.hud.updateBeat(playing ? phase : null);
    this.hud.setBadges(this.badges());
    this.view.render();
  }

  private stepBeat(): void {
    const next = this.state.beat + 1;
    if (this.queuedThrow && this.queuedThrow.beat < next) this.queuedThrow = null;
    const throwAt = this.queuedThrow?.beat === next ? this.queuedThrow.target : null;
    if (throwAt) this.queuedThrow = null;

    const prev = this.state;
    const result = step(prev, throwAt);
    this.state = result.state;
    if (result.events.some((e) => e.type === 'screenStarted')) {
      this.units.reset(this.state.screen);
    } else {
      this.units.beginBeat(prev.screen, this.state.screen, this.state.beat);
    }
    this.react(result.events);
    this.syncHud();
  }

  private react(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'caught':
          this.hud.showJudgement(e.clean ? 'CLEAN CATCH!' : 'Caught!', 'onBeat');
          break;
        case 'fumble':
          this.hud.showJudgement('FEE FI FO FUMBLE!', 'bad');
          break;
        case 'wipeout':
          this.hud.showJudgement('WIPEOUT!', 'bad');
          break;
        case 'throwRejected':
          this.hud.showJudgement(e.reason, 'bad');
          break;
        default:
          break;
      }
    }
  }

  private syncHud(): void {
    const { phase, screen } = this.state;
    this.hud.setBalls(this.state.balls);
    this.hud.setYards(yards(this.state), screen.index);
    this.hud.setBallReady(phase === 'play' && screen.ball.at === 'big');
    if (phase === 'setup') this.hud.setPrompt('Place your squad', 'HIKE!');
    else if (phase === 'cleared') this.hud.setPrompt('TOUCHDOWN!', 'NEXT');
    else if (phase === 'over') this.hud.setPrompt(`${yards(this.state)} yards`, 'AGAIN');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else this.hud.setPrompt(null, null);
    this.markers.setReticle(phase === 'play' ? this.reticle : null);
  }

  /** The Big's counter, shown once a Blitzer is attacking it and it still holds the ball. */
  private badges(): Badge[] {
    const { screen } = this.state;
    const onBig = screen.defenders.some((d) => d.alive && d.engagedSince !== null);
    if (!onBig || screen.ball.at !== 'big') return [];
    const p = this.view.toScreen(tileToWorld(BIG_POS, 1.9));
    return [{ ...p, text: String(screen.bigHold), danger: true }];
  }

  // ── Input ───────────────────────────────────────────────────────────────

  private pause(): void {
    if (this.state.phase !== 'play' || this.paused) return;
    this.paused = true;
    this.clock?.stop();
    this.queuedThrow = null;
    this.syncHud();
  }

  /** Start the beat so that the clock's beat 0 lands on the sim's current beat. */
  private async startBeat(): Promise<void> {
    const ctx = await unlockAudio();
    if (!this.clock) {
      this.clock = new BeatClock(ctx);
      this.clock.onBeatScheduled((index, time) => scheduleClick(ctx, time, index % 4 === 0));
    }
    this.beatOffset = this.state.beat;
    this.queuedThrow = null;
    this.clock.start(tuning.beat.defaultBpm, 0.5);
  }

  private async onAction(): Promise<void> {
    const { phase } = this.state;
    if (phase === 'play' && this.paused) {
      this.paused = false;
      await this.startBeat();
    } else if (phase === 'setup') {
      dispatch(this.state, { type: 'hike' });
      await this.startBeat();
    } else if (phase === 'cleared') {
      dispatch(this.state, { type: 'nextScreen' });
      this.units.reset(this.state.screen);
    } else if (phase === 'over') {
      this.seed++;
      this.state = createRun(this.seed);
      this.reticle = null;
      this.units.reset(this.state.screen);
    }
    this.syncHud();
  }

  private onBallButton(e: PointerEvent): void {
    if (this.state.phase !== 'play' || !this.clock?.running) return;
    if (this.state.screen.ball.at !== 'big') return;
    if (!this.reticle) {
      this.hud.showJudgement('Tap the field to aim', 'bad');
      return;
    }
    const result = this.clock.judgeTap(
      e.timeStamp,
      this.settings.audioOffsetMs / 1000,
      tuning.beat.onBeatWindow,
    );
    if (!result) return;
    const beat = Math.max(result.resolvesOn, this.state.beat + 1);
    this.queuedThrow = { beat, target: this.reticle };
    const ms = Math.round(result.offset * 1000);
    if (result.judgement === 'onBeat') this.hud.showJudgement('ON BEAT!', 'onBeat');
    else this.hud.showJudgement(ms < 0 ? 'early' : 'late', 'offBeat');
  }

  private onPointerDown(e: PointerEvent): void {
    const tile = this.view.tileAt(e.clientX, e.clientY);
    if (!tile) return;
    if (this.state.phase === 'setup') {
      const small = this.state.screen.smalls.find((s) => eq(s.pos, tile));
      if (small) {
        this.drag = { id: small.id, slot: small.slot, tile };
        this.units.setDragging({ id: small.id, tile });
      }
    } else if (this.state.phase === 'play') {
      const problem = throwProblem(
        { ...this.state, screen: { ...this.state.screen, ball: { at: 'big' } } },
        tile,
      );
      if (problem) {
        this.hud.showJudgement(problem, 'bad');
        return;
      }
      this.reticle = tile;
      this.markers.setReticle(tile);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag) return;
    const tile = this.view.tileAt(e.clientX, e.clientY);
    if (tile && inSetupZone(tile)) {
      this.drag.tile = tile;
      this.units.setDragging({ id: this.drag.id, tile });
    }
  }

  private onPointerUp(): void {
    if (!this.drag) return;
    dispatch(this.state, { type: 'place', slot: this.drag.slot, tile: this.drag.tile });
    this.drag = null;
    this.units.setDragging(null);
    this.units.reset(this.state.screen);
  }
}
