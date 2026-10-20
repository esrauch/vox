import { ArcadeGame } from './arcade/game';
import { Game } from './game/game';
import { applyPaletteVars } from './ui/paletteVars';

applyPaletteVars();

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const ui = document.querySelector<HTMLDivElement>('#ui');
if (!canvas || !ui) throw new Error('index.html is missing #game or #ui');

/** How long to wait for the font before starting anyway (a slow or failed load). */
const FONT_TIMEOUT_MS = 3000;

// Build the game only once Creepster is ready, so no text ever shows in a fallback font.
await Promise.race([
  document.fonts.load("1em 'Creepster'").catch(() => undefined),
  new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
]);

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
// The arcade game (GAMEPLAY.md, 2026-10-19); ?grid=1 still plays the old grid game until it's removed.
const game = params.has('grid')
  ? new Game(canvas, ui, { seed })
  : new ArcadeGame(canvas, ui, { seed });

// Dev builds expose the game for debugging from the console.
if (import.meta.env.DEV) Object.assign(window, { game });
