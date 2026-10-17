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

export type CommonColor = keyof typeof common;
export type BigId = keyof typeof bigs;

/** Convert a palette hex string to a 0xRRGGBB number for three.js. */
export function hexToNumber(hex: Hex): number {
  return Number.parseInt(hex.slice(1), 16);
}
