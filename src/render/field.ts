import * as THREE from 'three';
import { biomes, hexToNumber, team, type Hex } from '../content/palettes';
import { COLS, ROWS, vec } from '../sim/grid';
import type { DriveState } from '../sim/types';
import { tileToWorld } from './view';

/**
 * The static field: a checkerboard of tiles. One instanced mesh for the tiles
 * keeps the draw-call count low (TECHNICAL.md §5). The lines that move with
 * the drive are DriveLines.
 */
export function createField(): THREE.Group {
  const group = new THREE.Group();
  const palette = biomes.forest;
  const color = (hex: Hex): THREE.Color => new THREE.Color(hexToNumber(hex));
  const light = color(palette.grass);
  const dark = color(palette.grassDark);

  const tile = new THREE.BoxGeometry(1, 0.3, 1);
  const tiles = new THREE.InstancedMesh(tile, new THREE.MeshLambertMaterial(), COLS * ROWS);
  tiles.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = tileToWorld(vec(x, y), -0.15);
      matrix.makeTranslation(p.x, p.y, p.z);
      tiles.setMatrixAt(i, matrix);
      tiles.setColorAt(i, (x + y) % 2 === 1 ? dark : light);
      i++;
    }
  }
  group.add(tiles);
  return group;
}

/**
 * The lines that move with the drive, painted across the field: the line of
 * scrimmage (white, under the front edge of its row) and the first-down line
 * (gold, at the front edge of the row you have to reach).
 */
export class DriveLines {
  private readonly scrimmage: THREE.Mesh;
  private readonly firstDown: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const line = (color: number, opacity: number, width: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(COLS, width),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
      );
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      return mesh;
    };
    this.scrimmage = line(0xffffff, 0.55, 0.08);
    this.firstDown = line(hexToNumber(team.accent), 0.9, 0.12);
  }

  update(drive: DriveState): void {
    // A row's front edge (nearer the camera) is half a tile below its centre.
    this.scrimmage.position.set(0, 0.006, -(drive.los - 0.5));
    this.firstDown.position.set(0, 0.007, -(drive.firstDown - 0.5));
  }
}

/** A thin square outline lying on a tile. */
export function tileOutline(t: { x: number; y: number }, color: number, size: number): THREE.Mesh {
  const shape = new THREE.Shape();
  const o = size / 2;
  const inner = o - 0.08;
  shape.moveTo(-o, -o).lineTo(o, -o).lineTo(o, o).lineTo(-o, o).lineTo(-o, -o);
  const hole = new THREE.Path();
  hole.moveTo(-inner, -inner).lineTo(-inner, inner).lineTo(inner, inner).lineTo(inner, -inner);
  shape.holes.push(hole);
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(tileToWorld(t, 0.01));
  return mesh;
}
