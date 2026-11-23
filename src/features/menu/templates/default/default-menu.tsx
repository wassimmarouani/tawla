import { CategoryNav } from '../../components/category-nav';
import { MENU_FILTERS, type MenuFilter } from '../../components/filters';
import { Localized } from '../../components/localized';
import { MenuFilters } from '../../components/menu-filters';
import { MenuSearch } from '../../components/menu-search';
import { MenuSection, sectionLayout } from '../../components/menu-section';
import { buildSearchItems, pluralForms } from '../../components/search-items';
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
          items={buildSearchItems(menu, locale, t('unavailable'), (price) => t('from', { price }))}
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
                filter === 'new' || filter === 'recommended'
                  ? t(`badges.${filter}`)
                  : t(`dietary.${filter}`),
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
