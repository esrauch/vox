import { Game } from './game/game';
import type { CameraMode } from './render/view';
import { applyPaletteVars } from './ui/paletteVars';

applyPaletteVars();

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const ui = document.querySelector<HTMLDivElement>('#ui');
if (!canvas || !ui) throw new Error('index.html is missing #game or #ui');

const params = new URLSearchParams(location.search);
const camera: CameraMode = params.get('camera') === 'ortho' ? 'orthographic' : 'perspective';

const game = new Game(canvas, ui, {
  seed: Number(params.get('seed')) || Math.floor(Math.random() * 1e9),
  camera,
  dev: import.meta.env.DEV || params.has('dev'),
});

// Dev builds expose the game for debugging from the console.
if (import.meta.env.DEV) Object.assign(window, { game });
