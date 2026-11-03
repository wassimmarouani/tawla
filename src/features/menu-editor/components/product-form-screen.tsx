import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { env } from '@/lib/env';
import { millimesToDecimal } from '@/lib/money';
import { loadEditorMenu, loadEditorProduct } from '../queries/editor-menu';
import { editorPageData } from '../server/page-data';
import { displayText } from '../services/menu-text';
import { ProductForm } from './product-form';

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
        }}
        categories={categories.map((category) => ({
          id: category.id,
          label: displayText(category.name, locale, restaurant.defaultLocale),
        }))}
        locales={restaurant.locales}
        storageUrl={env.NEXT_PUBLIC_SUPABASE_URL}
      />
    </div>
  );
}
