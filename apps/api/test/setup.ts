import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load repo-root .env when running tests from apps/api (Vitest cwd).
config({ path: resolve(process.cwd(), '../../.env') });

/** Ensure live-market keys from a developer machine never turn on Marketstack mid-test. */
if (process.env.VITEST === 'true') {
  delete process.env.MARKETSTACK_ACCESS_KEY;
}
