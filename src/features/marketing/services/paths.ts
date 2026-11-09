import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';

/** Marketing pages served with visible locale prefixes (ADR-0012). */
export const MARKETING_PAGES = [
  '/',
  '/how-it-works',
  '/pricing',
  '/venues',
  '/legal/notice',
  '/legal/terms',
  '/legal/privacy',
  '/legal/credits',
];

/** Link to a marketing page in `locale` (`as-needed`: French has no prefix). */
export function marketingHref(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Link that switches the page to `locale`. Always prefixed (even `/fr/…`) so the locale
 * middleware stores the choice in the cookie before redirecting to the canonical URL.
 */
export function switchLocaleHref(locale: Locale, path: string): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
