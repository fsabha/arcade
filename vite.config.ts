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
  server: { host: true },
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
    include: ['games/*/tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts'],
  },
});
