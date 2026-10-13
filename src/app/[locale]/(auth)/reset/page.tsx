import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetRequestForm } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('reset') };
}

export default function ResetPage() {
  return <ResetRequestForm />;
}
