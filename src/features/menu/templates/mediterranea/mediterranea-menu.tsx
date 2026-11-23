import Link from 'next/link';
import { MenuImage } from '@/components/media/menu-image';
import type { Locale } from '@/i18n/locales';
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
 * Pizzeria Mediterranea template (brief §6.2, MATRIX row 3): a loud wood-fired pizzeria, the opposite
 * of the Vesuvio carte. Keeps the full browse (search, diet filters, sticky category jump, shared
 * product sheet) but recasts the menu as a single-column, full-bleed photo feed — every pizza a hero
 * with a scrim-set name and a prominent price — over a tomato / basil / flour-cream palette in Archivo
 * (loud condensed) + Cairo. No-photo dishes fall back to a cream block with an oversized name and a
 * basil rule. Category headers carry a checkered-tablecloth edge; sold-out items get a ribbon.
 *
 * The price-per-size selector (MATRIX) needs schema not yet approved (§6.3); it degrades to the
 * computed price with an "À partir de" prefix when a dish has option-group variants. Same DOM
 * contract as the default body (`data-section` / `data-product` / `data-tags` / `data-filter-empty`,
 * name-only stretched link), so search, filters and realtime all work with no template-specific JS.
 */
export function MediterraneaMenuBody({ menu, locale, t }: MenuTemplateProps) {
  return (
    <>
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-gutter pt-5 pb-3">
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
      <main className="mediterranea mx-auto max-w-2xl px-gutter pb-12">
        <p data-filter-empty="" hidden className="py-12 text-center text-muted-foreground">
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
      className="mediterranea-category scroll-mt-16"
    >
      <header className="mediterranea-category-head">
        <h2 id={titleId} className="mediterranea-category-title">
          <Localized value={category.name} locale={locale} />
        </h2>
        {window ? (
          <p className="mediterranea-category-hours tabular-nums">
            {t('servedHours', {
              days: formatWeekdays(window.days, locale) ?? t('everyDay'),
              from: window.from,
              to: window.to,
            })}
          </p>
        ) : null}
        <span aria-hidden="true" className="mediterranea-checker" />
      </header>
      <ul className="mediterranea-feed">
        {category.products.map((product, position) => (
          <Card
            key={product.id}
            product={product}
            locale={locale}
            t={t}
            priority={priority && position < 2}
          />
        ))}
      </ul>
    </section>
  );
}

/** A full-bleed photo card (or a cream no-photo block), name + prominent price set over a scrim. */
function Card({
  product,
  locale,
  t,
  priority,
}: {
  product: PublicProduct;
  locale: Locale;
  t: MenuTranslator;
  priority: boolean;
}) {
  const available = product.is_available;
  const hasPhoto = product.media !== null || Boolean(product.photo_url);
  return (
    <li
      className="mediterranea-card"
      data-photo={hasPhoto}
      data-product=""
      data-product-id={product.id}
      data-available={available}
      data-tags={filterTags(product)}
    >
      {hasPhoto ? (
        <div className="mediterranea-media" data-out={!available}>
          {product.media ? (
            <MenuImage
              media={product.media}
              alt=""
              sizes="(min-width: 42rem) 42rem, 100vw"
              priority={priority}
              className="size-full"
            />
          ) : (
            // Demo venues ship curated external photos (ADR exemption: seed data only).
            // eslint-disable-next-line @next/next/no-img-element -- external URL, no Next loader
            <img
              src={product.photo_url ?? ''}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              className="size-full object-cover"
            />
          )}
          {available ? null : <span className="mediterranea-ribbon">{t('unavailable')}</span>}
        </div>
      ) : null}
      <div className="mediterranea-caption">
        <h3 className="mediterranea-name">
          {/* Name-only link, stretched over the whole card so the card is one touch target. */}
          <Link
            href={`?p=${encodeURIComponent(product.slug)}`}
            scroll={false}
            prefetch={false}
            className="mediterranea-link outline-none after:absolute after:inset-0"
          >
            <Localized value={product.name} locale={locale} />
          </Link>
        </h3>
        {product.description ? (
          <Localized
            value={product.description}
            locale={locale}
            as="p"
            className="mediterranea-desc"
          />
        ) : null}
        <Price product={product} locale={locale} t={t} />
      </div>
    </li>
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
    return <p className="mediterranea-price mediterranea-price--out">{t('unavailable')}</p>;
  }
  return (
    <p className="mediterranea-price tabular-nums">
      {from ? t('from', { price: formatted }) : formatted}
    </p>
  );
}
