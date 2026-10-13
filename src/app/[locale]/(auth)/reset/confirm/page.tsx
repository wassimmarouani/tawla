import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmailLinkPage } from '@/components/layout/email-link-page';
import { confirmRecovery } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('reset') };
}

export default async function ConfirmRecoveryPage({
  searchParams,
}: PageProps<'/[locale]/reset/confirm'>) {
  const t = await getTranslations('auth.reset');
  return (
    <Suspense>
      <EmailLinkPage
        searchParams={searchParams}
        title={t('confirmTitle')}
        description={t('confirmDescription')}
        submitLabel={t('confirmSubmit')}
        action={confirmRecovery}
      />
    </Suspense>
  );
}
