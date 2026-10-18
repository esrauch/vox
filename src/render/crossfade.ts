import * as THREE from 'three';

/** How far through the glide what arrives casts its shadow again. */
const SHADOW_BACK = 0.8;

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
  /** Whether it casts a shadow once it has arrived. */
  readonly castShadow: boolean;
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
 *
 * Shadows don't fade (three.js draws them whatever a material's opacity), so
 * nothing casts one while it's see-through: the leaving copies never do, and
 * what arrives gets its shadow back as it turns solid.
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
        if (!(o instanceof THREE.Mesh)) return;
        o.material = fadeOf(o.material, fades).material;
        o.castShadow = false;
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
        this.arrivals.push({ mesh: o, original: o.material, castShadow: o.castShadow, fade, from });
        o.material = fade.material;
        o.castShadow = false;
      });
    }
  }

  /** `t` from 0 to 1 over the glide. The leaving copies are gone by halfway. */
  update(t: number): void {
    const out = Math.max(0, 1 - t * 2);
    for (const f of this.leavingFades) f.material.opacity = f.base * out;
    for (const a of this.arrivals) {
      a.fade.material.opacity = a.fade.base * (a.from + (1 - a.from) * t);
      // Its shadow comes back once it's nearly solid.
      a.mesh.castShadow = a.castShadow && t >= SHADOW_BACK;
    }
  }

  /** The glide is over: drop the copies, and give everything that arrived its own material back. */
  end(): void {
    for (const copy of [...this.leaving.children]) this.leaving.remove(copy);
    for (const f of this.leavingFades) f.material.dispose();
    this.leavingFades = [];
    const disposed = new Set<THREE.Material>();
    for (const a of this.arrivals) {
      a.mesh.material = a.original;
      a.mesh.castShadow = a.castShadow;
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
