import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { VenueScreen } from '@/features/platform';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('venues') };
}

export default function AdminVenuePage({ params }: PageProps<'/[locale]/admin/restaurants/[id]'>) {
  return (
    <Suspense>
      <Venue params={params} />
    </Suspense>
  );
}

async function Venue({
  params,
}: {
  params: PageProps<'/[locale]/admin/restaurants/[id]'>['params'];
}) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  return <VenueScreen id={id.data} />;
}
