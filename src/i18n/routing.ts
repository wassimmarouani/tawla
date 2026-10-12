import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from './locales';

/**
 * next-intl routing for marketing pages only (visible `as-needed` prefixes: `/`, `/ar`, `/en`).
 * App and customer surfaces are rewritten by `src/proxy.ts` without a visible prefix (ADR-0012).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
});
