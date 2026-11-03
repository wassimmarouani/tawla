import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { env } from '@/lib/env';
import { millimesToDecimal } from '@/lib/money';
import { ALLERGENS, BADGES, DIETARY } from '@/lib/menu/attributes';
import {
  loadEditorMenu,
  loadEditorProduct,
  loadOptionGroups,
  loadProductOptionLinks,
  type EditorOptionLink,
} from '../queries/editor-menu';
import { editorPageData } from '../server/page-data';
import { displayText } from '../services/menu-text';
import { MenuPreview } from './menu-preview';
import { ProductForm, type AttributeLabels } from './product-form';

interface ProductFormScreenProps {
  /** `null` creates a product. */
  productId: string | null;
  /** Category preselected for a new product (`?category=`). */
  categoryId?: string | undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `/dashboard/menu/products/new` and `/dashboard/menu/products/[id]` (P1-05). */
export async function ProductFormScreen({ productId, categoryId }: ProductFormScreenProps) {
  const data = await editorPageData();
  if (!data) return null;
  if (!data.canEdit) redirect('/dashboard/menu');
  const t = await getTranslations('menuEditor.form');
  const tClient = await getTranslations('client');
  const { claims, restaurant, locale } = data;

  const categories = await loadEditorMenu(claims, restaurant.id);
  if (categories.length === 0) redirect('/dashboard/menu');
  const product =
    productId === null
      ? null
      : UUID.test(productId)
        ? await loadEditorProduct(claims, restaurant.id, productId)
        : null;
  if (productId !== null && !product) notFound();
  const [optionGroups, links] = await Promise.all([
    loadOptionGroups(claims, restaurant.id),
    product ? loadProductOptionLinks(claims, restaurant.id, product.id) : [],
  ]);
  const attributeLabels: AttributeLabels = {
    badges: Object.fromEntries(
      BADGES.map((key) => [key, tClient(`badges.${key}`)]),
    ) as AttributeLabels['badges'],
    dietary: Object.fromEntries(
      DIETARY.map((key) => [key, tClient(`dietary.${key}`)]),
    ) as AttributeLabels['dietary'],
    allergens: Object.fromEntries(
      ALLERGENS.map((key) => [key, tClient(`allergenNames.${key}`)]),
    ) as AttributeLabels['allergens'],
  };

  const preselected =
    categories.find((category) => category.id === categoryId)?.id ?? categories[0]?.id ?? '';
  const name = product ? displayText(product.name, locale, restaurant.defaultLocale) : '';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/menu"
            className="inline-flex min-h-target items-center gap-1 rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            {t('back')}
          </Link>
        }
        title={product ? name || t('editTitle') : t('newTitle')}
      />
      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1">
          <ProductForm
            productId={product?.id ?? null}
            initial={{
              categoryId: product?.categoryId ?? preselected,
              name: product?.name ?? {},
              description: product?.description ?? {},
              priceText: product ? millimesToDecimal(product.price) : '',
              media: product?.media ?? null,
              isAvailable: product?.isAvailable ?? true,
              isVisible: product?.isVisible ?? true,
              badges: product?.badges ?? [],
              allergens: product?.allergens ?? [],
              dietary: product?.dietary ?? [],
              optionLinks: links.map(toFormLink),
            }}
            categories={categories.map((category) => ({
              id: category.id,
              label: displayText(category.name, locale, restaurant.defaultLocale),
            }))}
            optionGroups={optionGroups}
            attributeLabels={attributeLabels}
            locale={locale}
            defaultLocale={restaurant.defaultLocale}
            locales={restaurant.locales}
            storageUrl={env.NEXT_PUBLIC_SUPABASE_URL}
          />
        </div>
        {product ? (
          <MenuPreview
            src={`/${restaurant.slug}?p=${encodeURIComponent(product.slug)}`}
            version={0}
          />
        ) : null}
      </div>
    </div>
  );
}

/** A stored link as the form edits it: counts and prices as text, blank = group value. */
function toFormLink(link: EditorOptionLink) {
  return {
    optionGroupId: link.optionGroupId,
    minSelect: link.minSelect === null ? '' : String(link.minSelect),
    maxSelect: link.maxSelect === null ? '' : String(link.maxSelect),
    priceOverrides: Object.fromEntries(
      Object.entries(link.priceOverrides).map(([optionId, price]) => [
        optionId,
        millimesToDecimal(price),
      ]),
    ),
  };
}
