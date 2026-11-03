import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { StaffHomeScreen } from '@/features/staff';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staff.meta');
  return { title: t('home') };
}

export default function StaffPage() {
  return (
    <Suspense>
      <StaffHomeScreen />
    </Suspense>
  );
}
