import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFENDERS, DEFENDER_KINDS } from '../../src/content/defenders';

describe('defender definitions', () => {
  it('every kind has a voxel model and a unique inspector glyph', () => {
    for (const kind of DEFENDER_KINDS) {
      expect(existsSync(`assets-src/voxels/${DEFENDERS[kind].model}.voxt`), kind).toBe(true);
    }
    const glyphs = DEFENDER_KINDS.map((k) => DEFENDERS[k].glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
