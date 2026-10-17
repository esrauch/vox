import * as THREE from 'three';
import { biomes, hexToNumber, type Hex } from '../content/palettes';
import { tuning } from '../content/tuning';
import { QB_POS, COLS, END_ROW, ROWS, SETUP_ROWS, vec } from '../sim/grid';
import { getGeometry, voxelMaterial } from '../voxel/models';
import { tileToWorld } from './view';

/** The quarterback's model. */
export const QB_MODEL = 'team/qb';

/**
 * The static field: a checkerboard of tiles with the setup zone, end zone,
 * out-of-range rows marked, plus the QB. One merged mesh for
 * the tiles keeps the draw-call count low (TECHNICAL.md §5).
 */
export function createField(): THREE.Group {
  const group = new THREE.Group();

  const palette = biomes.forest;
  const color = (hex: Hex): THREE.Color => new THREE.Color(hexToNumber(hex));
  const light = color(palette.grass);
  const dark = color(palette.grassDark);
  const setup = color(palette.setup);
  const setupDark = color(palette.setupDark);
  const end = color(palette.endZone);
  const endDark = color(palette.endZoneDark);
  const outOfRange = 0.82;

  const tile = new THREE.BoxGeometry(1, 0.3, 1);
  const tiles = new THREE.InstancedMesh(tile, new THREE.MeshLambertMaterial(), COLS * ROWS);
  tiles.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const odd = (x + y) % 2 === 1;
      let color = (odd ? dark : light).clone();
      if (y < SETUP_ROWS) color = (odd ? setupDark : setup).clone();
      if (y === END_ROW) color = (odd ? endDark : end).clone();
      else if (y > tuning.throw.maxRow) color.multiplyScalar(outOfRange);
      const p = tileToWorld(vec(x, y), -0.15);
      matrix.makeTranslation(p.x, p.y, p.z);
      tiles.setMatrixAt(i, matrix);
      tiles.setColorAt(i, color);
      i++;
    }
  }
  group.add(tiles);

  // The QB never moves. It faces the camera so its carved face is visible.
  const qb = new THREE.Mesh(getGeometry(QB_MODEL), voxelMaterial);
  qb.position.copy(tileToWorld(QB_POS)).add(new THREE.Vector3(0, 0, 0.15));
  qb.castShadow = true;
  group.add(qb);

  return group;
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
