/**
 * The single source of truth for colors. It feeds voxel vertex colors, CSS
 * custom properties and SVG fills, so 3D and 2D always match (TECHNICAL.md §9).
 */

export type Hex = `#${string}`;

/** Shared colors used everywhere: the field, the sky, the UI chrome. */
export const common = {
  sky: '#8fd3ff',
  grass: '#7ed957',
  grassDark: '#6cc447',
  pumpkin: '#ff8a1f',
  candyPurple: '#a259ff',
  slimeGreen: '#9cff2e',
  bone: '#f7f1e3',
  ink: '#2b2140',
  white: '#ffffff',
} as const satisfies Record<string, Hex>;

/** Per-Big theme palettes (THEME.md, Art Direction). */
export const bigs = {
  groundskeeper: {
    primary: '#b9a7ff', // lavender
    secondary: '#8ff0c8', // mint green
    accent: '#f7f1e3', // bone white
  },
  elderBough: {
    primary: '#ff8a1f', // pumpkin orange
    secondary: '#e2543b', // autumn red
    accent: '#ffd23f', // golden yellow
  },
  slagfather: {
    primary: '#ff6b1a', // ember orange
    secondary: '#e8344e', // cherry red
    accent: '#ffc94a', // gold
  },
} as const satisfies Record<string, Record<'primary' | 'secondary' | 'accent', Hex>>;

/**
 * Named colors that voxel models (.voxt) refer to. Models use these names,
 * never raw hex, so changing a color here recolors every model that uses it.
 */
export const voxel = {
  ink: '#2b2140',
  white: '#ffffff',
  bone: '#f7f1e3',
  glow: '#ffd23f',
  glowHot: '#fff2a8',
  pumpkin: '#ff8a1f',
  pumpkinDark: '#e06a10',
  stemGreen: '#5a8f2e',
  leafGold: '#ffb627',
  leafGoldDark: '#e8901a',
  leafRed: '#e2543b',
  leafOrange: '#ff7a2f',
  acornCap: '#9c5a2c',
  acornStem: '#6b4423',
  bark: '#7a4e2d',
  barkDark: '#5a3a22',
  moss: '#6cc447',
  // Defenders: every biome's locals wear candy purple, so the opposition always reads as "not us".
  purple: '#a259ff',
  purpleDark: '#6b2fc4',
  purpleLight: '#c9a2ff',
  skin: '#ffcfa0',
  straw: '#e8c65a',
  burlap: '#e9d8a6',
  horn: '#f3e6c4',
} as const satisfies Record<string, Hex>;

export type VoxelColor = keyof typeof voxel;
export type CommonColor = keyof typeof common;
export type BigId = keyof typeof bigs;

/** Convert a palette hex string to a 0xRRGGBB number for three.js. */
export function hexToNumber(hex: Hex): number {
  return Number.parseInt(hex.slice(1), 16);
}
