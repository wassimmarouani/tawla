import type { Locale } from '@/i18n/locales';
import { slugify } from '@/lib/text/slugify';
import type { I18nText } from '../schemas/i18n-text';

/** Product slugs (`?p=<slug>` on the public menu): `^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$`. */
const SLUG_MAX = 80;
const FALLBACK_SLUG = 'item';

/** Enabled locales without text, in the restaurant's order (missing-translation indicators). */
export function missingLocales(text: I18nText, locales: readonly Locale[]): Locale[] {
  return locales.filter((locale) => !text[locale]?.trim());
}

/** Text for one locale with the ADR-0026 fallback: requested → default → fr, ar, en. */
export function displayText(text: I18nText, locale: Locale, defaultLocale: Locale): string {
  for (const candidate of [locale, defaultLocale, 'fr', 'ar', 'en'] as const) {
    const value = text[candidate]?.trim();
    if (value) return value;
  }
  return '';
}

/**
 * A free product slug: the Latin name (French first, then English), else `item`, suffixed
 * `-2`, `-3`… until it is not in `taken`. Pure; the caller reads `taken` from the database.
 */
export function productSlug(name: I18nText, taken: ReadonlySet<string>): string {
  const base =
    [name.fr, name.en, name.ar]
      .map((value) => slugify(value ?? '', SLUG_MAX))
      .find((slug) => slug.length > 0) ?? FALLBACK_SLUG;
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const tail = `-${String(suffix)}`;
    const candidate = `${base.slice(0, SLUG_MAX - tail.length).replace(/-+$/, '')}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Ids in their new order, as `sort_order` values spaced by 10 (room for later inserts). */
export function sortOrders(ids: readonly string[]): { id: string; sortOrder: number }[] {
  return ids.map((id, index) => ({ id, sortOrder: (index + 1) * 10 }));
}
