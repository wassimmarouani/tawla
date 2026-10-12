import { isLocale, type Locale } from '@/i18n/locales';

/**
 * First path segments served by marketing pages with visible locale prefixes (`/ar/pricing`).
 * Empty string = home page.
 */
export const MARKETING_SEGMENTS = ['', 'pricing', 'legal'] as const;

/** First path segments of app surfaces. Visible URLs carry no locale (ADR-0012). */
export const APP_SEGMENTS = [
  't',
  'r',
  'login',
  'signup',
  'reset',
  'dashboard',
  'staff',
  'admin',
  'dev',
] as const;

/** Segments never seen by the proxy (excluded by its matcher) but still reserved as slugs. */
export const SYSTEM_SEGMENTS = ['api', '_next', '_vercel'] as const;

export type Surface = 'marketing' | 'customer' | 'app';

export type RouteDecision =
  | { kind: 'marketing'; surface: 'marketing' }
  | { kind: 'rewrite'; surface: Surface; pathname: string };

const CUSTOMER_SEGMENTS: ReadonlySet<string> = new Set(['t', 'r']);
const marketingSet: ReadonlySet<string> = new Set(MARKETING_SEGMENTS);
const appSet: ReadonlySet<string> = new Set(APP_SEGMENTS);

/**
 * Decides how `proxy.ts` handles a request path (ADR-0012, amended 2026-10-12):
 * - marketing paths go through next-intl routing (visible `as-needed` prefixes);
 * - app paths are rewritten internally to `/{locale}{path}`;
 * - any other first segment is a restaurant slug, rewritten to `/{locale}/r/{slug}…`.
 * Pure: no I/O, so the proxy never touches the database (ADR-0017).
 */
export function resolveRoute(pathname: string, locale: Locale): RouteDecision {
  const first = pathname.split('/')[1] ?? '';

  if (isLocale(first) || marketingSet.has(first)) {
    return { kind: 'marketing', surface: 'marketing' };
  }
  if (appSet.has(first)) {
    return {
      kind: 'rewrite',
      surface: CUSTOMER_SEGMENTS.has(first) ? 'customer' : 'app',
      pathname: `/${locale}${pathname}`,
    };
  }
  return { kind: 'rewrite', surface: 'customer', pathname: `/${locale}/r${pathname}` };
}
