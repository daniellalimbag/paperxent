/**
 * Load repo-root `.env` then run Prisma CLI (workspace scripts run from packages/database).
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');

config({ path: resolve(repoRoot, '.env') });

const prismaArgs = process.argv.slice(2);
const result = spawnSync('prisma', prismaArgs, {
  cwd: packageRoot,
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
