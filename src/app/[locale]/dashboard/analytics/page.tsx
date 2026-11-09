import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AnalyticsScreen } from '@/features/analytics';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics');
  return { title: t('title') };
}

/** `/dashboard/analytics` (A1): menu scans and service requests over 30 days. */
export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsScreen />
    </Suspense>
  );
}
