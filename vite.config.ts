import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// One multi-page site: the hub at / and every game at /games/<name>/.
// Each game is still a standalone Vite project (npm run dev -w games/<name>).
const games = readdirSync(resolve(__dirname, 'games'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

export default defineConfig({
  base: './',
  // In dev, /api goes to the mock (npm run dev:api) or to any URL in ARCADE_API (e.g. the production site).
  server: { host: true, proxy: { '/api': { target: process.env.ARCADE_API ?? 'http://localhost:5199', changeOrigin: true } } },
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['hub', resolve(__dirname, 'index.html')],
        ...games.map((g) => [g, resolve(__dirname, 'games', g, 'index.html')]),
      ]),
    },
  },
  test: {
    environment: 'node',
    include: ['games/*/tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts', 'api/_tests/**/*.test.ts'],
  },
});
