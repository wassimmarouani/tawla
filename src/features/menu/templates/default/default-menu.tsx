import type { Locale } from '@/i18n/locales';
import { formatMoney } from '@/lib/money';
import { CategoryNav } from '../../components/category-nav';
import { MENU_FILTERS, type MenuFilter } from '../../components/filters';
import { Localized } from '../../components/localized';
import { MenuFilters } from '../../components/menu-filters';
import { MenuSearch, type SearchItem } from '../../components/menu-search';
import { MenuSection, sectionLayout } from '../../components/menu-section';
import type { PublicMenu } from '../../schemas/public-menu';
import { displayPrice } from '../../services/pricing';
import type { MenuTemplateProps } from '../types';

/**
 * Default template (brief §6.2): sticky categories, search + diet filters, photo-grid / printed-list
 * sections (ADR-0029). This is the layout every venue got before the template engine; it stays the
 * fallback for every variant that doesn't opt into a distinct template.
 */
export function DefaultMenuBody({ menu, locale, t }: MenuTemplateProps) {
  // Photos above the fold only in the first photo section.
  const firstPhotoSection = menu.categories.findIndex(
    (category) => sectionLayout(category) === 'cards',
  );

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-gutter pt-5 pb-3">
        <MenuSearch
          items={searchItems(menu, locale, t('unavailable'), (price) => t('from', { price }))}
          labels={{
            placeholder: t('search.placeholder'),
            label: t('search.label'),
            close: t('search.close'),
            empty: t('search.empty'),
            hint: t('search.hint'),
            results: pluralForms(locale, (count) => t('search.results', { count })),
          }}
          locale={locale}
        />
        <MenuFilters
          label={t('filters.label')}
          names={
            Object.fromEntries(
              MENU_FILTERS.map((filter) => [
                filter,
                filter === 'new' ? t('badges.new') : t(`dietary.${filter}`),
              ]),
            ) as Record<MenuFilter, string>
          }
        />
      </div>
      <CategoryNav
        label={t('categories')}
        categories={menu.categories.map((category) => ({
          id: category.id,
          label: <Localized value={category.name} locale={locale} />,
        }))}
      />
      <main className="mx-auto max-w-3xl px-gutter pb-12">
        <p data-filter-empty="" hidden className="py-10 text-center text-muted-foreground">
          {t('filters.empty')}
        </p>
        {menu.categories.map((category, index) => (
          <MenuSection
            key={category.id}
            category={category}
            index={index}
            locale={locale}
            priority={index === firstPhotoSection}
          />
        ))}
      </main>
    </>
  );
}

/** Compact entries for the lazy search panel (ADR-0026 §5). */
function searchItems(
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
 * Result-count messages for every plural category of the locale, with `#` for the number, so
 * the client picks one with Intl.PluralRules instead of shipping an ICU runtime.
 */
function pluralForms(locale: Locale, message: (count: number) => string): Record<string, string> {
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
