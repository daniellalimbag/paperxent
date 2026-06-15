import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    // Package exports point at dist/index.js, but dist is gitignored. CI builds it, but this
    // keeps Vitest resolvable even if `build -w @paperxent/database` is skipped or stale.
    alias: {
      '@paperxent/database': path.join(repoRoot, 'packages/database/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.integration.test.ts'],
    /** Avoid Prisma write conflicts when multiple integration files hit the same DB concurrently. */
    fileParallelism: false,
    /** Integration tests use seeded Redis quotes, not live Marketstack (developers may have the key in root `.env`). */
    env: {
      MARKETSTACK_ACCESS_KEY: '',
    },
  },
});
