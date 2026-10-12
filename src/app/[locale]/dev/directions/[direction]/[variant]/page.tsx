import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';
import { MenuPrototype } from '../../_components/menu-prototype';
import {
  DIRECTIONS,
  DIRECTION_IDS,
  VARIANTS,
  findVariant,
  isDirectionId,
} from '../../_data/directions';
import '../../_styles/base.css';
import '../../_styles/a-jasmin.css';
import '../../_styles/b-medina.css';
import '../../_styles/c-souk.css';

/**
 * P0-06 design exploration (dev-only, ENABLE_DEV_ROUTES=true at build time).
 * /dev/directions/{a|b|c}/{light|dark}-{photos|nophotos}-{saffron|olive}
 */
export function generateStaticParams() {
  return DIRECTION_IDS.flatMap((direction) =>
    VARIANTS.map((variant) => ({ direction, variant: variant.slug })),
  );
}

export const metadata = { robots: { index: false, follow: false } };

export default async function DirectionPage({
  params,
}: PageProps<'/[locale]/dev/directions/[direction]/[variant]'>) {
  if (!env.ENABLE_DEV_ROUTES) notFound();
  const { locale, direction, variant: variantSlug } = await params;
  const variant = findVariant(variantSlug);
  if (!hasLocale(LOCALES, locale) || !isDirectionId(direction) || !variant) notFound();

  return <MenuPrototype direction={DIRECTIONS[direction]} variant={variant} locale={locale} />;
}
