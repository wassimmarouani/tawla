import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, negotiateLocale } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { resolveRoute } from '@/lib/routing/resolve-route';
import { buildSecurityHeaders } from '@/lib/security/headers';

const handleMarketing = createIntlMiddleware(routing);

/**
 * Request routing (ADR-0012, ADR-0017). Cheap and DB-free:
 * - marketing paths → next-intl (visible locale prefixes);
 * - app and customer paths → internal rewrite to `/{locale}{path}` (no visible prefix);
 * - unknown first segment → restaurant slug, rewritten to `/{locale}/r/{slug}`;
 * - security headers on every response.
 */
export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
  });
  const decision = resolveRoute(pathname, locale);

  const response =
    decision.kind === 'marketing'
      ? handleMarketing(request)
      : NextResponse.rewrite(new URL(`${decision.pathname}${search}`, request.url));

  const headers = buildSecurityHeaders({
    surface: decision.surface,
    isProduction: env.NODE_ENV === 'production',
    isHttps: env.NEXT_PUBLIC_APP_URL.startsWith('https://'),
  });
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
