/**
 * The arcade field: one long strip of turf with a stripe every yard (a
 * lighter band every five), and the lines that move with the drive.
 */
import * as THREE from 'three';
import { biomes, hexToNumber, team } from '../../content/palettes';
import { arcadeTuning } from '../content/tuning';
import type { Drive } from '../sim/types';
import { biomeAtYard } from './world';
import type { Biome } from '../content/defense';
import { FIELD_AHEAD, FIELD_BEHIND } from './world';

const HALF = arcadeTuning.field.halfWidth;

export function createArcadeTurf(): THREE.Group {
  const group = new THREE.Group();
  // Each area's stretch of turf in its own colours (the Forest's greens, the Candy Kingdom's pinks).
  const shades = (biome: Biome) => ({
    light: new THREE.Color(hexToNumber(biomes[biome].grass)),
    dark: new THREE.Color(hexToNumber(biomes[biome].grassDark)),
  });
  const rows = FIELD_BEHIND + FIELD_AHEAD;
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(HALF * 2, 0.3, 1),
    new THREE.MeshLambertMaterial(),
    rows,
  );
  tiles.receiveShadow = true;
  const m = new THREE.Matrix4();
  for (let i = 0; i < rows; i++) {
    const y = i - FIELD_BEHIND;
    m.makeTranslation(0, -0.15, -(y + 0.5));
    tiles.setMatrixAt(i, m);
    const { light, dark } = shades(biomeAtYard(y));
    tiles.setColorAt(i, Math.floor(y / 5) % 2 === 0 ? light : dark);
  }
  group.add(tiles);
  // Chalk sidelines.
  for (const sign of [-1, 1]) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, rows),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(sign * HALF, 0.005, -(rows / 2 - FIELD_BEHIND));
    group.add(line);
  }
  return group;
}

/** The line of scrimmage (white), the first-down line (gold), and the end zone on the Boss drive. */
export class ArcadeLines {
  private readonly scrimmage: THREE.Mesh;
  private readonly firstDown: THREE.Mesh;
  private readonly endZone: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const plane = (color: number, opacity: number, depth: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(HALF * 2, depth),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
      );
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      return mesh;
    };
    this.scrimmage = plane(0xffffff, 0.6, 0.12);
    this.firstDown = plane(hexToNumber(team.accent), 0.9, 0.18);
    this.endZone = plane(hexToNumber(team.jersey), 0.28, 10);
  }

  update(drive: Drive, origin: number): void {
    this.scrimmage.position.set(0, 0.008, -(origin + drive.los));
    this.firstDown.position.set(0, 0.009, -(origin + drive.firstDown));
    this.endZone.visible = drive.kind === 'boss';
    this.endZone.position.set(0, 0.007, -(origin + drive.firstDown + 5));
  }
}
