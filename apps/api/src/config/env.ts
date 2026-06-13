import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** `apps/api` (contains this package's package.json) */
const apiPackageRoot = path.resolve(__dirname, '../..');
/** Monorepo root (parent of `apps/`) */
const monorepoRoot = path.resolve(apiPackageRoot, '../..');

// Load env from repo root first, then override with apps/api/.env (common dev mistake: key only in root .env)
loadEnv({ path: path.join(monorepoRoot, '.env') });
loadEnv({ path: path.join(apiPackageRoot, '.env'), override: true });

// Integration tests expect the simulated Redis feed; never use live Marketstack during Vitest.
if (process.env.VITEST === 'true') {
  delete process.env.MARKETSTACK_ACCESS_KEY;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://paperxent:paperxent@localhost:5432/paperxent?schema=public'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
});

export const env = envSchema.parse(process.env);
