import { DEFAULT_PUBLIC_API_URL } from '@/lib/public-env';

/**
 * Base URL for server-side Next.js fetches (Route Handlers, proxy).
 * In Docker or split deployments, the browser may use a public API URL while
 * the Next server must reach the API on an internal hostname (e.g. http://api:4000).
 */
export function getUpstreamApiUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_PUBLIC_API_URL;
}
