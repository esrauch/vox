import { describe, expect, it } from 'vitest';
import { biomes, common, hexToNumber, team, voxel } from '../../src/content/palettes';

const HEX = /^#[0-9a-f]{6}$/;

describe('palettes', () => {
  it('uses lowercase 6-digit hex colors everywhere', () => {
    const all = [
      ...Object.values(common),
      ...Object.values(team),
      ...Object.values(voxel),
      ...Object.values(biomes).flatMap((p) => Object.values(p)),
    ];
    for (const color of all) expect(color).toMatch(HEX);
  });

  it('converts hex to a three.js color number', () => {
    expect(hexToNumber('#ff8a1f')).toBe(0xff8a1f);
  });
});
