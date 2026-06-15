import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load repo-root .env when running tests from apps/api (Vitest cwd).
config({ path: resolve(process.cwd(), '../../.env') });

/** Integration tests use seeded Redis quotes, not live market APIs (keys in root `.env` would otherwise enable them). */
delete process.env.MARKETSTACK_ACCESS_KEY;
delete process.env.FINNHUB_API_KEY;
