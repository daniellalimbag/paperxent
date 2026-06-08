/**
 * Public env defaults for the browser bundle.
 * Must match `API_PORT` in apps/api (see repo `.env.example`).
 * Next.js only loads `.env*` from `apps/web/` unless configured otherwise, so a correct
 * fallback here matters when developers only have a root `.env`.
 */
export const DEFAULT_PUBLIC_API_URL = 'http://localhost:4000';

export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_PUBLIC_API_URL;
}

/** Price WebSocket shares the API server (see `PriceFeedService` in apps/api). */
export function getDefaultWsPricesUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  return getPublicApiUrl().replace(/^http/i, 'ws') + '/ws/prices';
}
