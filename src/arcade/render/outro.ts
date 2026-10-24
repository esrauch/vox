/**
 * The win cutscene (THEME.md, The Story), after the last touchdown: in
 * front of the King, with Jack's pumpkin patch behind him, the whole roster
 * (the seven on the field and everyone on the bench) dances in rows around
 * Jack, and GOT / JACK / BACK slams in a word at a time. It goes on until
 * AGAIN.
 */
import * as THREE from 'three';
import type { Form } from '../sim/types';
import { getGeometry } from '../../voxel/models';
import { playerMesh } from './bodies';
import './intro.css';

/** The camera: back down the field from the dancers, above, looking at them. */
const CAMERA_BACK = 13;
const CAMERA_UP = 5;
const LOOK_HEIGHT = 1.4;
/** The dancers stand this far in front of the King (yards, toward the camera), a row this far apart. */
const FRONT = 2.5;
const ROW_GAP = 1.5;
const PER_ROW = 6;
const SPACING = 1.5;
/** The words land at these times (seconds); then AGAIN can show. */
const WORDS = [0.6, 1.2, 1.8];
const READY = 2.6;

interface Dancer {
  readonly mesh: THREE.Mesh;
  readonly home: THREE.Vector3;
  /** Which dance it does, and its own timing. */
  readonly move: number;
  readonly phase: number;
}

export class ArcadeOutro {
  private readonly group = new THREE.Group();
  private readonly dancers: Dancer[] = [];
  private readonly jack: THREE.Mesh;
  private readonly jackHome: THREE.Vector3;
  private readonly light = new THREE.PointLight(0xffa64d, 40, 16, 1.6);
  private readonly root: HTMLElement;
  private readonly words: HTMLElement[];
  private readonly look = new THREE.Vector3();
  private t = 0;
  private spoken = 0;

  /** `king`: where the King stands (world). The cast: every kind on the roster, field and bench. */
  constructor(
    private readonly scene: THREE.Scene,
    ui: HTMLElement,
    king: THREE.Vector3,
    cast: readonly Form[],
    private readonly sound: (id: 'burst') => void,
  ) {
    // The rows run across the field in front of the King (the camera's side is +z).
    const front = king.z + FRONT;
    cast.forEach((kind, i) => {
      const row = Math.floor(i / PER_ROW);
      const inRow = Math.min(PER_ROW, cast.length - row * PER_ROW);
      const col = i % PER_ROW;
      // Staggered rows, so the back ones show between the front ones.
      const x = king.x + (col - (inRow - 1) / 2) * SPACING + (row % 2 ? SPACING / 2 : 0);
      const home = new THREE.Vector3(x, 0, front + 1.5 - row * ROW_GAP);
      const mesh = playerMesh(kind);
      mesh.position.copy(home);
      this.group.add(mesh);
      this.dancers.push({ mesh, home, move: i % 3, phase: i * 0.7 });
    });
    // Jack bounces in front of them all, glowing.
    this.jack = new THREE.Mesh(
      getGeometry('team/ball'),
      new THREE.MeshBasicMaterial({ vertexColors: true }),
    );
    this.jackHome = new THREE.Vector3(king.x, 0.4, front + 3.2);
    this.group.add(this.jack, this.light);
    scene.add(this.group);

    this.root = document.createElement('div');
    this.root.className = 'intro';
    this.root.innerHTML = `<div class="intro-title"><span>GOT</span><span>JACK</span><span>BACK</span></div>`;
    ui.append(this.root);
    this.words = [...this.root.querySelectorAll<HTMLElement>('.intro-title span')];
    this.look.set(king.x, LOOK_HEIGHT, front);
  }

  /** The words have all landed: time to offer AGAIN. */
  get ready(): boolean {
    return this.t >= READY;
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    this.t += dt;
    const t = this.t;
    camera.position.set(this.look.x, CAMERA_UP, this.look.z + CAMERA_BACK);
    camera.lookAt(this.look);
    camera.updateMatrixWorld();
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = CAMERA_BACK + 10;
      this.scene.fog.far = CAMERA_BACK + 40;
    }

    // Three dances: a bounce, a side-to-side shuffle, and a spin. Each to its own beat.
    for (const d of this.dancers) {
      const beat = t * 7 + d.phase;
      const hop = Math.abs(Math.sin(beat));
      d.mesh.position.copy(d.home);
      d.mesh.rotation.set(0, 0, 0);
      if (d.move === 0) {
        d.mesh.position.y = 0.35 * hop;
      } else if (d.move === 1) {
        d.mesh.position.x = d.home.x + 0.35 * Math.sin(beat / 2);
        d.mesh.position.y = 0.15 * hop;
        d.mesh.rotation.z = 0.2 * Math.sin(beat / 2);
      } else {
        d.mesh.rotation.y = beat * 0.6;
        d.mesh.position.y = 0.2 * hop;
      }
    }
    this.jack.position.copy(this.jackHome).setY(this.jackHome.y + 0.5 * Math.abs(Math.sin(t * 5)));
    this.light.position.copy(this.jack.position).setY(this.jack.position.y + 0.6);

    const landed = WORDS.filter((w) => t >= w).length;
    this.words.forEach((w, i) => w.classList.toggle('show', i < landed));
    if (landed > this.spoken) {
      this.spoken = landed;
      this.sound('burst');
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.root.remove();
  }
}
