import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuditScreen } from '@/features/platform';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('audit') };
}

export default function AdminAuditPage({ searchParams }: PageProps<'/[locale]/admin/audit'>) {
  return (
    <Suspense>
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/admin/audit'>['searchParams'];
}) {
  const { action } = await searchParams;
  return <AuditScreen action={typeof action === 'string' ? action : ''} />;
}
