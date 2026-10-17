import * as THREE from 'three';
import { biomes, hexToNumber, type Hex } from '../content/palettes';
import { tuning } from '../content/tuning';
import { COLS, END_ROW, ROWS, SETUP_ROWS, inThrowBand, vec } from '../sim/grid';
import { tileToWorld } from './view';

/**
 * The static field: a checkerboard of tiles with the setup zone, end zone
 * and throwing band marked. One instanced mesh for the tiles keeps the draw-call count low (TECHNICAL.md §5).
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
  // Rows a throw can't reach are dimmed a touch: a subtle hint, not a wall.
  const outOfRange = 0.86;

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
      else if (!inThrowBand(y)) color.multiplyScalar(outOfRange);
      const p = tileToWorld(vec(x, y), -0.15);
      matrix.makeTranslation(p.x, p.y, p.z);
      tiles.setMatrixAt(i, matrix);
      tiles.setColorAt(i, color);
      i++;
    }
  }
  group.add(tiles);

  // Faint chalk lines at the edges of the throwing band.
  const chalk = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
  for (const edge of [tuning.throw.minRow - 0.5, tuning.throw.maxRow + 0.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(COLS, 0.06), chalk);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.005, -edge);
    group.add(line);
  }

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
