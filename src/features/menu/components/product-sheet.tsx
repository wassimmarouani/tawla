import { getTranslations } from 'next-intl/server';
import { MenuImage } from '@/components/media/menu-image';
import type { Locale } from '@/i18n/locales';
import { classes as cn } from '@/lib/classes';
import { formatTND } from '@/lib/money';
import type { PublicProduct } from '../schemas/public-menu';
import { effectiveOptionGroup, type EffectiveOptionGroup } from '../services/options';
import { displayPrice } from '../services/pricing';
import { Localized } from './localized';

type Translator = Awaited<ReturnType<typeof getTranslations<'client'>>>;

export const productTitleId = (slug: string) => `product-${slug}-title`;

function ruleLabel(group: EffectiveOptionGroup, t: Translator): string {
  if (group.minSelect === group.maxSelect)
    return t('sheet.chooseExactly', { count: group.minSelect });
  if (group.minSelect === 0) return t('sheet.chooseUpTo', { count: group.maxSelect });
  return t('sheet.chooseBetween', { min: group.minSelect, max: group.maxSelect });
}

/**
 * Product sheet content (spec 02): photo, name, price, description, diet labels, option groups
 * with their rules and prices, allergens. Informational on Basic; selection comes with ordering.
 */
export async function ProductSheet({
  product,
  locale,
}: {
  product: PublicProduct;
  locale: Locale;
}) {
  const t = await getTranslations('client');
  const price = displayPrice(product);
  const formatted = formatTND(price.amount, { context: 'menu', locale });
  const groups = product.option_groups.map(effectiveOptionGroup);
  const labels = [
    ...product.badges.map((badge) => t(`badges.${badge}`)),
    ...product.dietary.map((diet) => t(`dietary.${diet}`)),
  ];

  return (
    <article className="pb-safe">
      {product.media ? (
        <MenuImage
          media={product.media}
          alt=""
          sizes="(min-width: 640px) 32rem, 100vw"
          priority
          className={cn('aspect-4/3 w-full', !product.is_available && 'opacity-45 grayscale')}
        />
      ) : null}

      <div className="flex flex-col gap-5 px-5 pt-6">
        <header className="flex flex-col gap-2 pe-12">
          <h2
            id={productTitleId(product.slug)}
            className="font-heading text-2xl font-title tracking-heading text-balance text-foreground"
          >
            <Localized value={product.name} locale={locale} />
          </h2>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {product.is_available
              ? price.from
                ? t('from', { price: formatted })
                : formatted
              : t('unavailable')}
          </p>
          {labels.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={t('sheet.dietary')}>
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        {product.description ? (
          <Localized
            value={product.description}
            locale={locale}
            as="p"
            className="text-md text-pretty text-muted-foreground"
          />
        ) : null}

        {groups.length > 0 ? (
          <section className="flex flex-col gap-4" aria-label={t('sheet.options')}>
            {groups.map((group) => (
              <div key={group.id} className="rounded-md border border-border p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Localized
                    value={group.name}
                    locale={locale}
                    as="h3"
                    className="font-semibold text-foreground"
                  />
                  <span className="text-sm text-muted-foreground">
                    {group.required ? t('sheet.required') : t('sheet.optional')} ·{' '}
                    {ruleLabel(group, t)}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {group.options.map((option) => (
                    <li
                      key={option.id}
                      data-option-id={option.id}
                      data-available={option.isAvailable}
                      className="flex items-baseline justify-between gap-3 py-2 text-sm"
                    >
                      <Localized
                        value={option.name}
                        locale={locale}
                        className={option.isAvailable ? 'text-foreground' : 'text-muted-foreground'}
                      />
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {option.isAvailable
                          ? option.price > 0
                            ? t('sheet.delta', {
                                price: formatTND(option.price, { context: 'menu', locale }),
                              })
                            : t('sheet.included')
                          : t('unavailable')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        <section className="flex flex-col gap-2 border-t border-border pt-4 pb-6">
          <h3 className="font-semibold text-foreground">{t('sheet.allergens')}</h3>
          {product.allergens.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {product.allergens.map((allergen) => (
                <li
                  key={allergen}
                  className="rounded-full border border-border px-2.5 py-1 text-sm text-foreground"
                >
                  {t(`allergenNames.${allergen}`)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('sheet.noAllergens')}</p>
          )}
          <p className="text-sm text-muted-foreground">{t('sheet.allergenNote')}</p>
        </section>
      </div>
    </article>
  );
}
