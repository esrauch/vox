/**
 * Embers: glowing cubes that drift up off the pumpkin ball, trail behind it
 * in flight, and burst out when it's thrown, caught or knocked down. One
 * instanced mesh of small unlit cubes, pooled: each lives a moment, rising,
 * shrinking and cooling from white-hot through yellow and orange to a dark
 * red; one in five is a big flame chunk, so they read from the game camera.
 * The cutscenes each have their own (around their own Jack).
 */
import * as THREE from 'three';

const MAX = 1500;
const WHITE = new THREE.Color(0xfff6d0);
const HOT = new THREE.Color(0xffd23f);
const WARM = new THREE.Color(0xff8a1f);
const COOL = new THREE.Color(0x8e2a12);

interface Ember {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  readonly span: number;
  readonly size: number;
}

export class Embers {
  private readonly mesh: THREE.InstancedMesh;
  private readonly live: Ember[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly color = new THREE.Color();
  /** Fractional embers owed by `emit` rates between frames. */
  private owed = 0;

  /** Show or hide them all (the win cutscene). */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  constructor(private readonly scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      MAX,
    );
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  /** Take them off the scene for good (a cutscene's own, when it ends). */
  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
  }

  /** A steady stream from `at`: `rate` embers a second, flung out at up to `speed`. */
  stream(at: THREE.Vector3, rate: number, dt: number, speed = 0.6, spread = 0.35): void {
    this.owed += rate * dt;
    while (this.owed >= 1) {
      this.owed -= 1;
      this.spawn(at, speed, spread, 0.7 + Math.random() * 0.7);
    }
  }

  /** A burst of `count` embers from `at`, flung out at up to `speed`. */
  burst(at: THREE.Vector3, count: number, speed = 4): void {
    for (let i = 0; i < count; i++) this.spawn(at, speed, 0.3, 0.7 + Math.random() * 0.8);
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      if (!e) continue;
      e.life -= dt;
      if (e.life <= 0) {
        this.live.splice(i, 1);
        continue;
      }
      // Embers rise, and slow as they cool.
      e.vel.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
      e.vel.y += 2.4 * dt;
      e.pos.addScaledVector(e.vel, dt);
    }
    this.live.forEach((e, i) => {
      const t = 1 - e.life / e.span;
      // A pop of white heat at birth, then it shrinks as it cools.
      const s = e.size * (t < 0.1 ? 0.7 + 3 * t : 1 - (t - 0.1) * 0.85);
      this.matrix.makeScale(s, s, s).setPosition(e.pos);
      this.mesh.setMatrixAt(i, this.matrix);
      if (t < 0.15) this.color.copy(WHITE).lerp(HOT, t / 0.15);
      else if (t < 0.5) this.color.copy(HOT).lerp(WARM, (t - 0.15) / 0.35);
      else this.color.copy(WARM).lerp(COOL, (t - 0.5) / 0.5);
      this.mesh.setColorAt(i, this.color);
    });
    this.mesh.count = this.live.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private spawn(at: THREE.Vector3, speed: number, spread: number, span: number): void {
    if (this.live.length >= MAX) this.live.shift();
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.8,
      Math.random() - 0.5,
    ).normalize();
    this.live.push({
      pos: at
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            Math.random() * spread,
            (Math.random() - 0.5) * spread,
          ),
        ),
      vel: dir.multiplyScalar(speed * (0.3 + Math.random() * 0.7)),
      life: span,
      span,
      // Mostly sparks, and every so often a big flame chunk.
      size: Math.random() < 0.2 ? 0.2 + Math.random() * 0.12 : 0.09 + Math.random() * 0.09,
    });
  }
}
