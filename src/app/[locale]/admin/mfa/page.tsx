import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MfaScreen } from '@/features/platform';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.mfa');
  return { title: t('title') };
}

export default function AdminMfaPage() {
  return (
    <Suspense>
      <MfaScreen />
    </Suspense>
  );
}
