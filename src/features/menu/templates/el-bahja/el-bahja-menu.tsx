import { Flame, Heart } from 'lucide-react';
import Link from 'next/link';
import { MenuImage } from '@/components/media/menu-image';
import type { Locale } from '@/i18n/locales';
import { formatTND } from '@/lib/money';
import { formatWeekdays, servingWindow } from '@/lib/schedule';
import { CategoryNav } from '../../components/category-nav';
import { MENU_FILTERS, type MenuFilter } from '../../components/filters';
import { categoryAnchor } from '../../components/anchors';
import { firstGrapheme } from '../../components/first-grapheme';
import { Localized } from '../../components/localized';
import { MenuFilters } from '../../components/menu-filters';
import { MenuSearch } from '../../components/menu-search';
import { filterTags } from '../../components/menu-section';
import { buildSearchItems, pluralForms } from '../../components/search-items';
import type { PublicCategory, PublicProduct } from '../../schemas/public-menu';
import { displayPrice } from '../../services/pricing';
import type { MenuTemplateProps, MenuTranslator } from '../types';

/**
 * Café El Bahja template (brief §6.2, MATRIX row 1): a traditional Tunisian café. It keeps the full
 * browse experience of the default layout — lazy search, diet filters, the sticky category bar and
 * the shared product sheet (`?p=slug`) — but recasts the content as a café card: every category is
 * an arched chapter, every dish a compact, Arabic-led row with a round brass-ringed thumb (or a
 * brass monogram) and a dotted price leader, over a cream / terracotta / deep-green / brass palette
 * in Reem Kufi. Structurally distinct from the default photo grid; functionally identical.
 *
 * Realtime + progressive enhancement (ADR-0008 §5): each section keeps `data-section` and every row
 * `data-product-id` + `data-available` + `data-tags`, so the shared `AvailabilityLive` watcher, the
 * filters and the search all operate on the server-rendered DOM with no template-specific client code.
 */
export function ElBahjaMenuBody({ menu, locale, t }: MenuTemplateProps) {
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
      <main className="elbahja mx-auto max-w-3xl px-gutter pb-12">
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
      className="elbahja-category scroll-mt-16"
    >
      <header className="elbahja-category-head">
        <span aria-hidden="true" className="elbahja-arch" />
        <h2 id={titleId} className="elbahja-category-title">
          <Localized value={category.name} locale={locale} />
        </h2>
        {window ? (
          <p className="elbahja-category-hours tabular-nums">
            {t('servedHours', {
              days: formatWeekdays(window.days, locale) ?? t('everyDay'),
              from: window.from,
              to: window.to,
            })}
          </p>
        ) : null}
      </header>
      <ul className="elbahja-list">
        {category.products.map((product, position) => (
          <Row
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

/** A compact café row: round framed thumb, Arabic-led name, dotted leader, end-aligned price. */
function Row({
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
  return (
    <li
      className="elbahja-row"
      data-product=""
      data-product-id={product.id}
      data-available={available}
      data-tags={filterTags(product)}
    >
      <Thumb product={product} priority={priority} />
      <div className="elbahja-row-body">
        <div className="elbahja-topline">
          <h3 className="elbahja-name">
            {/* Name-only link, stretched over the whole row so the row is one touch target. */}
            <Link
              href={`?p=${encodeURIComponent(product.slug)}`}
              scroll={false}
              prefetch={false}
              className="elbahja-row-link outline-none after:absolute after:inset-0"
            >
              <Localized value={product.name} locale={locale} />
            </Link>
            {product.badges.includes('recommended') ? (
              <Heart aria-hidden="true" className="elbahja-heart" />
            ) : null}
            {product.dietary.includes('spicy') ? (
              <Flame aria-hidden="true" className="elbahja-flame" />
            ) : null}
          </h3>
          <span aria-hidden="true" className="elbahja-lead" />
          <Price product={product} locale={locale} t={t} />
        </div>
        {product.description ? (
          <Localized
            value={product.description}
            locale={locale}
            as="p"
            className="elbahja-row-desc"
          />
        ) : null}
      </div>
    </li>
  );
}

function Thumb({ product, priority }: { product: PublicProduct; priority: boolean }) {
  const available = product.is_available;
  if (product.media) {
    return (
      <span className="elbahja-thumb" data-out={!available}>
        <MenuImage
          media={product.media}
          alt=""
          sizes="64px"
          priority={priority}
          className="size-full"
        />
      </span>
    );
  }
  if (product.photo_url) {
    return (
      <span className="elbahja-thumb" data-out={!available}>
        {/* Demo venues ship curated external photos (ADR exemption: seed data only). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- external URL, no Next loader */}
        <img
          src={product.photo_url}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="size-full"
        />
      </span>
    );
  }
  return (
    <span
      className="elbahja-thumb elbahja-thumb--monogram"
      data-out={!available}
      aria-hidden="true"
    >
      {firstGrapheme(product.name.text)}
    </span>
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
  const label = from ? t('from', { price: formatted }) : formatted;
  if (product.is_available) {
    return <span className="elbahja-price tabular-nums">{label}</span>;
  }
  return <span className="elbahja-price elbahja-price--out">{t('unavailable')}</span>;
}
