import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUpstreamApiUrl } from '@/lib/upstream-api';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '@/lib/auth-cookie-options';

function clearAuthCookies(res: NextResponse) {
  res.cookies.set('accessToken', '', { ...accessTokenCookieOptions(), maxAge: 0 });
  res.cookies.set('refreshToken', '', { ...refreshTokenCookieOptions(), maxAge: 0 });
}

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  const upstream = getUpstreamApiUrl().replace(/\/$/, '');

  if (refreshToken) {
    try {
      await fetch(`${upstream}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Still clear cookies locally
    }
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
