import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { StaffLoginScreen } from '@/features/staff';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staff.meta');
  return { title: t('login') };
}

export default function StaffLoginPage() {
  return (
    <Suspense>
      <StaffLoginScreen />
    </Suspense>
  );
}
