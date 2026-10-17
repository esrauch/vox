import { startHelloScene } from './render/helloScene';
import { applyPaletteVars } from './ui/paletteVars';

applyPaletteVars();

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const ui = document.querySelector<HTMLDivElement>('#ui');
if (!canvas || !ui) throw new Error('index.html is missing #game or #ui');

startHelloScene(canvas);

ui.innerHTML = `
  <div class="title">Fee Fi Fo Fumble</div>
  <div class="build-tag">M1.0 scaffold${import.meta.env.DEV ? ' · dev' : ''}</div>
`;
