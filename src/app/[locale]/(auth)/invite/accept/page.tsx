import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmailLinkPage } from '@/components/layout/email-link-page';
import { acceptInvite } from '@/features/staff';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.invite');
  return { title: t('title') };
}

/** Invitation link (spec 04): the GET shows a button; the token is used on click. */
export default async function AcceptInvitePage({
  searchParams,
}: PageProps<'/[locale]/invite/accept'>) {
  const t = await getTranslations('auth.invite');
  return (
    <Suspense>
      <EmailLinkPage
        searchParams={searchParams}
        title={t('title')}
        description={t('description')}
        submitLabel={t('submit')}
        action={acceptInvite}
      />
    </Suspense>
  );
}
