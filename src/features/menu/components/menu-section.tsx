import { Flame, Heart, Leaf, Sparkles, Star, UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { MenuImage } from '@/components/media/menu-image';
import type { Locale } from '@/i18n/locales';
import { formatTND } from '@/lib/money';
import { formatWeekdays, servingWindow } from '@/lib/schedule';
import { classes as cn } from '@/lib/classes';
import type { PublicCategory, PublicProduct } from '../schemas/public-menu';
import { displayPrice } from '../services/pricing';
import { categoryAnchor } from './anchors';
import { firstGrapheme } from './first-grapheme';
import { Localized } from './localized';

type Translator = Awaited<ReturnType<typeof getTranslations<'client'>>>;

/** ADR-0029: photo grid when at least half the dishes have a photo, printed list otherwise. */
export function sectionLayout(category: Pick<PublicCategory, 'products'>): 'cards' | 'list' {
  const withPhoto = category.products.filter(
    (product) => product.media !== null || Boolean(product.photo_url),
  ).length;
  return withPhoto > 0 && withPhoto * 2 >= category.products.length ? 'cards' : 'list';
}

function Price({ product, locale, t }: { product: PublicProduct; locale: Locale; t: Translator }) {
  const { amount, from } = displayPrice(product);
  const formatted = formatTND(amount, { context: 'menu', locale });
  return <>{from ? t('from', { price: formatted }) : formatted}</>;
}

/** Small lucide glyph per badge kind, so chips read as icon + label (never colour alone). */
const TAG_ICON: Record<string, typeof Star> = {
  recommended: Heart,
  new: Sparkles,
  popular: Star,
  house: UtensilsCrossed,
  seasonal: Leaf,
  spicy: Flame,
};

function Tags({ product, t }: { product: PublicProduct; t: Translator }) {
  const tags = [
    ...product.badges.map((badge) => ({ key: badge, label: t(`badges.${badge}`), kind: badge })),
    // Only "spicy" is a warning worth a pill on the card; the full dietary and allergen
    // details live in the product sheet (P1-07b), so the list stays calm.
    ...product.dietary
      .filter((diet) => diet === 'spicy')
      .map((diet) => ({ key: diet, label: t(`dietary.${diet}`), kind: diet })),
  ];
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const Icon = TAG_ICON[tag.kind];
        return (
          <li
            key={tag.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none font-semibold',
              tag.kind === 'recommended' && 'bg-highlight-jasmin text-on-highlight-jasmin',
              tag.kind === 'new' && 'bg-brand-solid text-brand-on-solid',
              tag.kind === 'popular' && 'bg-brand-subtle text-brand-on-subtle',
              (tag.kind === 'house' || tag.kind === 'seasonal') && 'bg-muted text-foreground',
              tag.kind === 'spicy' && 'bg-destructive-subtle text-destructive-text',
            )}
          >
            {Icon ? <Icon aria-hidden="true" className="size-3 shrink-0" /> : null}
            {tag.label}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Serving window of a category (ADR-0014), e.g. "Servi lun. – sam., 07:00–11:00". Static text,
 * so the cached page stays the same all day; the product sheet and staff see live availability.
 */
function ServingHours({
  category,
  locale,
  t,
}: {
  category: PublicCategory;
  locale: Locale;
  t: Translator;
}) {
  const window = category.availability ? servingWindow(category.availability) : null;
  if (!window) return null;
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {t('servedHours', {
        days: formatWeekdays(window.days, locale) ?? t('everyDay'),
        from: window.from,
        to: window.to,
      })}
    </p>
  );
}

/** Filter tags of a product (MenuFilters): vegan dishes are vegetarian too. */
export function filterTags(product: PublicProduct): string {
  const tags = new Set<string>();
  if (product.dietary.includes('vegetarian') || product.dietary.includes('vegan'))
    tags.add('vegetarian');
  if (product.dietary.includes('gluten_free')) tags.add('gluten_free');
  if (product.dietary.includes('spicy')) tags.add('spicy');
  if (product.badges.includes('new')) tags.add('new');
  if (product.badges.includes('recommended')) tags.add('recommended');
  return [...tags].join(' ');
}

/**
 * The product name opens its sheet (`?p=slug`, spec 02): one link per product, stretched over
 * the whole card or row so the entire surface is the touch target.
 */
function ProductLink({ product, locale }: { product: PublicProduct; locale: Locale }) {
  return (
    <Link
      href={`?p=${encodeURIComponent(product.slug)}`}
      scroll={false}
      prefetch={false}
      className="outline-none after:absolute after:inset-0"
    >
      <Localized value={product.name} locale={locale} />
    </Link>
  );
}

function ProductCard({
  product,
  locale,
  t,
  priority,
}: {
  product: PublicProduct;
  locale: Locale;
  t: Translator;
  priority: boolean;
}) {
  const available = product.is_available;
  return (
    <li
      className="relative flex flex-col rounded-md bg-card p-1.5 shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring"
      data-available={available}
      data-product=""
      data-product-id={product.id}
      data-tags={filterTags(product)}
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
        {product.media ? (
          <MenuImage
            media={product.media}
            alt=""
            sizes="(min-width: 768px) 15rem, (min-width: 640px) 30vw, 45vw"
            priority={priority}
            className={cn('size-full', !available && 'opacity-45 grayscale')}
          />
        ) : product.photo_url ? (
          // Demo venues ship curated external photos (ADR exemption: seed data only); no
          // intrinsic size — the aspect-square container reserves the space to avoid CLS.
          // eslint-disable-next-line @next/next/no-img-element -- external URL, no Next loader
          <img
            src={product.photo_url}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={cn('size-full object-cover', !available && 'opacity-45 grayscale')}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'grid size-full place-items-center bg-brand-subtle bg-dots text-4xl font-title text-brand-on-subtle',
              !available && 'opacity-45 grayscale',
            )}
          >
            {firstGrapheme(product.name.text)}
          </span>
        )}
        {available ? null : (
          <span className="absolute start-2 bottom-2 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
            {t('unavailable')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 pt-2.5 pb-1.5">
        <h3
          className={cn(
            'line-clamp-2 text-md leading-snug font-semibold',
            available ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <ProductLink product={product} locale={locale} />
        </h3>
        {product.description ? (
          <Localized
            value={product.description}
            locale={locale}
            as="p"
            className="line-clamp-2 text-sm text-muted-foreground"
          />
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1.5">
          <span
            className={cn(
              'font-semibold tabular-nums',
              available ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Price product={product} locale={locale} t={t} />
          </span>
          <Tags product={product} t={t} />
        </div>
      </div>
    </li>
  );
}

function ProductRow({
  product,
  locale,
  t,
}: {
  product: PublicProduct;
  locale: Locale;
  t: Translator;
}) {
  const available = product.is_available;
  const tone = available ? 'text-foreground' : 'text-muted-foreground';
  return (
    <li
      className="relative py-3 has-focus-visible:ring-2 has-focus-visible:ring-ring"
      data-available={available}
      data-product=""
      data-product-id={product.id}
      data-tags={filterTags(product)}
    >
      <div className="flex items-end gap-2">
        <h3 className={cn('min-w-0 text-base font-semibold break-words', tone)}>
          <ProductLink product={product} locale={locale} />
        </h3>
        <span
          aria-hidden="true"
          className="mb-1.5 min-w-6 flex-1 border-b-2 border-dotted border-border"
        />
        <span className={cn('shrink-0 font-semibold tabular-nums', tone)}>
          {available ? <Price product={product} locale={locale} t={t} /> : t('unavailable')}
        </span>
      </div>
      {product.description ? (
        <Localized
          value={product.description}
          locale={locale}
          as="p"
          className="mt-1 line-clamp-2 pe-16 text-sm text-muted-foreground"
        />
      ) : null}
      <div className="mt-1.5 empty:hidden">
        <Tags product={product} t={t} />
      </div>
    </li>
  );
}

interface MenuSectionProps {
  category: PublicCategory;
  index: number;
  locale: Locale;
  /** Eager-load the first visible photos (LCP). */
  priority: boolean;
}

/** One category (ADR-0029): hairline, brand index `01`, title, then grid or printed list. */
export async function MenuSection({ category, index, locale, priority }: MenuSectionProps) {
  const t = await getTranslations('client');
  const layout = sectionLayout(category);
  const titleId = `${categoryAnchor(category.id)}-title`;

  return (
    <section
      id={categoryAnchor(category.id)}
      data-section=""
      aria-labelledby={titleId}
      className="scroll-mt-16 pt-9 first:pt-6"
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-3.5">
        <span
          aria-hidden="true"
          className="text-xs font-bold tracking-label text-brand-text tabular-nums"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <Localized
          value={category.name}
          locale={locale}
          as="h2"
          className="font-heading text-xl font-title tracking-heading text-foreground"
        />
        <ServingHours category={category} locale={locale} t={t} />
      </div>
      {layout === 'cards' ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {category.products.map((product, position) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              t={t}
              priority={priority && position < 2}
            />
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border/60">
          {category.products.map((product) => (
            <ProductRow key={product.id} product={product} locale={locale} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
