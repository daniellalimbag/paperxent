import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load repo-root .env when running tests from apps/api (Vitest cwd).
config({ path: resolve(process.cwd(), '../../.env') });
