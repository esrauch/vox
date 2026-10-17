/**
 * The game controller: ties the beat clock, the music, the simulation, the
 * three.js view and the DOM HUD together.
 *
 * The tick is the music. Tapping PLAY enters the game: the song starts
 * looping and its beat clock with it, and neither ever stops. Each frame, the
 * sim steps every beat that has been *heard* since the last one, in every
 * phase; the phase only decides who moves (see step.ts). Pausing suspends the
 * audio, and the beat freezes with it.
 */
import { suspendAudio, unlockAudio } from '../audio/context';
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
import { View } from '../render/view';
import { COLS, QB_POS, eq, inSetupZone } from '../sim/grid';
import { createRun, dispatch, yards } from '../sim/run';
import { step, throwProblem } from '../sim/step';
import type { RunState, SimEvent, ThrowProblem, Vec } from '../sim/types';
import { Hud } from '../ui/hud';

/** What to tell the player when a throw isn't allowed. */
const THROW_PROBLEM_TEXT: Readonly<Record<ThrowProblem, string>> = {
  notInPlay: 'not in play',
  noBall: 'no ball',
  offField: 'off the field',
  tooFar: 'out of range',
  tooClose: 'too close',
};

export interface GameOptions {
  seed: number;
}

export class Game {
  private state: RunState;
  private readonly view: View;
  private readonly units: UnitViews;
  private readonly markers: Markers;
  private readonly hud: Hud;
  /** The song's beat clock: the global tick. Null until the player enters the game. */
  private clock: BeatClock | null = null;
  /** The song beat this run's beat 0 fell on: sim beat = song beat - runStart. */
  private runStart = 0;
  /** Aiming with the throw circle: where the pull started (screen px) and where it points. */
  private aim: { startX: number; startY: number; target: Vec; valid: boolean } | null = null;
  private queuedThrow: { beat: number; target: Vec } | null = null;
  private drag: { id: number; slot: number; tile: Vec } | null = null;
  private seed: number;
  private paused = false;
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
    // Leaving the page pauses: the audio is suspended, so the beat stops too.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pause();
    });

    // Rendering the song and effects doesn't need a tap, so start right away.
    void prepareSong(spookySurf);
    void prepareSfx(RENDER_RATE);

    this.view.renderer.setAnimationLoop((now) => this.frame(now));
  }

  // ── Frame loop ──────────────────────────────────────────────────────────

  private frame(now: number): void {
    const heard = this.clock?.position(now);
    const beat = heard ? heard.index - this.runStart : this.state.beat;
    // Step every beat heard since the last frame. The music never waits, so
    // neither does the sim: after a hiccup it catches up rather than drifting.
    while (this.state.beat < beat) this.stepBeat();

    const phase = heard ? Math.max(0, heard.phase) : 0;
    this.units.update(this.state.screen, beat, phase);
    this.markers.update(this.state.screen, beat + phase, this.units, now / 1000);
    this.view.render();
  }

  /** The sim beat (with its fraction) heard at a performance-clock moment (ms). */
  private beatPosition(perfMs: number): number {
    const heard = this.clock?.position(perfMs);
    return heard ? heard.index - this.runStart + heard.phase : this.state.beat;
  }

  private stepBeat(): void {
    const next = this.state.beat + 1;
    if (this.queuedThrow && this.queuedThrow.beat < next) this.queuedThrow = null;
    const throwAt = this.queuedThrow?.beat === next ? this.queuedThrow.target : null;
    if (throwAt) this.queuedThrow = null;

    const prev = this.state;
    const result = step(prev, throwAt ? { throwAt } : {});
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
    const playerIds = new Set(this.state.screen.players.map((s) => s.id));
    if (events.some((e) => e.type === 'hop' && playerIds.has(e.id))) this.play('hop');
    for (const e of events) {
      switch (e.type) {
        case 'thrown':
          this.play('throw');
          break;
        case 'caught':
          this.play(e.quality === 'perfect' ? 'cleanCatch' : 'catch');
          this.hud.pop(
            e.quality === 'perfect' ? 'PERFECT!' : e.quality === 'good' ? 'GOOD!' : 'OK',
            'good',
          );
          break;
        case 'died':
          this.play('burst');
          break;
        case 'fumble':
          if (e.reason === 'sack') this.play('sack');
          this.play('fumble');
          this.play('chant');
          this.hud.pop(e.reason === 'sack' ? 'SACKED!' : 'FEE FI FO FUMBLE!', 'bad');
          break;
        case 'touchdown':
          this.play('touchdown');
          break;
        case 'wipeout':
          this.hud.pop('WIPEOUT!', 'bad');
          break;
        case 'throwRejected':
          this.hud.pop(THROW_PROBLEM_TEXT[e.reason], 'bad');
          break;
        default:
          break;
      }
    }
  }

  /** Rebuild every unit view (a new or restarted screen). */
  private resetUnits(): void {
    this.units.reset(this.state.screen);
  }

  private play(id: SfxId): void {
    this.sfx?.play(id);
  }

  private syncHud(): void {
    const { phase, screen } = this.state;
    this.hud.setBalls(this.state.balls);
    this.hud.setYards(yards(this.state), screen.index);
    if (!this.clock) this.hud.setPrompt('Fourth & Ghoul', 'PLAY');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else if (phase === 'setup') this.hud.setPrompt('Place your squad', 'HIKE!');
    else if (phase === 'cleared') this.hud.setPrompt('TOUCHDOWN!', 'NEXT');
    else if (phase === 'over') this.hud.setPrompt(`${yards(this.state)} yards`, 'AGAIN');
    else this.hud.setPrompt(null, null);
    if (phase !== 'play' && this.aim) {
      this.aim = null;
      this.markers.setAim(null);
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────

  /** Suspend the audio, and with it the beat. Everything picks up exactly where it was on RESUME. */
  private pause(): void {
    if (!this.clock || this.paused) return;
    this.paused = true;
    this.aim = null;
    this.markers.setAim(null);
    void suspendAudio();
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
   * Enter the game (the PLAY tap, which is what lets audio start): the song
   * starts looping, and its clock is the global tick from here on.
   */
  private async enter(): Promise<void> {
    const { ctx, music } = await this.ensureAudio();
    const origin = ctx.currentTime + 0.1;
    music.start(origin);
    this.clock = new BeatClock(ctx);
    this.clock.startAt(music.song.bpm, origin);
    this.runStart = -this.state.beat;
  }

  private async onAction(): Promise<void> {
    this.play('uiClick');
    const { phase } = this.state;
    if (!this.clock) {
      await this.enter();
    } else if (this.paused) {
      this.paused = false;
      await unlockAudio();
    } else if (phase === 'setup') {
      // The beat is already running: players start on their next hop beat.
      this.state = dispatch(this.state, { type: 'hike' }).state;
    } else if (phase === 'cleared') {
      this.state = dispatch(this.state, { type: 'nextScreen' }).state;
      this.resetUnits();
    } else if (phase === 'over') {
      this.seed++;
      this.state = createRun(this.seed);
      this.runStart = (this.clock.position()?.index ?? 0) - this.state.beat;
      this.queuedThrow = null;
      this.resetUnits();
    }
    this.syncHud();
  }

  private onAimStart(e: PointerEvent): void {
    if (this.state.phase !== 'play' || this.paused) return;
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

  /** Releasing throws if the aim is valid (the sim takes it on the next beat); otherwise it cancels. */
  private onAimEnd(e: PointerEvent): void {
    const aim = this.aim;
    this.aim = null;
    this.markers.setAim(null);
    if (!aim || this.paused || this.state.phase !== 'play') return;
    const problem = throwProblem(this.state, aim.target);
    if (problem) {
      // Letting go short of the throwing band just cancels; anywhere else, say why.
      if (problem !== 'tooClose') this.hud.pop(THROW_PROBLEM_TEXT[problem], 'bad');
      return;
    }
    // The sim throws on the next beat and the ball lands flightBeats after
    // that, but the ball leaves the QB's hand the moment you let go: it flies
    // a little faster or slower so it still lands right on that beat.
    const releasedAt = Math.max(this.beatPosition(e.timeStamp), this.state.beat);
    const beat = Math.max(Math.floor(releasedAt), this.state.beat) + 1;
    this.queuedThrow = { beat, target: aim.target };
    this.markers.launch({
      target: aim.target,
      releasedAt,
      landsOn: beat + tuning.throw.flightBeats,
    });
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.clock || this.paused) return;
    // In play, a drag that starts anywhere on the screen aims a throw, slingshot-style.
    if (this.state.phase === 'play') {
      this.view.canvas.setPointerCapture(e.pointerId);
      this.onAimStart(e);
      return;
    }
    const tile = this.view.tileAt(e.clientX, e.clientY);
    if (!tile) return;
    if (this.state.phase === 'setup') {
      const player = this.state.screen.players.find((s) => eq(s.pos, tile));
      if (player) {
        this.drag = { id: player.id, slot: player.slot, tile };
        this.units.setDragging({ id: player.id, tile });
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
    const place = { type: 'place', slot: this.drag.slot, tile: this.drag.tile } as const;
    this.state = dispatch(this.state, place).state;
    this.drag = null;
    this.units.setDragging(null);
    this.resetUnits();
  }
}
