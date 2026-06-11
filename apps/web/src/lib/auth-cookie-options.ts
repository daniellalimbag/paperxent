const ACCESS_MAX_AGE_SEC = 60 * 15; // matches API JWT access expiry (15m)
const REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7d

export function accessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ACCESS_MAX_AGE_SEC,
  };
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: REFRESH_MAX_AGE_SEC,
  };
}
