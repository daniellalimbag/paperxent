import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return pathname === '/login' || pathname.startsWith('/login/') ||
    pathname === '/register' || pathname.startsWith('/register/');
}

/**
 * Next.js middleware to handle authentication
 * Redirects unauthenticated users from protected routes
 * Redirects authenticated users from login/register to dashboard
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('accessToken')?.value;

  // Check if user is authenticated (cookie is set alongside localStorage after login/register)
  const isAuthenticated = !!accessToken?.trim();

  // Redirect authenticated users away from login/register
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Allow public paths only (never use pathname.startsWith('/') — every path matches)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Redirect to login if no access token on protected routes
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Allow access if authenticated
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*', '/trade/:path*', '/login', '/register'],
};
