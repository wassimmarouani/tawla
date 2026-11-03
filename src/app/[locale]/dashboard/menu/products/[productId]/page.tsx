import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProductFormScreen } from '@/features/menu-editor';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('menuEditor.form');
  return { title: t('editTitle') };
}

export default async function EditProductPage({
  params,
}: PageProps<'/[locale]/dashboard/menu/products/[productId]'>) {
  const { productId } = await params;
  return <ProductFormScreen productId={productId} />;
}
