import type { Locale } from '@/i18n/locales';
import { formatTND } from '@/lib/money';
import { formatWeekdays, servingWindow } from '@/lib/schedule';
import type { PublicCategory, PublicProduct } from '../../schemas/public-menu';
import { displayPrice } from '../../services/pricing';
import { categoryAnchor } from '../../components/anchors';
import { firstGrapheme } from '../../components/first-grapheme';
import { Localized } from '../../components/localized';
import type { MenuTemplateProps, MenuTranslator } from '../types';

/**
 * Vesuvio template (brief §6.2, MATRIX row 4): an upscale trattoria *printed carte*. Courses read
 * as chapters with small-caps rules and an illuminated initial; dishes are typographic text lines
 * (no photos by default); the detail is a quiet inline accordion, not a sheet. Deliberately the
 * most structurally different template from the photo-grid default, to prove the engine.
 *
 * Realtime contract (ADR-0008 §5): each row keeps `data-product-id` + `data-available` so the shared
 * `AvailabilityLive` watcher still refreshes sold-out states. The pairing line (MATRIX) needs a
 * `products.pairing` field that doesn't exist yet, so it degrades to nothing until approved.
 */
export function VesuvioMenuBody({ menu, locale, t }: MenuTemplateProps) {
  // Empty chapters are hidden (MATRIX: "empty chapter hidden").
  const chapters = menu.categories.filter((category) => category.products.length > 0);
  if (chapters.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-gutter py-16 text-center">
        <p className="vesuvio-name text-lg text-muted-foreground">{t('emptyMenu.title')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-gutter pb-16">
      <nav aria-label={t('carte.contents')} className="vesuvio-toc">
        <ul>
          {chapters.map((category) => (
            <li key={category.id}>
              <a href={`#${categoryAnchor(category.id)}`} className="vesuvio-toc-link">
                <Localized value={category.name} locale={locale} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {chapters.map((category) => (
        <Chapter key={category.id} category={category} locale={locale} t={t} />
      ))}
    </main>
  );
}

function Chapter({
  category,
  locale,
  t,
}: {
  category: PublicCategory;
  locale: Locale;
  t: MenuTranslator;
}) {
  const titleId = `${categoryAnchor(category.id)}-title`;
  const window = category.availability ? servingWindow(category.availability) : null;
  return (
    <section
      id={categoryAnchor(category.id)}
      data-section=""
      aria-labelledby={titleId}
      className="vesuvio-chapter scroll-mt-16"
    >
      <header className="vesuvio-chapter-head">
        <span aria-hidden="true" className="vesuvio-initial">
          {firstGrapheme(category.name.text)}
        </span>
        <div className="vesuvio-chapter-titles">
          <h2 id={titleId} className="vesuvio-chapter-title">
            <Localized value={category.name} locale={locale} />
          </h2>
          {window ? (
            <p className="vesuvio-chapter-hours tabular-nums">
              {t('servedHours', {
                days: formatWeekdays(window.days, locale) ?? t('everyDay'),
                from: window.from,
                to: window.to,
              })}
            </p>
          ) : null}
        </div>
        <span aria-hidden="true" className="vesuvio-rule" />
      </header>
      <ul className="vesuvio-list">
        {category.products.map((product) => (
          <Dish key={product.id} product={product} locale={locale} t={t} />
        ))}
      </ul>
    </section>
  );
}

function Dish({
  product,
  locale,
  t,
}: {
  product: PublicProduct;
  locale: Locale;
  t: MenuTranslator;
}) {
  const available = product.is_available;
  const hasDetail =
    product.description !== null ||
    product.allergens.length > 0 ||
    product.dietary.length > 0 ||
    product.option_groups.length > 0;

  const head = (
    <>
      <span className="vesuvio-name">
        <Localized value={product.name} locale={locale} />
      </span>
      <span aria-hidden="true" className="vesuvio-lead" />
      <Price product={product} locale={locale} t={t} />
    </>
  );

  return (
    <li
      className="vesuvio-row"
      data-product=""
      data-product-id={product.id}
      data-available={available}
    >
      {hasDetail ? (
        <details className="vesuvio-disclosure">
          <summary className="vesuvio-summary">{head}</summary>
          <Detail product={product} locale={locale} t={t} />
        </details>
      ) : (
        <div className="vesuvio-summary vesuvio-summary--static">{head}</div>
      )}
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
  const label = from ? t('from', { price: formatted }) : formatted;
  if (product.is_available) {
    return <span className="vesuvio-price tabular-nums">{label}</span>;
  }
  return (
    <span className="vesuvio-price vesuvio-price--out tabular-nums">
      <s>{label}</s>
      <span className="vesuvio-out">{t('unavailable')}</span>
    </span>
  );
}

function Detail({
  product,
  locale,
  t,
}: {
  product: PublicProduct;
  locale: Locale;
  t: MenuTranslator;
}) {
  return (
    <div className="vesuvio-detail">
      {product.description ? (
        <Localized value={product.description} locale={locale} as="p" className="vesuvio-desc" />
      ) : null}
      {product.option_groups.length > 0 ? (
        <ul className="vesuvio-options">
          {product.option_groups.map((group) => (
            <li key={group.id}>
              <span className="vesuvio-option-group">
                <Localized value={group.name} locale={locale} />
              </span>{' '}
              <span className="vesuvio-option-list">
                {group.options.map((option, index) => {
                  const delta = group.price_overrides[option.id] ?? option.price_delta;
                  return (
                    <span key={option.id}>
                      {index > 0 ? ' · ' : ''}
                      <Localized value={option.name} locale={locale} />
                      {delta > 0 ? ` +${formatTND(delta, { context: 'menu', locale })}` : ''}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {product.dietary.length > 0 ? (
        <p className="vesuvio-meta">
          <span className="vesuvio-meta-label">{t('sheet.dietary')} : </span>
          {product.dietary.map((diet) => t(`dietary.${diet}`)).join(' · ')}
        </p>
      ) : null}
      {product.allergens.length > 0 ? (
        <p className="vesuvio-meta">
          <span className="vesuvio-meta-label">{t('sheet.allergens')} : </span>
          {product.allergens.map((allergen) => t(`allergenNames.${allergen}`)).join(', ')}
        </p>
      ) : null}
    </div>
  );
}
