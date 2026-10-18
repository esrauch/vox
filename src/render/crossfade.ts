import * as THREE from 'three';

type FadeMaterial = THREE.Material & { opacity: number };

/** A see-through copy of a material, and the opacity the original had. */
interface Fade {
  readonly material: FadeMaterial;
  readonly base: number;
}

/** Something that fades in: its own mesh, wearing a see-through copy of its material until the fade ends. */
interface Arrival {
  readonly mesh: THREE.Mesh;
  readonly original: THREE.Material | THREE.Material[];
  readonly fade: Fade;
  /** The opacity it fades in from (0..1 of its own). */
  readonly from: number;
}

/**
 * The hand-over between two drives while the camera glides up the field
 * (game.ts): nothing on the field may pop. What was on the field stays where
 * it stood, as a still copy fading away behind the camera, and what lines up
 * for the next drive fades in where it stands (the next defense from its
 * waiting ghosts, the QB and the line from nothing).
 */
export class Crossfade {
  private readonly leaving = new THREE.Group();
  private leavingFades: Fade[] = [];
  private arrivals: Arrival[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.leaving);
  }

  /**
   * Copy the objects leaving the field (call before their views move on),
   * shifted `rows` back down the field, the way the new drive's rows are
   * numbered (the new line of scrimmage is the old first-down line).
   */
  leave(objects: readonly THREE.Object3D[], rows: number): void {
    const fades = new Map<THREE.Material, Fade>();
    for (const object of objects) {
      if (!object.visible) continue;
      const copy = object.clone();
      copy.position.z += rows;
      copy.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = fadeOf(o.material, fades).material;
      });
      this.leaving.add(copy);
    }
    this.leavingFades = [...fades.values()];
  }

  /** Fade these objects in from `from` of their opacity. */
  arrive(objects: readonly THREE.Object3D[], from: number): void {
    const fades = new Map<THREE.Material, Fade>();
    for (const object of objects) {
      object.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const fade = fadeOf(o.material, fades);
        this.arrivals.push({ mesh: o, original: o.material, fade, from });
        o.material = fade.material;
      });
    }
  }

  /** `t` from 0 to 1 over the glide. The leaving copies are gone by halfway. */
  update(t: number): void {
    const out = Math.max(0, 1 - t * 2);
    for (const f of this.leavingFades) f.material.opacity = f.base * out;
    for (const a of this.arrivals)
      a.fade.material.opacity = a.fade.base * (a.from + (1 - a.from) * t);
  }

  /** The glide is over: drop the copies, and give everything that arrived its own material back. */
  end(): void {
    for (const copy of [...this.leaving.children]) this.leaving.remove(copy);
    for (const f of this.leavingFades) f.material.dispose();
    this.leavingFades = [];
    const disposed = new Set<THREE.Material>();
    for (const a of this.arrivals) {
      a.mesh.material = a.original;
      if (!disposed.has(a.fade.material)) a.fade.material.dispose();
      disposed.add(a.fade.material);
    }
    this.arrivals = [];
  }
}

/** One see-through copy per material, shared by every mesh wearing it. */
function fadeOf(
  material: THREE.Material | THREE.Material[],
  fades: Map<THREE.Material, Fade>,
): Fade {
  const original = Array.isArray(material) ? material[0] : material;
  if (!original) throw new Error('A mesh without a material');
  let fade = fades.get(original);
  if (!fade) {
    const copy = original.clone() as FadeMaterial;
    const base = copy.transparent ? copy.opacity : 1;
    copy.transparent = true;
    copy.depthWrite = false;
    fade = { material: copy, base };
    fades.set(original, fade);
  }
  return fade;
}
