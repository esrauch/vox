/**
 * The arcade game controller (GAMEPLAY.md, rewritten 2026-10-19): runs the
 * arcade sim at its fixed 60 Hz step, draws it from a third-person camera
 * behind and above the QB that follows the play, and turns one thumb into
 * the three inputs:
 *
 * - **Pull back anywhere** to snap (before the snap) and aim; release to throw.
 * - **Tap a Runner** (before the snap, or just after) to hand it the ball.
 * - **Swipe left or right** while carrying to nudge the carrier's lane.
 *
 * The music is the soundtrack only: nothing waits for the beat.
 */
import * as THREE from 'three';
import { Conductor } from '../game/conductor';
import { ForestScenery } from '../render/scenery';
import { View } from '../render/view';
import { Hud } from '../ui/hud';
import { PLAYS } from './content/plays';
import { arcadeTuning, DT } from './content/tuning';
import { ArcadeAim } from './render/aim';
import { ArcadeBall } from './render/ball';
import { ArcadeBodies } from './render/bodies';
import { ArcadeLines, createArcadeTurf } from './render/field';
import { ArcadeRoutes } from './render/routes';
import { FIELD_AHEAD, FIELD_BEHIND, toWorld } from './render/world';
import { carrierOf, qbOf } from './sim/ai';
import { createRun, dispatch, downAndDistance } from './sim/run';
import { step, throwProblem } from './sim/step';
import type { ArcadeEvent, DriveKind, RunState, StepInput, Vec } from './sim/types';
import { add, v } from './sim/vec';

export interface ArcadeOptions {
  seed: number;
}

/** Yards of throw per pixel of pull. */
const YARDS_PER_PIXEL = 0.06;
/** A press that moves less than this (pixels) is a tap. */
const TAP_SLOP = 12;
/** A sideways move this far (pixels) while carrying is a swipe. */
const SWIPE = 28;
/** How close to a Runner (yards) a tap has to land to hand it the ball. */
const TAP_REACH = 1.6;

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
  private readonly aimView: ArcadeAim;
  private readonly lines: ArcadeLines;
  private readonly routes: ArcadeRoutes;
  private readonly hud: Hud;

  /** Yards marched in the drives before this one: the field is one long strip. */
  private origin = 0;
  /** Unspent real time, carried into the next frame's fixed steps. */
  private accumulator = 0;
  private lastFrame: number | null = null;
  private paused = false;
  /** What the player did since the last step, applied on the next one. */
  private pending: { throwAt?: Vec; steer?: -1 | 1 } = {};
  /** The press in progress. */
  private press: {
    id: number;
    start: { x: number; y: number };
    /** A Runner under the press, if it might be a tap to hand off. */
    runner: number | null;
    aiming: boolean;
    swiped: boolean;
  } | null = null;
  private aimTarget: Vec | null = null;
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
    this.aimView = new ArcadeAim(scene);
    this.hud = new Hud(uiRoot, {
      onAction: () => void this.onAction(),
      onCard: () => undefined,
      onFlip: () => undefined,
      onDraft: () => undefined,
      onSkip: () => undefined,
    });
    this.hud.setHand(null, null);
    this.hud.setDraft(null);

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => this.cancelPress());
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

  /** Apply an action between steps (the snap, a handoff, moving on). */
  private act(action: Parameters<typeof dispatch>[1]): void {
    const prev = this.state;
    const { state, events } = dispatch(prev, action);
    this.state = state;
    this.after(events, prev);
  }

  private after(events: readonly ArcadeEvent[], prev: RunState): void {
    // A won drive marches on: the new drive's 0 is the old one's first-down line.
    if (events.some((e) => e.type === 'driveWon')) this.origin += prev.drive.firstDown;
    if (events.some((e) => e.type === 'downStarted' || e.type === 'driveStarted')) {
      this.bodies.sync(this.state);
      this.cancelPress();
    }
    this.react(events, prev);
    if (events.length > 0) this.syncHud();
  }

  private draw(dt: number): void {
    const { state } = this;
    this.lines.update(state.drive, this.origin);
    this.routes.update(state, this.origin);
    this.bodies.update(state, this.origin, dt);
    this.ball.update(state, this.origin, this.bodies);
    const qb = qbOf(state);
    this.aimView.set(
      this.aimTarget && qb
        ? {
            from: qb.pos,
            target: this.aimTarget,
            valid: throwProblem(state, this.aimTarget) === null,
          }
        : null,
      this.origin,
      state.time,
    );
    this.follow(dt);
    this.view.render();
  }

  /** The third-person camera: behind and above whatever matters (the QB, the ball, the carrier). */
  private follow(dt: number): void {
    const { state } = this;
    const qb = qbOf(state);
    const carrier = carrierOf(state);
    const ball = state.field.ball;
    let want = qb ? qb.pos : v(0, state.drive.los - 4);
    if (carrier) want = carrier.pos;
    else if (ball.at === 'flight')
      want = v(ball.target.x * 0.5, Math.max(want.y, ball.target.y - 6));
    // The whole width is always in view, so only follow upfield.
    want = v(0, want.y);
    const k = 1 - Math.exp(-dt * 4);
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
        case 'downStarted':
          this.hud.pop(`${PLAYS[this.state.play.index]?.name.toUpperCase() ?? ''}!`, 'good');
          break;
        case 'thrown':
          play('throw');
          break;
        case 'handoff':
          play('catch');
          this.hud.pop('HANDOFF', 'good');
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
        case 'brokeTackle':
          play('burst');
          this.hud.pop('BROKE IT!', 'good');
          break;
        case 'tackled':
          play('burst');
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
    const { phase, drive, drivesWon } = this.state;
    const banner =
      phase === 'over' || phase === 'won'
        ? `${drivesWon} ${drivesWon === 1 ? 'drive' : 'drives'} won`
        : `${AREA_NUMERAL[drive.area] ?? drive.area + 1} · ${drive.index + 1}/4 ${KIND_NAME[drive.kind]}: ${drive.name}`;
    const live = phase === 'setup' || phase === 'play';
    this.hud.setTop(banner, live ? downAndDistance(this.state) : null);
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
    this.cancelPress();
    this.conductor.pause();
    this.syncHud();
  }

  // ── Input ───────────────────────────────────────────────────────────────

  /** The field point (yards, this drive's coordinates) under a screen point. */
  private fieldAt(clientX: number, clientY: number): Vec | null {
    const rect = this.view.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.view.camera);
    const hit = ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
    return hit ? v(hit.x, -hit.z - this.origin) : null;
  }

  /** A Runner near a field point, while a handoff is still possible. */
  private runnerAt(p: Vec | null): number | null {
    const { state } = this;
    if (!p || state.field.ball.at !== 'qb') return null;
    const window = arcadeTuning.throw.handoffWindow;
    if (state.phase === 'play' && state.time - state.snappedAt > window) return null;
    if (state.phase !== 'setup' && state.phase !== 'play') return null;
    const runner = state.field.players
      .filter((q) => q.role === 'runner')
      .map((q) => ({ q, d: Math.hypot(q.pos.x - p.x, q.pos.y - p.y) }))
      .sort((a, b) => a.d - b.d)[0];
    return runner && runner.d <= TAP_REACH ? runner.q.id : null;
  }

  private onDown(e: PointerEvent): void {
    if (!this.conductor.started || this.paused || this.press) return;
    const { phase } = this.state;
    if (phase !== 'setup' && phase !== 'play') return;
    this.view.canvas.setPointerCapture(e.pointerId);
    this.press = {
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      runner: this.runnerAt(this.fieldAt(e.clientX, e.clientY)),
      aiming: false,
      swiped: false,
    };
  }

  private onMove(e: PointerEvent): void {
    const press = this.press;
    if (!press || press.id !== e.pointerId) return;
    const dx = e.clientX - press.start.x;
    const dy = e.clientY - press.start.y;
    const { state } = this;

    // Carrying: a sideways swipe nudges the lane, once per swipe.
    if (carrierOf(state)) {
      if (!press.swiped && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
        press.swiped = true;
        this.pending = { ...this.pending, steer: dx > 0 ? 1 : -1 };
      }
      return;
    }
    // Pulling back: snap (before the snap) and aim.
    if (!press.aiming && Math.hypot(dx, dy) > TAP_SLOP && state.field.ball.at === 'qb') {
      if (state.phase === 'setup') this.act({ type: 'snap' });
      press.aiming = this.state.phase === 'play';
    }
    if (press.aiming) this.aimTarget = this.aimFor(dx, dy);
  }

  private onUp(e: PointerEvent): void {
    const press = this.press;
    if (!press || press.id !== e.pointerId) return;
    this.press = null;
    const moved = Math.hypot(e.clientX - press.start.x, e.clientY - press.start.y);
    if (press.runner !== null && moved <= TAP_SLOP) {
      this.act({ type: 'handoff', id: press.runner });
      return;
    }
    const target = this.aimTarget;
    this.aimTarget = null;
    if (!press.aiming || !target) return;
    const problem = throwProblem(this.state, target);
    if (!problem) this.pending = { ...this.pending, throwAt: target };
    else if (problem !== 'tooClose')
      this.hud.pop(problem === 'tooFar' ? 'OUT OF RANGE' : 'OFF THE FIELD', 'bad');
  }

  private cancelPress(): void {
    this.press = null;
    this.aimTarget = null;
  }

  /** Slingshot aiming: pull back and down to throw forward; pull left to aim right. */
  private aimFor(dx: number, dy: number): Vec | null {
    const qb = qbOf(this.state);
    if (!qb) return null;
    return add(qb.pos, v(-dx * YARDS_PER_PIXEL, dy * YARDS_PER_PIXEL));
  }
}
