import { Flame, Leaf, Sprout, WheatOff, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { MenuImage } from '@/components/media/menu-image';
import type { Locale } from '@/i18n/locales';
import type { Dietary } from '@/lib/menu/attributes';
import { formatTND } from '@/lib/money';
import { formatWeekdays, servingWindow } from '@/lib/schedule';
import { CategoryNav } from '../../components/category-nav';
import { MENU_FILTERS, type MenuFilter } from '../../components/filters';
import { categoryAnchor } from '../../components/anchors';
import { Localized } from '../../components/localized';
import { MenuFilters } from '../../components/menu-filters';
import { MenuSearch } from '../../components/menu-search';
import { filterTags } from '../../components/menu-section';
import { buildSearchItems, pluralForms } from '../../components/search-items';
import type { PublicCategory, PublicProduct } from '../../schemas/public-menu';
import { displayPrice } from '../../services/pricing';
import type { MenuTemplateProps, MenuTranslator } from '../types';

/**
 * Café Marina template (brief §6.2, MATRIX row 2): a crisp specialty-coffee bar, the airy opposite of
 * the warm Café El Bahja. Keeps the full browse (lazy search, the sticky diet-filter bar, the sticky
 * category tabs and the shared product sheet) but lays the menu out as a clean bento grid of framed
 * square photos — the first dish of each category a wide feature tile, the rest square tiles — with
 * diet icons and the price pinned to the bottom of every card. Sea-salt / sage / sand / ink palette,
 * Geist + IBM Plex Sans Arabic (already loaded, no extra font request), a hairline grid and a small
 * coastal dot on each category header.
 *
 * Same DOM contract as the default body (`data-section` / `data-product` / `data-tags` /
 * `data-filter-empty`, name-only stretched link), so search, filters and realtime work with no
 * template-specific client JS. The "ingredient breakdown" detail (MATRIX) rides on the shared product
 * sheet; no schema change here.
 */
export function MarinaMenuBody({ menu, locale, t }: MenuTemplateProps) {
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
      <main className="marina mx-auto max-w-3xl px-gutter pb-12">
        <p data-filter-empty="" hidden className="py-10 text-center text-muted-foreground">
          {t('filters.empty')}
        </p>
        {menu.categories.map((category, index) => (
          <Category
            key={category.id}
            category={category}
            locale={locale}
            t={t}
            priority={index === 0}
          />
        ))}
      </main>
    </>
  );
}

function Category({
  category,
  locale,
  t,
  priority,
}: {
  category: PublicCategory;
  locale: Locale;
  t: MenuTranslator;
  priority: boolean;
}) {
  const titleId = `${categoryAnchor(category.id)}-title`;
  const window = category.availability ? servingWindow(category.availability) : null;
  return (
    <section
      id={categoryAnchor(category.id)}
      data-section=""
      aria-labelledby={titleId}
      className="marina-category scroll-mt-16"
    >
      <header className="marina-category-head">
        <span aria-hidden="true" className="marina-dot" />
        <h2 id={titleId} className="marina-category-title">
          <Localized value={category.name} locale={locale} />
        </h2>
        {window ? (
          <p className="marina-category-hours tabular-nums">
            {t('servedHours', {
              days: formatWeekdays(window.days, locale) ?? t('everyDay'),
              from: window.from,
              to: window.to,
            })}
          </p>
        ) : null}
      </header>
      <ul className="marina-grid">
        {category.products.map((product, position) => (
          <Card
            key={product.id}
            product={product}
            locale={locale}
            t={t}
            feature={position === 0}
            priority={priority && position < 3}
          />
        ))}
      </ul>
    </section>
  );
}

/** A bento tile: framed square photo on top, diet icons + price pinned to the bottom. */
function Card({
  product,
  locale,
  t,
  feature,
  priority,
}: {
  product: PublicProduct;
  locale: Locale;
  t: MenuTranslator;
  feature: boolean;
  priority: boolean;
}) {
  const available = product.is_available;
  const hasPhoto = product.media !== null || Boolean(product.photo_url);
  return (
    <li
      className="marina-card"
      data-feature={feature}
      data-photo={hasPhoto}
      data-product=""
      data-product-id={product.id}
      data-available={available}
      data-tags={filterTags(product)}
    >
      <div className="marina-media" data-out={!available}>
        {product.media ? (
          <MenuImage
            media={product.media}
            alt=""
            sizes={feature ? '(min-width: 48rem) 48rem, 100vw' : '(min-width: 48rem) 24rem, 50vw'}
            priority={priority}
            className="size-full"
          />
        ) : product.photo_url ? (
          // Demo venues ship curated external photos (ADR exemption: seed data only).
          // eslint-disable-next-line @next/next/no-img-element -- external URL, no Next loader
          <img
            src={product.photo_url}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden="true" className="marina-media-fallback" />
        )}
        {available ? null : <span className="marina-flag">{t('unavailable')}</span>}
      </div>
      <div className="marina-body">
        <h3 className="marina-name">
          {/* Name-only link, stretched over the whole card so the tile is one touch target. */}
          <Link
            href={`?p=${encodeURIComponent(product.slug)}`}
            scroll={false}
            prefetch={false}
            className="marina-link outline-none after:absolute after:inset-0"
          >
            <Localized value={product.name} locale={locale} />
          </Link>
        </h3>
        {feature && product.description ? (
          <Localized value={product.description} locale={locale} as="p" className="marina-desc" />
        ) : null}
        <div className="marina-footer">
          <DietIcons dietary={product.dietary} t={t} />
          <Price product={product} locale={locale} t={t} />
        </div>
      </div>
    </li>
  );
}

const DIET_ICON = {
  vegetarian: Leaf,
  vegan: Sprout,
  gluten_free: WheatOff,
  spicy: Flame,
} satisfies Record<Dietary, LucideIcon>;

function DietIcons({ dietary, t }: { dietary: readonly Dietary[]; t: MenuTranslator }) {
  if (dietary.length === 0) {
    return null;
  }
  return (
    <ul className="marina-diets">
      {dietary.map((diet) => {
        const Icon = DIET_ICON[diet];
        return (
          <li key={diet} className="marina-diet">
            <Icon aria-hidden="true" className="marina-diet-icon" />
            <span className="sr-only">{t(`dietary.${diet}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Price({
  product,
  locale,
  t,
}: {
  product: PublicProduct;
  locale: Locale;
  t: MenuTranslator;
}) {
  const { amount, from } = displayPrice(product);
  const formatted = formatTND(amount, { context: 'menu', locale });
  if (!product.is_available) {
    return <span className="marina-price marina-price--out">{t('unavailable')}</span>;
  }
  return (
    <span className="marina-price tabular-nums">
      {from ? t('from', { price: formatted }) : formatted}
    </span>
  );
}
