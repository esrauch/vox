/**
 * The arcade game controller (GAMEPLAY.md, A Down and Controls): runs the
 * arcade sim at its fixed 60 Hz step, draws it from a third-person camera
 * behind and above the QB that follows the play, and takes the timing
 * game's inputs:
 *
 * - **Before the snap:** three play cards and Flip. A finger on a card shows
 *   its routes; letting go on it calls it and snaps.
 * - **On a pass play:** THROW fires a bullet along the sweeping line; RUN
 *   lets the QB keep it.
 * - **In Break it!:** one tap, anywhere.
 *
 * Keys for a desktop: Space throws (and taps Break it!), R runs, F flips,
 * 1–3 call a card. The music is the soundtrack only: nothing waits for the beat.
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
import { ArcadeRoutes } from './render/routes';
import { ArcadeSweep, litPlayers } from './render/sweep';
import { FIELD_AHEAD, FIELD_BEHIND, toWorld } from './render/world';
import { carrierOf, qbOf } from './sim/ai';
import { lineUpTeam } from './sim/bodies';
import { createRun, dispatch, downAndDistance } from './sim/run';
import { breakMarker, canThrow, step } from './sim/step';
import type { Action, ArcadeEvent, DriveKind, Player, RunState, StepInput } from './sim/types';
import { v } from './sim/vec';
import { ArcadeControls } from './ui/controls';

export interface ArcadeOptions {
  seed: number;
}

/**
 * The camera: behind and above the point it follows, looking down at this
 * angle (degrees) at a spot this far ahead of it. It pulls back as far as it
 * needs to show the whole width of the field, with this much to spare, at
 * the row it follows, whatever the screen's shape.
 */
const CAMERA_PITCH = 32;
const LOOK_AHEAD = 7;
const WIDTH_MARGIN = 1.06;

const KIND_NAME: Readonly<Record<DriveKind, string>> = {
  intro: 'Intro',
  challenge: 'Challenge',
  gimmick: 'Gimmick',
  boss: 'Boss',
};
const AREA_NUMERAL: readonly string[] = ['I', 'II', 'III'];

export class ArcadeGame {
  private state: RunState;
  private seed: number;
  private readonly conductor = new Conductor();
  private readonly view: View;
  private readonly bodies: ArcadeBodies;
  private readonly ball: ArcadeBall;
  private readonly sweep: ArcadeSweep;
  private readonly lines: ArcadeLines;
  private readonly routes: ArcadeRoutes;
  private readonly hud: Hud;
  private readonly controls: ArcadeControls;

  /** Yards marched in the drives before this one: the field is one long strip. */
  private origin = 0;
  /** Unspent real time, carried into the next frame's fixed steps. */
  private accumulator = 0;
  private lastFrame: number | null = null;
  private paused = false;
  /** What the player pressed since the last step, applied on the next one. */
  private pending: { throw?: boolean; scramble?: boolean; breakTap?: boolean } = {};
  /** The card under the player's finger, if any: its routes are drawn. */
  private previewCard: number | null = null;
  /** Where the camera looks (field yards, smoothed). */
  private focus = v(0, -4);

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, options: ArcadeOptions) {
    this.seed = options.seed;
    this.state = createRun(this.seed);
    this.view = new View(canvas, { follow: true, fov: 50 });
    const { scene } = this.view;
    // The moonlight's shadows have to cover the whole width, and well up the field.
    Object.assign(this.view.sun.shadow.camera, {
      left: -18,
      right: 18,
      top: 30,
      bottom: -24,
      far: 90,
    });
    this.view.sun.shadow.camera.updateProjectionMatrix();
    scene.add(createArcadeTurf());
    const scenery = new ForestScenery(scene, this.view, {
      halfWidth: arcadeTuning.field.halfWidth,
      nearZ: FIELD_BEHIND,
      farZ: -FIELD_AHEAD,
      endZ: -FIELD_AHEAD,
    });
    scene.add(scenery.group);
    this.lines = new ArcadeLines(scene);
    this.routes = new ArcadeRoutes(scene);
    this.bodies = new ArcadeBodies(scene);
    this.ball = new ArcadeBall(scene);
    this.sweep = new ArcadeSweep(scene);
    this.hud = new Hud(uiRoot, {
      onAction: () => void this.onAction(),
      onCard: (hand) => this.call(hand),
      onCardPreview: (hand) => (this.previewCard = hand),
      onFlip: () => this.act({ type: 'flip' }),
      onDraft: () => undefined,
      onSkip: () => undefined,
    });
    this.hud.setDraft(null);
    this.controls = new ArcadeControls(uiRoot, {
      onThrow: () => this.press({ throw: true }),
      onRun: () => this.press({ scramble: true }),
      onBreakTap: () => this.press({ breakTap: true }),
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
      this.accumulator += dt;
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

  private call(hand: number): void {
    this.previewCard = null;
    this.conductor.play('uiClick');
    this.act({ type: 'call', hand });
  }

  /** A button press, applied on the next step (if it means anything right now). */
  private press(input: { throw?: boolean; scramble?: boolean; breakTap?: boolean }): void {
    if (!this.conductor.started || this.paused) return;
    this.pending = { ...this.pending, ...input };
  }

  private after(events: readonly ArcadeEvent[], prev: RunState): void {
    // A won drive marches on: the new drive's 0 is the old one's first-down line.
    if (events.some((e) => e.type === 'driveWon')) this.origin += prev.drive.firstDown;
    if (
      events.some(
        (e) => e.type === 'downStarted' || e.type === 'driveStarted' || e.type === 'called',
      )
    ) {
      this.bodies.sync(this.state);
    }
    this.react(events, prev);
    if (events.length > 0 || this.state.phase !== prev.phase) this.syncHud();
  }

  private draw(dt: number): void {
    const { state } = this;
    this.lines.update(state.drive, this.origin);
    this.routes.update(state, this.origin, this.previewPlayers());
    this.bodies.update(state, this.origin, dt, litPlayers(state));
    this.ball.update(state, this.origin, this.bodies);
    this.sweep.update(state, this.origin);
    this.controls.setButtons(canThrow(state) && !this.paused);
    const t = state.tackle;
    const marker = breakMarker(state);
    this.controls.setMeter(t && marker !== null ? { sweet: t.sweet, near: t.near, marker } : null);
    this.follow(dt);
    this.view.render();
  }

  /** The players of the card under the finger, lined up as they'd run it (for the route preview). */
  private previewPlayers(): Player[] | null {
    const { state } = this;
    if (state.phase !== 'setup' || this.previewCard === null) return null;
    const play = PLAYS[state.hand[this.previewCard] ?? -1];
    if (!play) return null;
    return lineUpTeam(state.roster, play, state.flipped, state.drive.los, 0);
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
    // Keep the moonlight's shadows around the play, and the fog ahead of the camera.
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
        case 'called':
          this.hud.pop(`${e.play.toUpperCase()}!`, 'good');
          break;
        case 'thrown':
          play('throw');
          break;
        case 'handoff':
          play('catch');
          break;
        case 'scrambled':
          play('hop');
          this.hud.pop('QB RUN!', 'good');
          break;
        case 'caught':
          play(e.contested ? 'cleanCatch' : 'catch');
          this.hud.pop(e.contested ? 'CAUGHT IT!' : 'GOT IT!', 'good');
          break;
        case 'batted':
          play('fumble');
          play('chant');
          this.hud.pop(e.contested ? 'DROPPED!' : 'SWATTED!', 'bad');
          break;
        case 'incomplete':
          play('fumble');
          this.hud.pop('INCOMPLETE', 'bad');
          break;
        case 'sacked':
          play('sack');
          this.hud.pop('SACKED!', 'bad');
          break;
        case 'pancake':
          play('burst');
          this.hud.pop('PANCAKE!', 'good');
          break;
        case 'grabbed':
          play('burst');
          break;
        case 'brokeTackle':
          play('burst');
          this.hud.pop('BROKE IT!', 'good');
          break;
        case 'dragged':
          play('burst');
          this.hud.pop('DRAG!', 'good');
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
    const { phase, drive, drivesWon, hand, flipped } = this.state;
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
    this.hud.setHand(cards, null, { always: true, flipped });
    if (!this.conductor.started) this.hud.setPrompt('Fourth & Ghoul', 'PLAY');
    else if (this.paused) this.hud.setPrompt('Paused', 'RESUME');
    else if (phase === 'draft') this.hud.setPrompt('Drive won!', 'NEXT DRIVE');
    else if (phase === 'over') this.hud.setPrompt('Turnover on downs!', 'AGAIN');
    else if (phase === 'won') this.hud.setPrompt('The forest is cleared!', 'AGAIN');
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
    } else if (phase === 'draft') {
      this.act({ type: 'skipDraft' });
    } else if (phase === 'over' || phase === 'won') {
      this.seed++;
      this.state = createRun(this.seed);
      this.origin = 0;
      this.focus = v(0, -4);
      this.bodies.sync(this.state);
    }
    this.syncHud();
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
      this.press(phase === 'breakit' ? { breakTap: true } : { throw: true });
    } else if (e.code === 'KeyR') this.press({ scramble: true });
    else if (e.code === 'KeyF' && phase === 'setup') this.act({ type: 'flip' });
    else if (phase === 'setup' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      this.call(Number(e.code.slice(-1)) - 1);
    }
  }
}
