import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const KNOWN_AUTH_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.pkce.code_verifier',
  '__Secure-next-auth.pkce.code_verifier',
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'authjs.pkce.code_verifier',
  '__Secure-authjs.pkce.code_verifier',
];

function shouldClearCookie(name: string): boolean {
  if (KNOWN_AUTH_COOKIE_NAMES.includes(name)) return true;
  if (name.includes('next-auth')) return true;
  if (name.includes('authjs')) return true;
  return false;
}

function getAppOrigin(request: NextRequest): string {
  const candidate = (process.env.APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/+$/, '');
  try {
    return new URL(candidate).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

function getSafeRedirectPath(request: NextRequest, appOrigin: string): string {
  const fallback = '/login?cookies=cleared';
  const redirectTarget = request.nextUrl.searchParams.get('redirect');
  if (!redirectTarget) return fallback;

  if (redirectTarget.startsWith('/')) {
    return redirectTarget;
  }

  try {
    const url = new URL(redirectTarget);
    if (url.origin === appOrigin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // fall back below
  }

  return fallback;
}

function applyCookieClears(request: NextRequest, response: NextResponse): NextResponse {
  const incomingCookies = request.cookies.getAll();
  const cleared = new Set<string>();

  for (const cookie of incomingCookies) {
    if (!shouldClearCookie(cookie.name)) continue;
    if (cleared.has(cookie.name)) continue;
    cleared.add(cookie.name);

    response.cookies.set({
      name: cookie.name,
      value: '',
      maxAge: 0,
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-'),
    });
  }

  for (const name of KNOWN_AUTH_COOKIE_NAMES) {
    if (cleared.has(name)) continue;
    response.cookies.set({
      name,
      value: '',
      maxAge: 0,
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: name.startsWith('__Secure-') || name.startsWith('__Host-'),
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const appOrigin = getAppOrigin(request);
  const redirectPath = getSafeRedirectPath(request, appOrigin);
  const response = NextResponse.redirect(`${appOrigin}${redirectPath}`);
  return applyCookieClears(request, response);
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  return applyCookieClears(request, response);
}
