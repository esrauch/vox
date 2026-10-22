/**
 * Each kind of player's "photo" for the roster screen: a 12×12 pixel
 * portrait as an inline SVG (crisp squares, no 3D in the overlay). Every one
 * wears the team helmet; the shape says the kind at a glance (THEME.md):
 * a Human's face, a Ghost's sheet, a Golem's wide stone block, a
 * Werewolf's ears and snout.
 */
import { team, voxel, type Hex } from '../../content/palettes';
import type { Form } from '../sim/types';

/** What each letter in a portrait is painted with ('.' is see-through). */
const PAINT: Readonly<Record<string, Hex>> = {
  H: team.helmet,
  h: voxel.leafGoldDark,
  J: team.jersey,
  k: voxel.ink,
  S: voxel.skin,
  W: voxel.white,
  w: voxel.bone,
  R: voxel.stone,
  r: voxel.stoneDark,
  M: voxel.moss,
  y: voxel.glow,
  F: voxel.fur,
  f: voxel.furDark,
  t: voxel.horn,
};

const PORTRAITS: Readonly<Record<Form, readonly string[]>> = {
  human: [
    '....HHHH....',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.Hhhhhhhhhh.',
    '.HSSSSSSSSH.',
    '.HSkSSSSkSH.',
    '.HSSSSSSSSH.',
    '..SSSkkSSS..',
    '...SSSSSS...',
    '....SSSS....',
    '..JJJJJJJJ..',
    '.JJJJJJJJJJ.',
  ],
  ghost: [
    '....HHHH....',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.hhhhhhhhhh.',
    '.WWWWWWWWWW.',
    '.WWkkWWkkWW.',
    '.WWkkWWkkWW.',
    '.WWWWWWWWWW.',
    '.WWWWkkWWWW.',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '.WW.WWW.WWW.',
  ],
  golem: [
    '...HHHHHH...',
    '..HHHHHHHH..',
    '.hhhhhhhhhh.',
    'RRRRRRRRRRRR',
    'RrRRRRRRRrRR',
    'RRyyRRRRyyRR',
    'RRRRRRRRRRRR',
    'RrRRrrrrRRrR',
    'MRRRRRRRRRRM',
    'RRMRRrRRRMRR',
    'RRRRRRRRRRRR',
    'RrRRRRRRRRrR',
  ],
  werewolf: [
    '.F........F.',
    '.FF.HHHH.FF.',
    '.FFHHHHHHFF.',
    '.FhhhhhhhhF.',
    '.FFFFFFFFFF.',
    '.FyFFFFFFyF.',
    '.FFFFFFFFFF.',
    '..FFffffFF..',
    '..FfkkkkfF..',
    '...ftfftf...',
    '..JJJJJJJJ..',
    '.JJJJJJJJJJ.',
  ],
};

/** A kind's portrait as SVG markup (it scales to its box, staying crisp). */
export function kindIcon(kind: Form): string {
  const rows = PORTRAITS[kind];
  const rects: string[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      const fill = PAINT[c];
      if (fill) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`);
    });
  });
  return (
    `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" ` +
    `xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`
  );
}
