import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUpstreamApiUrl } from '@/lib/upstream-api';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '@/lib/auth-cookie-options';
import { fetchUpstreamAuthJson, type UpstreamAuthBody } from '@/lib/upstream-auth-proxy';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken?.trim()) {
    return NextResponse.json({ error: 'Refresh token is required' }, { status: 401 });
  }

  const upstream = getUpstreamApiUrl().replace(/\/$/, '');
  const result = await fetchUpstreamAuthJson<UpstreamAuthBody>(upstream, '/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!result.ok) {
    const response = result.response;
    if (result.status === 401) {
      response.cookies.set('accessToken', '', { ...accessTokenCookieOptions(), maxAge: 0 });
      response.cookies.set('refreshToken', '', { ...refreshTokenCookieOptions(), maxAge: 0 });
    }
    return response;
  }

  const { data } = result;

  if (!data.user || !data.tokens?.accessToken || !data.tokens?.refreshToken) {
    return NextResponse.json({ error: 'Invalid upstream auth response' }, { status: 502 });
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set('accessToken', data.tokens.accessToken, accessTokenCookieOptions());
  response.cookies.set('refreshToken', data.tokens.refreshToken, refreshTokenCookieOptions());
  return response;
}
