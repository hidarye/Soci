import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

const PUBLIC_PATHS = new Set([
  ...AUTH_PATHS,
  '/terms',
  '/privacy',
  '/offline',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forceLogin = request.nextUrl.searchParams.get('forceLogin') === '1';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const next = () => {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('x-request-id', requestId);
    return response;
  };

  if (pathname.startsWith('/api/')) return next();
  if (/\.[^/]+$/.test(pathname)) return next();
  if (pathname.startsWith('/api/auth')) return next();
  if (pathname.startsWith('/api/oauth')) return next();
  if (pathname.startsWith('/api/twitter/webhook')) return next();
  if (pathname.startsWith('/api/twitter/stream/sync')) return next();
  if (pathname.startsWith('/api/twitter/stream/debug')) return next();
  if (pathname.startsWith('/api/twitter/poll/now')) return next();
  if (pathname.startsWith('/api/telegram/webhook')) return next();
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (PUBLIC_PATHS.has(pathname)) {
    if (!AUTH_PATHS.has(pathname)) {
      return next();
    }
    if (forceLogin) {
      return next();
    }
    if (!token) return next();
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.redirect(url);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  const taskDetailMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskDetailMatch && taskDetailMatch[1] !== 'new') {
    const url = request.nextUrl.clone();
    url.pathname = '/tasks';
    const response = NextResponse.redirect(url);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const callbackUrl = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set('callbackUrl', callbackUrl);
    const response = NextResponse.redirect(url);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  return next();
}

export const config = {
  matcher: ['/((?!api/auth|api/oauth|api/telegram/webhook|api/twitter/webhook|api/twitter/stream/sync|api/twitter/stream/debug|api/twitter/poll/now|_next|_vercel|static|public|favicon.ico).*)'],
};
