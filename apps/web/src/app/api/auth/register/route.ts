import { NextResponse } from 'next/server';
import { getUpstreamApiUrl } from '@/lib/upstream-api';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '@/lib/auth-cookie-options';

type UpstreamAuthBody = {
  user?: { id: string; email: string; balance: string; createdAt: string };
  tokens?: { accessToken: string; refreshToken: string };
};

export async function POST(req: Request) {
  const upstream = getUpstreamApiUrl().replace(/\/$/, '');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${upstream}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as UpstreamAuthBody;
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (!data.user || !data.tokens?.accessToken || !data.tokens?.refreshToken) {
    return NextResponse.json({ error: 'Invalid upstream auth response' }, { status: 502 });
  }

  const response = NextResponse.json({ user: data.user }, { status: 201 });
  response.cookies.set('accessToken', data.tokens.accessToken, accessTokenCookieOptions());
  response.cookies.set('refreshToken', data.tokens.refreshToken, refreshTokenCookieOptions());
  return response;
}
