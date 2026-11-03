import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, negotiateLocale } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import { loginPathFor } from '@/lib/auth/next-path';
import { env } from '@/lib/env';
import { resolveRoute } from '@/lib/routing/resolve-route';
import { buildSecurityHeaders } from '@/lib/security/headers';
import { refreshProxySession, type ProxySession } from '@/lib/supabase/proxy';

const handleMarketing = createIntlMiddleware(routing);
const SUPABASE_ORIGIN = new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;

/** Surfaces whose Supabase session is refreshed here (ADR-0017). */
const SESSION_SEGMENTS: ReadonlySet<string> = new Set(['dashboard', 'admin', 'staff', 'reset']);
/** Surfaces that require a signed-in user. */
const PROTECTED_SEGMENTS: ReadonlySet<string> = new Set(['dashboard', 'admin']);

/**
 * Request routing (ADR-0012, ADR-0017). Cheap and DB-free:
 * - marketing paths → next-intl (visible locale prefixes);
 * - app and customer paths → internal rewrite to `/{locale}{path}` (no visible prefix);
 * - unknown first segment → restaurant slug, rewritten to `/{locale}/r/{slug}`;
 * - Supabase session refresh on authenticated surfaces, login redirect when signed out;
 * - security headers on every response.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
  });
  const decision = resolveRoute(pathname, locale);
  const first = pathname.split('/')[1] ?? '';

  let session: ProxySession | null = null;
  if (decision.kind === 'rewrite' && SESSION_SEGMENTS.has(first)) {
    session = await refreshProxySession(request);
  }

  let response: NextResponse;
  if (session && !session.isAuthenticated && PROTECTED_SEGMENTS.has(first)) {
    response = NextResponse.redirect(new URL(loginPathFor(`${pathname}${search}`), request.url));
  } else if (decision.kind === 'marketing') {
    response = handleMarketing(request);
  } else {
    // Forward the (possibly refreshed) cookies so Server Components see the new session.
    response = NextResponse.rewrite(new URL(`${decision.pathname}${search}`, request.url), {
      request: { headers: request.headers },
    });
  }
  for (const cookie of session?.cookiesToSet ?? []) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  const headers = buildSecurityHeaders({
    surface: decision.surface,
    isProduction: env.NODE_ENV === 'production',
    isHttps: env.NEXT_PUBLIC_APP_URL.startsWith('https://'),
    // Menu images are served by Supabase Storage (ADR-0018).
    imageSources: [SUPABASE_ORIGIN],
    // The back-office uploads photo originals to signed Storage URLs (ADR-0018). Realtime
    // websockets are added with the first subscriber (P1-09).
    connectSources: decision.surface === 'app' ? [SUPABASE_ORIGIN] : [],
  });
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
