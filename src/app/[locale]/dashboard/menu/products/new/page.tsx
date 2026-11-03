import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProductFormScreen } from '@/features/menu-editor';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('menuEditor.form');
  return { title: t('newTitle') };
}

export default async function NewProductPage({
  searchParams,
}: PageProps<'/[locale]/dashboard/menu/products/new'>) {
  const { category } = await searchParams;
  return (
    <ProductFormScreen
      productId={null}
      categoryId={typeof category === 'string' ? category : undefined}
    />
  );
}
