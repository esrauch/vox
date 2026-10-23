/**
 * Biome scenery: everything around the field. The camera looks down so
 * steeply that no sky shows, so the "background" is the ground: a forest
 * floor, a tree line behind the end zone, props along the sidelines, and fog
 * thickening into the distance. Nothing here affects play.
 */
import * as THREE from 'three';
import { biomes, hexToNumber, type Hex } from '../content/palettes';
import { createRng } from '../sim/rng';
import { getGeometry, voxelMaterial } from '../voxel/models';

/** Where the field is, in world units: the scenery goes around it. */
export interface FieldLayout {
  /** Half the field's width (x runs from -halfWidth to halfWidth). */
  readonly halfWidth: number;
  /** The long field runs from nearZ (nearest the camera) to farZ… */
  readonly nearZ: number;
  readonly farZ: number;
  /** …and the field the sim plays on ends at endZ (the back of the end zone). */
  readonly endZ: number;
}

/** Which part of the scenery a prop belongs to (see ForestScenery). */
type Part = 'always' | 'beyond' | 'treeLine';

interface Placement {
  readonly part: Part;
  readonly model: string;
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
  readonly scale: number;
}

export interface Mood {
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
}

/**
 * The Forest around the long field: toadstools, stumps and trees along the
 * sidelines the whole way, and on the Boss drive a tree line closing the
 * field off behind the end zone. (The 'beyond' part, shown only while
 * there's another drive to come, is empty in the Forest.)
 */
export class ForestScenery {
  readonly group: THREE.Group;
  private readonly beyond = new THREE.Group();
  private readonly treeLine = new THREE.Group();

  constructor(scene: THREE.Scene, mood: Mood, layout: FieldLayout) {
    this.group = createForestScenery(scene, mood, layout, {
      beyond: this.beyond,
      treeLine: this.treeLine,
    });
    this.setEnd(false);
  }

  /** On the Boss drive the field ends at the woods; otherwise it runs on. */
  setEnd(ends: boolean): void {
    this.beyond.visible = !ends;
    this.treeLine.visible = ends;
  }
}

/** Build the Forest around the field and set the haunted-dusk mood. */
function createForestScenery(
  scene: THREE.Scene,
  mood: Mood,
  layout: FieldLayout,
  parts: { beyond: THREE.Group; treeLine: THREE.Group },
): THREE.Group {
  const palette = biomes.forest;
  scene.background = new THREE.Color(hexToNumber(palette.fog));
  scene.fog = new THREE.Fog(hexToNumber(palette.fog), 30, 60); // View.fit() sets the real range
  mood.hemi.color.set(hexToNumber(palette.hemiSky));
  mood.hemi.groundColor.set(hexToNumber(palette.hemiGround));
  mood.hemi.intensity = 1.25;
  mood.sun.color.set(hexToNumber(palette.moon));
  mood.sun.intensity = 1.7;

  const group = new THREE.Group();
  group.add(forestFloor(palette.floor, layout), parts.beyond, parts.treeLine);
  const into: Readonly<Record<Part, THREE.Group>> = { always: group, ...parts };
  const all = forestPlacements(layout);
  for (const part of ['always', 'beyond', 'treeLine'] as const) {
    for (const [model, placements] of groupBy(all.filter((p) => p.part === part))) {
      into[part].add(instanced(model, placements));
    }
  }
  return group;
}

/** A big ground plane with a blotchy, leaf-strewn pixel texture. */
function forestFloor(base: Hex, { nearZ, farZ, halfWidth }: FieldLayout): THREE.Mesh {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    const rng = createRng(7);
    // Soft, low-contrast patches of moss and earth, with a few fallen leaves.
    const blotches = ['#29402f', '#223529', '#2b3a2a'];
    const leaves = ['#a8562b', '#c98a3a', '#8e3b2c'];
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rng.pick(blotches);
      g.fillRect(rng.int(0, size - 1), rng.int(0, size - 1), rng.int(2, 6), rng.int(2, 5));
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle = rng.pick(leaves);
      g.fillRect(rng.int(0, size - 1), rng.int(0, size - 1), 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const length = nearZ - farZ + 40;
  const width = Math.max(96, halfWidth * 2 + 70);
  texture.repeat.set((12 * width) / 96, (12 * length) / 96);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshLambertMaterial({ map: texture }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.3, (nearZ + farZ) / 2);
  floor.receiveShadow = true;
  return floor;
}

/** Where every prop goes. Deterministic, so the forest looks the same every run. */
function forestPlacements(layout: FieldLayout): Placement[] {
  const { halfWidth: FIELD_HALF_W, nearZ: NEAR_Z, farZ: FAR_Z, endZ: FIELD_FAR_Z } = layout;
  const rng = createRng(2026);
  const out: Placement[] = [];
  const taken: { x: number; z: number; r: number }[] = [];
  let part: Part = 'always';
  const place = (model: string, x: number, z: number, radius: number, scale = 1): boolean => {
    if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < t.r + radius)) return false;
    taken.push({ x, z, r: radius });
    out.push({ part, model, x, z, rotation: rng.int(0, 3) * (Math.PI / 2), scale });
    return true;
  };
  const scatter = (
    model: string,
    count: number,
    radius: number,
    area: () => { x: number; z: number },
    scale: () => number = () => 1,
  ): void => {
    for (let placed = 0, tries = 0; placed < count && tries < count * 30; tries++) {
      const { x, z } = area();
      if (place(model, x, z, radius, scale())) placed++;
    }
  };
  const side = (min: number, max: number) => () => ({
    x: (rng.next() < 0.5 ? -1 : 1) * (FIELD_HALF_W + min + rng.next() * (max - min)),
    z: NEAR_Z - rng.next() * (NEAR_Z - FAR_Z),
  });
  /** How many times longer the sidelines are than the field the sim plays on. */
  const long = (NEAR_Z - FAR_Z) / (3 - FIELD_FAR_Z);

  // The tree line behind the end zone, on the Boss drive.
  part = 'treeLine';
  scatter(
    'forestProps/pine',
    26,
    1.1,
    () => ({
      x: -(FIELD_HALF_W + 6.5) + rng.next() * (FIELD_HALF_W + 6.5) * 2,
      z: FIELD_FAR_Z - 1.5 - rng.next() * 9,
    }),
    () => 0.9 + rng.next() * 0.5,
  );
  scatter(
    'forestProps/deadTree',
    7,
    0.8,
    () => ({
      x: -(FIELD_HALF_W + 4.5) + rng.next() * (FIELD_HALF_W + 4.5) * 2,
      z: FIELD_FAR_Z - 1 - rng.next() * 4,
    }),
    () => 1 + rng.next() * 0.4,
  );
  // The woods along the sides, the whole length of the long field: toadstools and stumps
  // close in, trees behind. (No pumpkins: they're for the Farm.)
  part = 'always';
  const n = (count: number): number => Math.round(count * long);
  scatter('forestProps/toadstools', n(16), 0.4, side(1.2, 4));
  scatter('forestProps/stump', n(10), 0.5, side(1.6, 4.5));
  scatter('forestProps/deadTree', n(8), 0.9, side(3, 6));
  scatter('forestProps/pine', n(14), 1.1, side(4.5, 9), () => 0.9 + rng.next() * 0.4);
  return out;
}

function groupBy(placements: readonly Placement[]): Map<string, Placement[]> {
  const map = new Map<string, Placement[]>();
  for (const p of placements) map.set(p.model, [...(map.get(p.model) ?? []), p]);
  return map;
}

/** One draw call per prop model, however many copies there are. */
function instanced(model: string, placements: readonly Placement[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(getGeometry(model), voxelMaterial, placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  placements.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation);
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(p.scale, p.scale, p.scale));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
