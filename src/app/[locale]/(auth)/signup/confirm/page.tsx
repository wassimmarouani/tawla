import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmailLinkPage } from '@/components/layout/email-link-page';
import { confirmSignUp } from '@/features/onboarding';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('confirm') };
}

export default async function ConfirmSignUpPage({
  searchParams,
}: PageProps<'/[locale]/signup/confirm'>) {
  const t = await getTranslations('auth.confirm');
  return (
    <Suspense>
      <EmailLinkPage
        searchParams={searchParams}
        title={t('title')}
        description={t('description')}
        submitLabel={t('submit')}
        action={confirmSignUp}
      />
    </Suspense>
  );
}
