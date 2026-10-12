import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';
import { loadMessages } from '@/messages';
import { DEFAULT_LOCALE, LOCALES } from './locales';

/**
 * Every page lives under the `app/[locale]` root layout (the proxy rewrites unprefixed URLs),
 * so the locale is the `locale` root param, unless a caller passes one explicitly
 * (e.g. `getTranslations({ locale })`).
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  const requested = explicit ?? (await rootLocale());
  const locale = hasLocale(LOCALES, requested) ? requested : DEFAULT_LOCALE;
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: 'Africa/Tunis',
  };
});
