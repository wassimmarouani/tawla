import { UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/states/empty-state';
import type { Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { classes } from '@/lib/classes';
import { demoVariantForSlug } from '@/lib/menu/demo-variants';
import type { PublicMenu } from '../schemas/public-menu';
import { restaurantThemeSchema } from '../schemas/restaurant-theme';
import { AvailabilityLive } from './availability-live';
import { BrandStyle } from './brand-style';
import { CategoryNav } from './category-nav';
import { Localized } from './localized';
import { MenuHeader, type TableBadge } from './menu-header';
import { MENU_FILTERS, type MenuFilter } from './filters';
import { MenuFilters } from './menu-filters';
import { MenuSearch, type SearchItem } from './menu-search';
import { MenuSection, sectionLayout } from './menu-section';
import { PoweredByBadge } from './powered-by-badge';
import { VariantFonts } from './variant-fonts';
import { formatMoney } from '@/lib/money';
import { displayPrice } from '../services/pricing';

/** The customer menu (spec 02, ADR-0029): header, sticky categories, sections. */
export async function PublicMenuView({
  menu,
  locale,
  table,
  tableToken,
  serviceBar,
}: {
  menu: PublicMenu;
  locale: Locale;
  /** Set on the table route (`/t/{token}`): shown in the header. */
  table?: TableBadge | undefined;
  tableToken?: string | undefined;
  /** The table's "Call waiter / Bill" bar, fixed at the bottom (P1-10). */
  serviceBar?: ReactNode;
}) {
  const t = await getTranslations('client');
  const scope = menu.restaurant.public_id;
  const parsedTheme = restaurantThemeSchema.parse(menu.restaurant.theme);
  const colorMode = parsedTheme.color_mode ?? 'auto';
  // Fallback: the demo venues ship with a known variant per slug. If the DB theme hasn't been
  // synced yet (install button not clicked), resolve from the shared demo list so each demo
  // still renders in its own identity.
  const variant = parsedTheme.variant ?? demoVariantForSlug(menu.restaurant.slug) ?? 'default';
  // Photos above the fold only in the first photo section.
  const firstPhotoSection = menu.categories.findIndex(
    (category) => sectionLayout(category) === 'cards',
  );

  return (
    <div
      data-tenant={scope}
      data-theme={colorMode === 'auto' ? undefined : colorMode}
      data-variant={variant === 'default' ? undefined : variant}
      className={classes(
        'min-h-dvh bg-background text-foreground',
        serviceBar ? 'pb-40' : 'pb-safe',
      )}
    >
      <BrandStyle theme={menu.restaurant.theme} scope={scope} />
      <VariantFonts variant={variant} />
      <AvailabilityLive
        slug={menu.restaurant.slug}
        menuPublicId={scope}
        tableToken={tableToken}
        realtime={{
          url: env.NEXT_PUBLIC_SUPABASE_URL,
          publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        }}
      />
      <MenuHeader menu={menu} locale={locale} table={table} />
      {menu.categories.length === 0 ? (
        <main className="mx-auto max-w-3xl px-gutter py-10">
          <EmptyState
            icon={<UtensilsCrossed />}
            title={t('emptyMenu.title')}
            description={t('emptyMenu.description')}
          />
        </main>
      ) : (
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
      )}
      <PoweredByBadge slug={menu.restaurant.slug} />
      {serviceBar}
    </div>
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
