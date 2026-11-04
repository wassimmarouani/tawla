import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { VenuesScreen } from '@/features/platform';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('venues') };
}

export default function AdminPage({ searchParams }: PageProps<'/[locale]/admin'>) {
  return (
    <Suspense>
      <Venues searchParams={searchParams} />
    </Suspense>
  );
}

async function Venues({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/admin'>['searchParams'];
}) {
  const { q } = await searchParams;
  return <VenuesScreen query={typeof q === 'string' ? q : ''} />;
}
