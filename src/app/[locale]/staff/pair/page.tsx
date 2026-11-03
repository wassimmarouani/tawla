import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { StaffPairScreen } from '@/features/staff';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staff.meta');
  return { title: t('pair') };
}

export default function StaffPairPage({ searchParams }: PageProps<'/[locale]/staff/pair'>) {
  return (
    <Suspense>
      <PairForRequest searchParams={searchParams} />
    </Suspense>
  );
}

async function PairForRequest({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/staff/pair'>['searchParams'];
}) {
  const { code } = await searchParams;
  return <StaffPairScreen code={typeof code === 'string' ? code.slice(0, 12) : undefined} />;
}
