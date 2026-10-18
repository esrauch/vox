import * as THREE from 'three';
import { common, hexToNumber } from '../content/palettes';
import { COLS, ROWS, vec } from '../sim/grid';
import { experiment } from './experiments';
import type { Vec } from '../sim/types';

/** Screen space kept free for the HUD, in CSS pixels. */
export interface Insets {
  top: number;
  bottom: number;
}

/** Grid tile → world position (tile centers). Row 0 is nearest the camera. */
export function tileToWorld(t: Vec, y = 0): THREE.Vector3 {
  return new THREE.Vector3(t.x - (COLS - 1) / 2, y, -t.y);
}

/**
 * The three.js side of the game: renderer, scene, lights and the fixed ¾
 * perspective camera (chosen in M1.3), fitted so the whole 9 × 16 field is
 * visible between the HUD bars.
 */
export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(24, 1, 0.5, 200);
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  private insets: Insets = { top: 0, bottom: 0 };
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(hexToNumber(common.sky));

    this.hemi = new THREE.HemisphereLight(0xfff1d6, hexToNumber(common.grassDark), 0.75);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffb36b, 2.1);
    this.sun = sun;
    sun.position.set(-9, 20, 6);
    sun.target.position.set(0, 0, -ROWS / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.bias = -0.0001;
    Object.assign(sun.shadow.camera, {
      left: -14,
      right: 14,
      top: 18,
      bottom: -18,
      near: 1,
      far: 54,
    });
    this.scene.add(sun, sun.target);

    new ResizeObserver(() => this.fit()).observe(canvas);
  }

  /** Where fit() put the camera; scroll() moves it back from there. */
  private readonly basePosition = new THREE.Vector3();

  /**
   * Hold the camera `rows` back down the field from its usual spot (0 = the
   * usual view). Easing this to 0 glides the camera forward up the field:
   * the march from one drive into the next.
   */
  scroll(rows: number): void {
    this.camera.position.copy(this.basePosition).add(new THREE.Vector3(0, 0, rows));
    this.camera.updateMatrixWorld();
  }

  setInsets(insets: Insets): void {
    this.insets = insets;
    this.fit();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** The grid tile under a screen point (client pixels), or null if off the ground. */
  tileAt(clientX: number, clientY: number): Vec | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (!hit) return null;
    return vec(Math.round(hit.x + (COLS - 1) / 2), Math.round(-hit.z));
  }

  /** A world position → CSS pixels within the canvas (for DOM badges). */
  toScreen(world: THREE.Vector3): { x: number; y: number } {
    const p = world.clone().project(this.camera);
    return {
      x: ((p.x + 1) / 2) * this.canvas.clientWidth,
      y: ((1 - p.y) / 2) * this.canvas.clientHeight,
    };
  }

  /**
   * Fit the field into the area between the HUD insets: aim the camera from
   * a fixed angle, then pull back until all four corners fit.
   */
  private fit(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    const availH = Math.max(1, h - this.insets.top - this.insets.bottom);

    const target = new THREE.Vector3(0, 0, -(ROWS - 1) / 2);
    const pitch = THREE.MathUtils.degToRad(experiment.pitch);
    const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    const corners = [
      tileToWorld(vec(-0.5, -0.5)),
      tileToWorld(vec(COLS - 0.5, -0.5)),
      tileToWorld(vec(-0.5, ROWS - 0.5)),
      tileToWorld(vec(COLS - 0.5, ROWS - 0.5)),
      tileToWorld(vec(COLS / 2, 0), 1.9), // the top of the QB, with the ball on it
    ];
    const cam = this.camera;
    const margin = 0.94;
    const fits = (): boolean =>
      corners.every((c) => {
        const p = c.clone().project(cam);
        return Math.abs(p.x) <= margin && Math.abs(p.y) <= margin;
      });

    // Fit against the available area first; the view offset then places it below the top inset.
    cam.clearViewOffset();
    cam.aspect = w / availH;
    cam.updateProjectionMatrix();
    let lo = 5;
    let hi = 200;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      cam.position.copy(target).addScaledVector(dir, mid);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      if (fits()) hi = mid;
      else lo = mid;
    }
    cam.position.copy(target).addScaledVector(dir, hi);
    // Fog starts just beyond the end zone, so the field stays crisp and the woods fade.
    if (this.scene.fog instanceof THREE.Fog) {
      const far = cam.position.distanceTo(tileToWorld(vec(COLS / 2, ROWS)));
      this.scene.fog.near = far + 1;
      this.scene.fog.far = far + 22;
    }
    cam.lookAt(target);
    this.basePosition.copy(cam.position);
    cam.setViewOffset(w, availH, 0, -this.insets.top, w, h);
    cam.updateProjectionMatrix();
  }
}
