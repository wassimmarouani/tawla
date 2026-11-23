import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money';
import type { PublicMenu } from '../schemas/public-menu';
import { displayPrice } from '../services/pricing';
import type { SearchItem } from './menu-search';

/**
 * Compact entries for the lazy search panel (ADR-0026 §5), shared by every template that keeps
 * the menu search (default photo-grid, Café El Bahja reskin). Pure data — no React, no client code.
 */
export function buildSearchItems(
  menu: PublicMenu,
  locale: Locale,
  soldOut: string,
  from: (price: string) => string,
): SearchItem[] {
  return menu.categories.flatMap((category) =>
    category.products.map((product) => {
      const price = displayPrice(product);
      const formatted = formatMoney(price.amount, locale);
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.is_available ? (price.from ? from(formatted) : formatted) : soldOut,
        available: product.is_available,
        search: product.search,
      };
    }),
  );
}

/**
 * Result-count messages for every plural category of the locale, with `#` for the number, so the
 * client picks one with Intl.PluralRules instead of shipping an ICU runtime.
 */
export function pluralForms(
  locale: Locale,
  message: (count: number) => string,
): Record<string, string> {
  const rules = new Intl.PluralRules(locale);
  const forms: Record<string, string> = { zero: message(0) };
  for (const category of rules.resolvedOptions().pluralCategories) {
    for (let count = 1; count <= 200; count += 1) {
      if (rules.select(count) === category) {
        forms[category] = message(count).replace(String(count), '#');
        break;
      }
    }
  }
  return forms;
}
