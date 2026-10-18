/**
 * Screenshot the game at phone size, headlessly, to check how it looks
 * (the field, scenery and readability) without a phone in hand.
 *
 *   npm run screenshot                 → previews/game.png (the title, over the first down, seed 8)
 *   npm run screenshot -- 3 call       → seed 3, the first card called (its routes previewed)
 *   npm run screenshot -- 3 play       → seed 3, a moment after the snap
 *   npm run screenshot -- 8 play pitch=50 low   → with extra URL params, saved as previews/low.png
 *
 * Uses the system Chrome through playwright-core.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const ROOT = join(import.meta.dirname, '..');
const [seed = '8', when = 'setup', extraQuery = '', name = ''] = process.argv.slice(2);

const server = await createServer({ root: ROOT, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const address = server.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : 5173;
const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
  await page.goto(`http://localhost:${port}/?seed=${seed}${extraQuery ? `&${extraQuery}` : ''}`);
  await page.waitForTimeout(1500);
  if (when === 'call' || when === 'play') {
    await page.click('.hud-action'); // PLAY
    await page.waitForTimeout(400);
    await page.click('.hud-hand .hud-card >> nth=0');
    await page.waitForTimeout(400);
  }
  if (when === 'play') {
    // Snap: press and let go without pulling (a pull too short to throw just cancels the aim).
    await page.mouse.move(190, 400);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(2600);
  }
  mkdirSync(join(ROOT, 'previews'), { recursive: true });
  const file = join(
    ROOT,
    'previews',
    name ? `${name}.png` : when === 'setup' ? 'game.png' : `game-${when}.png`,
  );
  await page.screenshot({ path: file });
  console.log(file.replace(`${ROOT}/`, ''));
} finally {
  await browser.close();
  await server.close();
}
