import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { LOCALES } from '@/i18n/locales';
import { getPublicMenu } from '../queries/public-menu';
import { ProductSheet, productTitleId } from './product-sheet';
import { SheetDialog } from './sheet-dialog';

interface ProductSheetSlotProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Opens the sheet of `?p=<product slug>` from the cached menu; unknown slugs render nothing. */
export async function ProductSheetSlot({ params, searchParams }: ProductSheetSlotProps) {
  const { p } = await searchParams;
  if (typeof p !== 'string') return null;
  const { locale, slug } = await params;
  if (!hasLocale(LOCALES, locale)) return null;
  const menu = await getPublicMenu(slug, locale);
  const product = menu?.categories
    .flatMap((category) => category.products)
    .find((candidate) => candidate.slug === p);
  if (!product) return null;

  const t = await getTranslations('client.sheet');
  return (
    <SheetDialog key={product.id} labelledBy={productTitleId(product.slug)} closeLabel={t('close')}>
      <ProductSheet product={product} locale={locale} />
    </SheetDialog>
  );
}
