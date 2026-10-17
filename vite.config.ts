import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any subpath (e.g. GitHub Pages /vox/).
  base: './',
  build: {
    target: 'es2022',
    // three.js alone is ~520 kB minified (~130 kB gzipped), which is expected.
    chunkSizeWarningLimit: 800,
    // Only the game page ships. Pages under /dev/ are served by the dev server
    // but never included in production builds.
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html') },
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
