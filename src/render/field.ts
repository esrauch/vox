import * as THREE from 'three';
import { bigs, common, hexToNumber } from '../content/palettes';
import { tuning } from '../content/tuning';
import { BIG_POS, COLS, END_ROW, POCKET, ROWS, SETUP_ROWS, vec } from '../sim/grid';
import { tileToWorld } from './view';

/**
 * The static field: a checkerboard of tiles with the setup zone, end zone,
 * out-of-range rows and the pocket marked, plus the Big. One merged mesh for
 * the tiles keeps the draw-call count low (TECHNICAL.md §5).
 */
export function createField(): THREE.Group {
  const group = new THREE.Group();

  const light = new THREE.Color(hexToNumber(common.grass));
  const dark = new THREE.Color(hexToNumber(common.grassDark));
  const setup = new THREE.Color(0x9be27a);
  const setupDark = new THREE.Color(0x86d266);
  const end = new THREE.Color(hexToNumber(bigs.elderBough.accent));
  const endDark = end.clone().multiplyScalar(0.92);
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

  // The pocket: an outline on the one tile in front of the Big.
  group.add(tileOutline(POCKET, hexToNumber(bigs.slagfather.secondary), 0.9));

  // The Big: a tall placeholder block that never moves.
  const big = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.2, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x8a5a2b }),
  );
  // Kept low and set back a little so the Blocker standing in the pocket stays visible.
  big.position.copy(tileToWorld(BIG_POS, 0.6)).add(new THREE.Vector3(0, 0, 0.2));
  big.castShadow = true;
  group.add(big);

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
