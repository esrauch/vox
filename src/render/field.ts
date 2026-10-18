import * as THREE from 'three';
import { biomes, hexToNumber, team, type Hex } from '../content/palettes';
import { tuning } from '../content/tuning';
import { COLS, ROWS, vec } from '../sim/grid';
import type { DriveState } from '../sim/types';
import { tileToWorld } from './view';

/**
 * How far the turf runs on past the field the sim plays on, in rows. Behind:
 * a whole drive's worth, since the camera glides up from the old drive's
 * view into the next. Ahead: on into the fog, so on the first three drives
 * the field never seems to end (GAMEPLAY.md, One Long Field).
 */
export const TURF_BEHIND = tuning.drive.distance + 8;
export const TURF_AHEAD = 40;

/**
 * The static field: a checkerboard of tiles that looks like one long field.
 * The rows past the top only show while there's another drive to come: on the
 * Boss drive the field ends at the end zone and the woods (setEnd). One
 * instanced mesh per part keeps the draw-call count low (TECHNICAL.md §5).
 * The lines that move with the drive are DriveLines.
 */
export class Turf {
  readonly group = new THREE.Group();
  /** The turf past the top of the field, hidden on the Boss drive. */
  private readonly beyond: THREE.InstancedMesh;

  constructor() {
    this.group.add(turfRows(-TURF_BEHIND, ROWS));
    this.beyond = turfRows(ROWS, ROWS + TURF_AHEAD);
    this.group.add(this.beyond);
  }

  /** On the Boss drive the field ends past the end zone; otherwise it runs on. */
  setEnd(ends: boolean): void {
    this.beyond.visible = !ends;
  }
}

/** Checkerboard tiles for rows [from, to). */
function turfRows(from: number, to: number): THREE.InstancedMesh {
  const palette = biomes.forest;
  const color = (hex: Hex): THREE.Color => new THREE.Color(hexToNumber(hex));
  const light = color(palette.grass);
  const dark = color(palette.grassDark);

  const tile = new THREE.BoxGeometry(1, 0.3, 1);
  const tiles = new THREE.InstancedMesh(tile, new THREE.MeshLambertMaterial(), COLS * (to - from));
  tiles.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let i = 0;
  for (let y = from; y < to; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = tileToWorld(vec(x, y), -0.15);
      matrix.makeTranslation(p.x, p.y, p.z);
      tiles.setMatrixAt(i, matrix);
      tiles.setColorAt(i, (((x + y) % 2) + 2) % 2 === 1 ? dark : light);
      i++;
    }
  }
  return tiles;
}

/**
 * The lines that move with the drive, painted across the field: the line of
 * scrimmage (white, under the front edge of its row) and the first-down line
 * (gold, at the front edge of the row you have to reach). On the Boss drive
 * that line is the goal line, with the end zone painted past it.
 */
export class DriveLines {
  private readonly scrimmage: THREE.Mesh;
  private readonly firstDown: THREE.Mesh;
  /** On the Boss drive the line is the goal line: the field past it is painted as an end zone. */
  private readonly endZone: THREE.Mesh;

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
    this.endZone = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS, 1),
      new THREE.MeshBasicMaterial({
        color: hexToNumber(team.jersey),
        transparent: true,
        opacity: 0.28,
      }),
    );
    this.endZone.rotation.x = -Math.PI / 2;
    scene.add(this.endZone);
  }

  update(drive: DriveState): void {
    // A row's front edge (nearer the camera) is half a tile below its centre.
    this.scrimmage.position.set(0, 0.006, -(drive.los - 0.5));
    this.firstDown.position.set(0, 0.007, -(drive.firstDown - 0.5));
    const boss = drive.kind === 'boss';
    this.endZone.visible = boss;
    if (boss) {
      const depth = ROWS - drive.firstDown;
      this.endZone.scale.set(1, depth, 1);
      this.endZone.position.set(0, 0.005, -(drive.firstDown - 0.5 + depth / 2));
    }
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
