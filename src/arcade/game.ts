/**
 * The arcade game controller (GAMEPLAY.md, A Down and Controls): runs the
 * arcade sim at its fixed 60 Hz step, draws it from a third-person camera
 * behind and above the QB that follows the play, and takes the timing
 * game's inputs:
 *
 * - **Before the snap:** three play cards and Flip. Tap a card to call it
 *   (its routes show on the field; tap another to switch), then HIKE.
 * - **On a pass play:** THROW fires a bullet along the sweeping line.
 * - **In Break it!:** taps, anywhere (for a juke, on the arrow's side).
 *
 * Keys for a desktop: 1–3 call a card, F flips, Space hikes (then throws,
 * and taps the bar and the mash), ← and → juke. The music is the soundtrack only: nothing waits for the beat.
 */
import * as THREE from 'three';
import { Conductor } from '../game/conductor';
import { ForestScenery } from '../render/scenery';
import { View } from '../render/view';
import { Hud } from '../ui/hud';
import { PLAYS } from './content/plays';
import { arcadeTuning, DT } from './content/tuning';
import { ArcadeBall } from './render/ball';
import { ArcadeBodies } from './render/bodies';
import { ArcadeLines, createArcadeTurf } from './render/field';
import { ArcadeFrogRain } from './render/frogRain';
import { ArcadeWitches } from './render/witches';
import { ArcadeRoutes } from './render/routes';
import { ArcadeSweep, litPlayers } from './render/sweep';
import { FIELD_AHEAD, FIELD_BEHIND, toWorld } from './render/world';
import { carrierOf, qbOf } from './sim/ai';
import { DRIVE_KINDS, createRun, dispatch, downAndDistance, startingRoster } from './sim/run';
import { FORM_STATS } from './content/team';
import { plus } from './sim/stats';
import { breakMarker, countdown, jukeShowing, mashLeft, type BreakOutcome } from './sim/breakit';
import { canThrow, step } from './sim/step';
import type {
  Action,
  ArcadeEvent,
  DriveKind,
  Player,
  RosterPlayer,
  RunState,
  StepInput,
} from './sim/types';
import { v } from './sim/vec';
import { ArcadeControls, type BreakView } from './ui/controls';
import { trickOrTreatView } from './ui/trickOrTreat';

export interface ArcadeOptions {
  seed: number;
  /** Start with a monster team (Golem Blockers, Werewolf Runners, Ghost Catchers): ?monsters=1, for a look at them. */
  monsters?: boolean;
  /** Start at this area (1 the Forest, 2 the Candy Kingdom, 3 the third): ?area=2, for trying later areas. */
  area?: number;
}

/** The starting team, or (with `monsters`) the same players turned into each position's monster. */
function firstRoster(monsters: boolean): RosterPlayer[] {
  const roster = startingRoster();
  if (!monsters) return roster;
  const kindFor = { blocker: 'golem', runner: 'werewolf', catcher: 'ghost' } as const;
  return roster.map((p) => {
    const kind = kindFor[p.preferred];
    return { ...p, kind, stats: plus(p.stats, FORM_STATS[kind]) };
  });
}

/**
 * The camera: behind and above the point it follows, looking down at this
 * angle (degrees) at a spot this far ahead of it. It pulls back as far as it
 * needs to show the whole width of the field, with this much to spare, at
 * the row it follows, whatever the screen's shape.
 */
const CAMERA_PITCH = 32;
/**
 * How fast sim time runs against real time: the whole game a little slower
 * than the sim's own numbers, everything together (so balance runs, which
 * count sim time, are unchanged).
 */
const TIME_SCALE = 0.8;
/** With the pumpkin ball as the light, the moon and the sky are only a dim fill, so the field stays readable. */
const MOON_FILL = 0.45;
const SKY_FILL = 0.75;
const LOOK_AHEAD = 7;
const WIDTH_MARGIN = 1.06;

const KIND_NAME: Readonly<Record<DriveKind, string>> = {
  intro: 'Intro',
  challenge: 'Challenge',
  gimmick: 'Gimmick',
  boss: 'Boss',
};
const AREA_NUMERAL: readonly string[] = ['I', 'II', 'III'];
/** How a Break it! went, in one big word. */
const BREAK_WORD: Readonly<Record<BreakOutcome, string>> = {
  break: 'GREAT!',
  drag: 'OK',
  tackle: 'BAD',
};

export class ArcadeGame {
  private state: RunState;
  private seed: number;
  private readonly monsters: boolean;
  /** The area runs start at (0-based). */
  private readonly startArea: number;
  private readonly conductor = new Conductor();
  private readonly view: View;
  private readonly bodies: ArcadeBodies;
  private readonly ball: ArcadeBall;
  private readonly sweep: ArcadeSweep;
  private readonly lines: ArcadeLines;
  private readonly routes: ArcadeRoutes;
  private readonly frogRain: ArcadeFrogRain;
  private readonly witches: ArcadeWitches;
  private readonly hud: Hud;
  private readonly controls: ArcadeControls;

  /** Yards marched in the drives before this one: the field is one long strip. */
  private origin = 0;
  /** Unspent real time, carried into the next frame's fixed steps. */
  private accumulator = 0;
  private lastFrame: number | null = null;
  private paused = false;
  /** What the player pressed since the last step, applied on the next one. */
  private pending: StepInput = {};
  /** TRICK OR TREAT!: the spot first tapped for a swap. */
  private swapFrom: number | null = null;
  /** Where the camera looks (field yards, smoothed). */
  private focus = v(0, -4);

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: ArcadeOptions) {
    this.seed = options.seed;
    this.monsters = options.monsters ?? false;
    this.startArea = Math.max(0, (options.area ?? 1) - 1);
    this.state = createRun(this.seed, firstRoster(this.monsters), this.startArea);
    this.origin = this.startOrigin();
    this.view = new View(canvas, { fov: 50 });
    const { scene } = this.view;
    scene.add(createArcadeTurf());
    const scenery = new ForestScenery(scene, this.view, {
      halfWidth: arcadeTuning.field.halfWidth,
      nearZ: FIELD_BEHIND,
      farZ: -FIELD_AHEAD,
      endZ: -FIELD_AHEAD,
    });
    scene.add(scenery.group);
    // The pumpkin ball is the light (render/ball.ts): the moon is only a dim fill, with no shadows.
    this.view.sun.castShadow = false;
    this.view.sun.intensity = MOON_FILL;
    this.view.hemi.intensity = SKY_FILL;
    this.lines = new ArcadeLines(scene);
    this.routes = new ArcadeRoutes(scene);
    this.frogRain = new ArcadeFrogRain(scene);
    this.witches = new ArcadeWitches(scene);
    this.bodies = new ArcadeBodies(scene);
    this.ball = new ArcadeBall(scene);
    this.sweep = new ArcadeSweep(scene);
    this.hud = new Hud(uiRoot, {
      onAction: () => void this.onAction(),
      onCard: (hand) => this.call(hand),
      onFlip: () => this.act({ type: 'flip' }),
      onDraft: (offer) => this.act({ type: 'pick', offer }),
      onSkip: () => this.act({ type: 'skipDraft' }),
      onRoster: (spot) => this.onRoster(spot),
    });
    this.controls = new ArcadeControls(uiRoot, {
      onThrow: () => this.press({ throw: true }),
      onBreakTap: () => this.press({ breakTap: true }),
      onJuke: (side) => this.press({ juke: side }),
    });

    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.pause();
    });

    this.bodies.sync(this.state);
    this.syncHud();
    this.view.renderer.setAnimationLoop((now) => this.frame(now));
  }

  // ── The loop ────────────────────────────────────────────────────────────

  private frame(now: number): void {
    const dt = this.lastFrame === null ? 0 : Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.conductor.started && !this.paused) {
      this.accumulator += dt * TIME_SCALE;
      while (this.accumulator >= DT) {
        this.stepOnce();
        this.accumulator -= DT;
      }
    }
    this.draw(dt);
  }

  private stepOnce(): void {
    const input: StepInput = { ...this.pending };
    this.pending = {};
    const prev = this.state;
    const { state, events } = step(prev, input);
    this.state = state;
    this.after(events, prev);
  }

  private act(action: Action): void {
    if (!this.conductor.started || this.paused) return;
    const prev = this.state;
    const { state, events } = dispatch(prev, action);
    this.state = state;
    this.after(events, prev);
    this.syncHud();
  }

  /** TRICK OR TREAT!: tap two spots (field or bench) in turn to swap them. */
  private onRoster(spot: number): void {
    this.conductor.play('uiClick');
    if (this.swapFrom === null) {
      this.swapFrom = spot;
    } else {
      const from = this.swapFrom;
      this.swapFrom = null;
      if (from !== spot) this.act({ type: 'swap', a: from, b: spot });
    }
    this.syncHud();
  }

  private call(hand: number): void {
    this.conductor.play('uiClick');
    this.act({ type: 'call', hand });
  }

  /** A button press, applied on the next step (if it means anything right now). */
  private press(input: StepInput): void {
    if (!this.conductor.started || this.paused) return;
    this.pending = { ...this.pending, ...input };
  }

  private after(events: readonly ArcadeEvent[], prev: RunState): void {
    // A won drive marches on: the new drive's 0 is the old one's first-down line.
    if (events.some((e) => e.type === 'driveWon')) this.origin += prev.drive.firstDown;
    this.react(events, prev);
    if (events.length > 0 || this.state.phase !== prev.phase) this.syncHud();
  }

  private draw(dt: number): void {
    const { state } = this;
    this.lines.update(state.drive, this.origin);
    this.routes.update(state, this.origin, this.previewPlayers());
    // Keep the views in step with the field: a recruit joining or a swap changes who's where.
    this.bodies.sync(state);
    this.bodies.update(state, this.origin, dt, litPlayers(state));
    this.ball.update(state, this.origin, this.bodies, dt, performance.now() / 1000);
    this.sweep.update(state, this.origin);
    this.frogRain.update(state, this.origin);
    this.witches.update(state, this.origin);
    this.controls.setButtons(canThrow(state) && !this.paused);
    this.controls.setBreak(this.breakView());
    this.follow(dt);
    this.view.render();
  }

  /** What the Break it! panel shows right now, or null. */
  private breakView(): BreakView | null {
    const { state } = this;
    const t = state.tackle;
    if (!t || state.phase !== 'breakit') return null;
    // The countdown's seconds left, on screen (sim time runs slower than real time).
    const cd = countdown(state);
    const ready = cd === null ? null : ((1 - cd) * arcadeTuning.breakit.ready) / TIME_SCALE;
    switch (t.kind) {
      case 'bar':
        return {
          kind: 'bar',
          ready,
          sweet: t.sweet,
          near: t.near,
          marker: breakMarker(state) ?? 0,
          dir: t.dir,
        };
      case 'mash':
        return { kind: 'mash', ready, fill: t.fill, left: mashLeft(state) ?? 0 };
      case 'juke':
        return { kind: 'juke', ready, side: jukeShowing(state) ? t.side : null };
    }
  }

  /** Before the hike, the called play's players (their routes are drawn), or null. */
  private previewPlayers(): Player[] | null {
    const { state } = this;
    return state.phase === 'setup' && state.called !== null ? state.field.players : null;
  }

  /** The third-person camera: behind and above whatever matters (the QB, the ball, the carrier). */
  private follow(dt: number): void {
    const { state } = this;
    const qb = qbOf(state);
    const carrier = carrierOf(state);
    const ball = state.field.ball;
    let want = qb ? qb.pos : v(0, state.drive.los - 4);
    if (carrier) want = carrier.pos;
    else if (ball.at === 'flight') want = v(0, Math.max(want.y, ball.target.y - 8));
    // The whole width is always in view, so only follow upfield.
    want = v(0, want.y);
    // In Break it! the camera eases in a little on the tackle.
    const k = 1 - Math.exp(-dt * (state.phase === 'breakit' ? 2 : 4));
    this.focus = v(
      this.focus.x + (want.x - this.focus.x) * k,
      this.focus.y + (want.y - this.focus.y) * k,
    );

    const cam = this.view.camera;
    const at = toWorld(this.focus, this.origin);
    const pitch = THREE.MathUtils.degToRad(CAMERA_PITCH);
    // The horizontal half-angle the screen shows; far enough back that the field's width fits at the followed row.
    const halfAcross = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const back =
      (arcadeTuning.field.halfWidth * WIDTH_MARGIN) / Math.tan(halfAcross) +
      LOOK_AHEAD * Math.cos(pitch);
    const look = new THREE.Vector3(at.x, 0, at.z - LOOK_AHEAD);
    cam.position.set(look.x, back * Math.sin(pitch), look.z + back * Math.cos(pitch));
    cam.lookAt(look);
    cam.updateMatrixWorld();
    // Keep the moonlight (a dim fill) around the play, and the fog ahead of the camera.
    const { sun } = this.view;
    sun.target.position.copy(look).add(new THREE.Vector3(0, 0, -6));
    sun.position.copy(sun.target.position).add(new THREE.Vector3(-12, 26, 8));
    if (this.view.scene.fog instanceof THREE.Fog) {
      this.view.scene.fog.near = back + 10;
      this.view.scene.fog.far = back + 45;
    }
  }

  // ── Feedback ────────────────────────────────────────────────────────────

  private react(events: readonly ArcadeEvent[], prev: RunState): void {
    const play = (id: Parameters<Conductor['play']>[0]): void => this.conductor.play(id);
    for (const e of events) {
      switch (e.type) {
        case 'snapped':
          this.hud.pop(`${(PLAYS[this.state.play.index]?.name ?? '').toUpperCase()}!`, 'good');
          break;
        case 'thrown':
          play('throw');
          this.ball.burst(40, 5);
          break;
        case 'handoff':
          play('catch');
          break;
        case 'caught':
          this.ball.burst(30, 3);
          play(e.contested ? 'cleanCatch' : 'catch');
          this.hud.pop(e.contested ? 'CAUGHT IT!' : 'GOT IT!', 'good');
          break;
        case 'batted':
          this.ball.burst(50, 6);
          play('fumble');
          play('chant');
          this.hud.pop(e.contested ? 'DROPPED!' : 'BLOCKED!', 'bad');
          break;
        case 'incomplete':
          play('fumble');
          this.hud.pop('INCOMPLETE', 'bad');
          break;
        case 'sacked':
          play('sack');
          this.hud.pop('SACKED!', 'bad');
          break;
        case 'joined':
          this.hud.pop(`${e.name.toUpperCase()} JOINS!`, 'good');
          break;
        case 'pancake':
          play('burst');
          break;
        case 'breakResult':
          this.hud.big(
            BREAK_WORD[e.outcome],
            e.outcome === 'break' ? 'good' : e.outcome === 'drag' ? 'ok' : 'bad',
          );
          break;
        case 'grabbed':
        case 'brokeTackle':
        case 'dragged':
          play('burst');
          break;
        case 'frogLanded':
          play('hop');
          if (e.flattened.length > 0) {
            // Good when it squashes the defense, bad when it squashes your own.
            const ours = e.flattened.some((id) =>
              this.state.field.players.some((p) => p.id === id),
            );
            play('burst');
            this.hud.pop('SPLAT!', ours ? 'bad' : 'good');
          }
          break;
        case 'outOfBounds':
          this.hud.pop('OUT OF BOUNDS', 'bad');
          break;
        case 'downEnded':
          if (e.result === 'firstDown') {
            play('touchdown');
            this.hud.pop(prev.drive.kind === 'boss' ? 'TOUCHDOWN!' : 'FIRST DOWN!', 'good');
          } else if (e.result === 'tackled' || e.result === 'outOfBounds') {
            const yards = Math.round(e.gained);
            this.hud.pop(
              yards > 0 ? `+${yards} YARDS` : yards < 0 ? `LOSS OF ${-yards}` : 'NO GAIN',
              yards > 0 ? 'good' : 'bad',
            );
          }
          break;
        default:
          break;
      }
    }
  }

  private syncHud(): void {
    const { phase, drive, drivesWon, hand, flipped, called } = this.state;
    const banner =
      phase === 'over' || phase === 'won'
        ? `${drivesWon} ${drivesWon === 1 ? 'drive' : 'drives'} won`
        : `${AREA_NUMERAL[drive.area] ?? drive.area + 1} · ${drive.index + 1}/4 ${KIND_NAME[drive.kind]}: ${drive.name}`;
    const live = phase === 'setup' || phase === 'play' || phase === 'breakit';
    this.hud.setTop(banner, live ? downAndDistance(this.state) : null);
    const ready = this.conductor.started && !this.paused;
    const cards =
      ready && phase === 'setup'
        ? hand.map((i) => {
            const p = PLAYS[i];
            return { name: p?.name ?? '?', blurb: p?.handoff !== undefined ? 'Run' : 'Pass' };
          })
        : null;
    this.hud.setHand(cards, called, flipped);
    if (phase !== 'draft') this.swapFrom = null;
    this.hud.setDraft(
      ready && phase === 'draft' ? trickOrTreatView(this.state, this.swapFrom) : null,
    );
    if (!this.conductor.started) this.hud.setPrompt('Get Jack Back', 'PLAY');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else if (phase === 'setup')
      this.hud.setPrompt(called === null ? 'Pick a play' : null, called === null ? null : 'HIKE!');
    else if (phase === 'over') this.hud.setPrompt('Game Over!', 'AGAIN');
    else if (phase === 'won') this.hud.setPrompt('Jack is home!', 'AGAIN');
    else this.hud.setPrompt(null, null);
  }

  private async onAction(): Promise<void> {
    this.conductor.play('uiClick');
    const { phase } = this.state;
    if (!this.conductor.started) {
      await this.conductor.start();
    } else if (this.paused) {
      this.paused = false;
      this.lastFrame = null;
      await this.conductor.resume();
    } else if (phase === 'setup') {
      this.act({ type: 'hike' });
    } else if (phase === 'over' || phase === 'won') {
      this.seed++;
      this.state = createRun(this.seed, firstRoster(this.monsters), this.startArea);
      this.origin = this.startOrigin();
      this.focus = v(0, -4);
      this.bodies.sync(this.state);
    }
    this.syncHud();
  }

  /** Where a run's first drive sits on the long field: past the areas it skipped. */
  private startOrigin(): number {
    return this.state.drive.area * DRIVE_KINDS.length * arcadeTuning.drive.distance;
  }

  private pause(): void {
    if (!this.conductor.started || this.paused) return;
    this.paused = true;
    this.pending = {};
    this.conductor.pause();
    this.syncHud();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    const { phase } = this.state;
    if (e.code === 'Space') {
      e.preventDefault();
      if (phase === 'setup') this.act({ type: 'hike' });
      else if (phase === 'breakit') this.press({ breakTap: true });
      else this.press({ throw: true });
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (phase === 'breakit') this.press({ juke: e.code === 'ArrowLeft' ? -1 : 1 });
    } else if (e.code === 'KeyF' && phase === 'setup') this.act({ type: 'flip' });
    else if (phase === 'setup' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      this.call(Number(e.code.slice(-1)) - 1);
    }
  }
}
