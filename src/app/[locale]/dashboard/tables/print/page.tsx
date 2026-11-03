import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TablesPrintScreen } from '@/features/tables';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tables.print');
  return { title: t('title') };
}

export default async function TablesPrintPage({
  searchParams,
}: PageProps<'/[locale]/dashboard/tables/print'>) {
  const { template, ids, general } = await searchParams;
  return (
    <TablesPrintScreen
      template={typeof template === 'string' ? template : undefined}
      ids={typeof ids === 'string' ? ids : undefined}
      general={general === '1'}
    />
  );
}
