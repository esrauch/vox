/**
 * The game controller: ties the beat clock, the music, the simulation, the
 * three.js view and the DOM HUD together.
 *
 * The simulation steps exactly when the *heard* beat ticks over: each frame,
 * any beats that have been heard since the last frame are stepped. A throw
 * tapped on the ball button resolves on the beat the clock judges it for.
 */
import { installVisibilityPause, unlockAudio } from '../audio/context';
import { getMixer } from '../audio/mixer';
import { MusicPlayer, RENDER_RATE, prepareSong } from '../audio/music';
import { SfxPlayer, prepareSfx, type SfxId } from '../audio/sfx';
import { spookySurf } from '../audio/songs/spookySurf';
import { BeatClock } from '../beat/clock';
import { tuning } from '../content/tuning';
import { createField } from '../render/field';
import { createForestScenery } from '../render/scenery';
import { Markers } from '../render/markers';
import { UnitViews } from '../render/units';
import { View, tileToWorld } from '../render/view';
import { loadSettings } from '../settings';
import { COLS, QB_POS, eq, inSetupZone } from '../sim/grid';
import { createRun, dispatch, yards } from '../sim/run';
import { idleStep, step, throwProblem } from '../sim/step';
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
  /** Aiming with the throw circle: where the pull started (screen px) and where it points. */
  private aim: { startX: number; startY: number; target: Vec; valid: boolean } | null = null;
  private queuedThrow: { beat: number; target: Vec } | null = null;
  private drag: { id: number; slot: number; tile: Vec } | null = null;
  private seed: number;
  /** Sim beat = clock beat + offset (the clock restarts from 0 on hike and on resume). */
  private beatOffset = 0;
  private paused = false;
  /** The setup-phase clock that keeps patrols circling before HIKE (null outside setup). */
  private idle: { start: number } | null = null;
  private music: MusicPlayer | null = null;
  private sfx: SfxPlayer | null = null;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: GameOptions) {
    this.seed = options.seed;
    this.state = createRun(this.seed);
    this.view = new View(canvas);
    this.view.scene.add(createField(), createForestScenery(this.view.scene, this.view));
    this.units = new UnitViews(this.view.scene);
    this.markers = new Markers(this.view.scene);
    this.hud = new Hud(uiRoot, {
      onAction: () => void this.onAction(),
    });

    this.resetUnits();
    this.syncHud();
    const refit = (): void => this.view.setInsets(this.hud.insets());
    window.addEventListener('resize', refit);
    refit();

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    installVisibilityPause((hidden) => {
      if (hidden) this.pause();
    });

    // Rendering the song and effects doesn't need a tap, so start right away.
    void prepareSong(spookySurf);
    void prepareSfx(RENDER_RATE);

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
    const idle = this.state.phase === 'setup' ? this.idleTick(now) : null;
    const beat = playing ? pos.index : idle ? idle.beat : this.state.beat;
    const phase = playing ? Math.max(0, pos.phase) : idle ? idle.phase : 1;
    this.units.update(this.state.screen, beat, phase);
    this.markers.update(this.state.screen, beat + phase, this.units, now / 1000);
    this.hud.setBadges(this.badges());
    this.view.render();
  }

  /**
   * During setup, patrolling defenders (the Bats) keep circling at the song's
   * tempo, so the pattern is already running when you HIKE. Returns the
   * current setup beat and how far through it we are, for animation.
   */
  private idleTick(now: number): { beat: number; phase: number } {
    const beatMs = 60_000 / spookySurf.bpm;
    this.idle ??= { start: now - this.state.screen.idleBeat * beatMs };
    const elapsed = (now - this.idle.start) / beatMs;
    while (this.state.screen.idleBeat < Math.floor(elapsed) && !this.drag) {
      const prev = this.state;
      this.state = idleStep(prev).state;
      this.units.beginBeat(prev.screen, this.state.screen, this.state.screen.idleBeat);
    }
    return { beat: this.state.screen.idleBeat, phase: elapsed % 1 };
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
      this.resetUnits();
    } else {
      this.units.beginBeat(prev.screen, this.state.screen, this.state.beat);
    }
    this.react(result.events);
    this.syncHud();
  }

  private react(events: readonly SimEvent[]): void {
    const smallIds = new Set(this.state.screen.smalls.map((s) => s.id));
    if (events.some((e) => e.type === 'hop' && smallIds.has(e.id))) this.play('hop');
    for (const e of events) {
      switch (e.type) {
        case 'thrown':
          this.play('throw');
          break;
        case 'caught':
          this.play(e.quality === 'perfect' ? 'cleanCatch' : 'catch');
          this.hud.showJudgement(
            e.quality === 'perfect' ? 'PERFECT!' : e.quality === 'good' ? 'GOOD!' : 'OK',
            'onBeat',
          );
          break;
        case 'died':
          this.play('burst');
          break;
        case 'fumble':
          if (e.reason === 'sack') this.play('sack');
          this.play('fumble');
          this.play('chant');
          this.hud.showJudgement('FEE FI FO FUMBLE!', 'bad');
          break;
        case 'touchdown':
          this.play('touchdown');
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

  /** Rebuild every unit view (a new or restarted screen) and restart the setup clock. */
  private resetUnits(): void {
    this.units.reset(this.state.screen);
    this.idle = null;
  }

  private play(id: SfxId): void {
    this.sfx?.play(id);
  }

  /** Music follows the game: full song in play, the setup layer otherwise, silence when paused or over. */
  private syncMusic(): void {
    const music = this.music;
    if (!music?.playing) return;
    const { phase } = this.state;
    if (phase === 'over') music.stop(1.5);
    else if (this.paused) music.stop(0.2);
    else if (phase !== 'play' && music.currentLayer === 'play')
      music.setLayer('setup', music.now());
  }

  private syncHud(): void {
    this.syncMusic();
    const { phase, screen } = this.state;
    this.hud.setBalls(this.state.balls);
    this.hud.setYards(yards(this.state), screen.index);
    if (phase === 'setup') this.hud.setPrompt('Place your squad', 'HIKE!');
    else if (phase === 'cleared') this.hud.setPrompt('TOUCHDOWN!', 'NEXT');
    else if (phase === 'over') this.hud.setPrompt(`${yards(this.state)} yards`, 'AGAIN');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else this.hud.setPrompt(null, null);
    if (phase !== 'play' && this.aim) {
      this.aim = null;
      this.markers.setAim(null);
    }
  }

  /** The QB's counter, shown once a Blitzer is attacking it and it still holds the ball. */
  private badges(): Badge[] {
    const { screen } = this.state;
    const onQb = screen.defenders.some((d) => d.alive && d.engagedSince !== null);
    if (!onQb || screen.ball.at !== 'qb') return [];
    const p = this.view.toScreen(tileToWorld(QB_POS, 2.1));
    return [{ ...p, text: String(screen.qbHold), danger: true }];
  }

  // ── Input ───────────────────────────────────────────────────────────────

  private pause(): void {
    if (this.state.phase !== 'play' || this.paused) return;
    this.paused = true;
    this.clock?.stop();
    this.queuedThrow = null;
    this.syncHud();
  }

  /** Unlock audio (inside a tap) and get the music and effects ready. */
  private async ensureAudio(): Promise<{ ctx: AudioContext; music: MusicPlayer }> {
    const ctx = await unlockAudio();
    const mixer = getMixer(ctx);
    if (!this.music) {
      this.music = new MusicPlayer(ctx, mixer, spookySurf, await prepareSong(spookySurf));
    }
    if (!this.sfx) this.sfx = new SfxPlayer(ctx, mixer, await prepareSfx(RENDER_RATE));
    return { ctx, music: this.music };
  }

  /**
   * Start the beat. The music is the clock: the clock's beat 0 lands on the
   * next beat of the song (bringing in the full arrangement), and on the sim's
   * current beat.
   */
  private async startBeat(): Promise<void> {
    const { ctx, music } = await this.ensureAudio();
    this.clock ??= new BeatClock(ctx);
    let origin: number;
    if (music.playing) {
      origin = music.nextBeatTime(ctx.currentTime + 0.15);
      music.setLayer('play', origin);
    } else {
      origin = ctx.currentTime + 0.4;
      music.start(origin, 'play');
    }
    this.beatOffset = this.state.beat;
    this.queuedThrow = null;
    this.clock.startAt(music.song.bpm, origin);
  }

  /** Between plays (a new run), get the huddle groove going. */
  private async startSetupMusic(): Promise<void> {
    const { ctx, music } = await this.ensureAudio();
    if (!music.playing) music.start(ctx.currentTime + 0.1, 'setup');
  }

  private async onAction(): Promise<void> {
    this.play('uiClick');
    const { phase } = this.state;
    if (phase === 'play' && this.paused) {
      this.paused = false;
      await this.startBeat();
    } else if (phase === 'setup') {
      dispatch(this.state, { type: 'hike' });
      await this.startBeat();
    } else if (phase === 'cleared') {
      dispatch(this.state, { type: 'nextScreen' });
      this.resetUnits();
    } else if (phase === 'over') {
      this.seed++;
      this.state = createRun(this.seed);
      this.aim = null;
      this.resetUnits();
      await this.startSetupMusic();
    }
    this.syncHud();
  }

  private onAimStart(e: PointerEvent): void {
    if (this.state.phase !== 'play' || !this.clock?.running) return;
    if (this.state.screen.ball.at !== 'qb') return;
    this.aim = { startX: e.clientX, startY: e.clientY, target: QB_POS, valid: false };
    this.onAimMove(e);
  }

  /**
   * Slingshot aiming: pulling down aims up the field, pulling left aims right.
   * The target is a free point (not grid-locked) in tile units.
   */
  private onAimMove(e: PointerEvent): void {
    if (!this.aim) return;
    const k = tuning.aim.tilesPerPixel;
    const x = Math.max(-0.5, Math.min(COLS - 0.5, QB_POS.x - (e.clientX - this.aim.startX) * k));
    const y = Math.max(0, QB_POS.y + (e.clientY - this.aim.startY) * k);
    const target = { x, y };
    const valid = throwProblem(this.state, target) === null;
    this.aim = { ...this.aim, target, valid };
    this.markers.setAim({ target, valid });
  }

  /** Releasing throws, on the next beat, if the aim is valid; otherwise it cancels. */
  private onAimEnd(e: PointerEvent): void {
    const aim = this.aim;
    this.aim = null;
    this.markers.setAim(null);
    if (!aim || !this.clock?.running || this.state.phase !== 'play') return;
    if (!aim.valid) {
      if (aim.target.y > tuning.throw.minRow - 0.5) this.hud.showJudgement('out of range', 'bad');
      return;
    }
    const result = this.clock.judgeTap(
      e.timeStamp,
      this.settings.audioOffsetMs / 1000,
      tuning.beat.onBeatWindow,
    );
    if (!result) return;
    const beat = Math.max(result.resolvesOn, this.state.beat + 1);
    this.queuedThrow = { beat, target: aim.target };
  }

  private onPointerDown(e: PointerEvent): void {
    // In play, a drag that starts anywhere on the screen aims a throw, slingshot-style.
    if (this.state.phase === 'play') {
      this.view.canvas.setPointerCapture(e.pointerId);
      this.onAimStart(e);
      return;
    }
    const tile = this.view.tileAt(e.clientX, e.clientY);
    if (!tile) return;
    if (this.state.phase === 'setup') {
      const small = this.state.screen.smalls.find((s) => eq(s.pos, tile));
      if (small) {
        this.drag = { id: small.id, slot: small.slot, tile };
        this.units.setDragging({ id: small.id, tile });
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.aim) {
      this.onAimMove(e);
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
      this.onAimEnd(e);
      return;
    }
    if (!this.drag) return;
    dispatch(this.state, { type: 'place', slot: this.drag.slot, tile: this.drag.tile });
    this.drag = null;
    this.units.setDragging(null);
    this.resetUnits();
  }
}
