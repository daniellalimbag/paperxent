import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUpstreamApiUrl } from '@/lib/upstream-api';

export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'host',
  'content-length',
  'proxy-connection',
  'te',
  'trailer',
  'upgrade',
]);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path: segments } = await ctx.params;
  const base = getUpstreamApiUrl().replace(/\/$/, '');
  const suffix = segments?.length ? segments.join('/') : '';
  const target = suffix ? `${base}/${suffix}` : base;
  const url = new URL(target);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (HOP_BY_HOP.has(lk) || lk === 'cookie') return;
    headers.set(key, value);
  });

  const access = req.cookies.get('accessToken')?.value;
  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  const method = req.method;
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };
  if (body !== undefined) {
    init.body = body;
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url.toString(), init);
  } catch {
    return NextResponse.json(
      {
        error: {
          message: `Cannot reach API at ${getUpstreamApiUrl()}. For Docker or remote APIs, set API_INTERNAL_URL to a URL the Next.js server can use (see README).`,
        },
      },
      { status: 502 }
    );
  }

  const outHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (['connection', 'keep-alive', 'transfer-encoding'].includes(lk)) return;
    outHeaders.set(key, value);
  });

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
