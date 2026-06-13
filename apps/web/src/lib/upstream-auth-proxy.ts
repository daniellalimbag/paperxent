import { NextResponse } from 'next/server';

export type UpstreamAuthBody = {
  user?: { id: string; email: string; balance: string; createdAt: string };
  tokens?: { accessToken: string; refreshToken: string };
};

type UpstreamJsonResult<T extends Record<string, unknown>> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; response: NextResponse };

/**
 * Server-side fetch to the Express API for auth routes. Surfaces connection failures
 * as JSON so the browser never sees an empty body / HTML from an unhandled throw.
 */
export async function fetchUpstreamAuthJson<T extends Record<string, unknown>>(
  upstreamBaseNoSlash: string,
  path: string,
  init: RequestInit,
): Promise<UpstreamJsonResult<T>> {
  const url = `${upstreamBaseNoSlash}${path}`;
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Network error';
    return {
      ok: false,
      status: 503,
      response: NextResponse.json(
        {
          error: `Cannot reach the API at ${upstreamBaseNoSlash}. ${detail} Start the API (for example \`npm run dev -w @paperxent/api\`), and set API_INTERNAL_URL or NEXT_PUBLIC_API_URL for the Next.js server. On Windows, use http://127.0.0.1:4000 instead of localhost if the connection is refused.`,
        },
        { status: 503 },
      ),
    };
  }

  const data = (await res.json().catch(() => ({}))) as T;

  if (!res.ok) {
    const hasPayload = Object.keys(data).length > 0;
    if (!hasPayload) {
      return {
        ok: false,
        status: res.status,
        response: NextResponse.json(
          {
            error: `The API returned HTTP ${res.status} with no JSON body. Confirm apps/api is running and reachable from Next.js (${upstreamBaseNoSlash}).`,
          },
          { status: res.status >= 400 ? res.status : 502 },
        ),
      };
    }

    return {
      ok: false,
      status: res.status,
      response: NextResponse.json(data, { status: res.status }),
    };
  }

  return { ok: true, status: res.status, data };
}
