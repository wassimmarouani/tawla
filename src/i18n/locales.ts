/** Supported locales (ADR-0026). `ar` is Modern Standard Arabic, right-to-left. */
export const LOCALES = ['fr', 'ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

interface LanguagePreference {
  language: string;
  quality: number;
  order: number;
}

/** Parses an Accept-Language header into primary subtags sorted by preference. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  const preferences: LanguagePreference[] = [];
  header.split(',').forEach((item, order) => {
    const [tag = '', ...params] = item.trim().split(';');
    const qParam = params.find((param) => param.trim().startsWith('q='));
    const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
    const language = tag.trim().toLowerCase().split('-')[0] ?? '';
    if (language && language !== '*' && Number.isFinite(quality) && quality > 0) {
      preferences.push({ language, quality, order });
    }
  });
  return preferences
    .sort((a, b) => b.quality - a.quality || a.order - b.order)
    .map((preference) => preference.language);
}

/**
 * Picks the locale for a request: explicit cookie choice → best Accept-Language match among
 * `supported` → `fallback` (ADR-0012).
 */
export function negotiateLocale({
  cookie,
  acceptLanguage,
  supported = LOCALES,
  fallback = DEFAULT_LOCALE,
}: {
  cookie?: string | null | undefined;
  acceptLanguage?: string | null | undefined;
  supported?: readonly Locale[];
  fallback?: Locale;
}): Locale {
  if (isLocale(cookie) && supported.includes(cookie)) return cookie;
  for (const language of parseAcceptLanguage(acceptLanguage)) {
    if (isLocale(language) && supported.includes(language)) return language;
  }
  return supported.includes(fallback) ? fallback : (supported[0] ?? DEFAULT_LOCALE);
}
