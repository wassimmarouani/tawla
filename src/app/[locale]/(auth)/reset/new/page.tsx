import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthHeading } from '@/components/layout/auth-heading';
import { NewPasswordForm } from '@/features/auth';
import { getSessionClaims } from '@/lib/auth/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('newPassword') };
}

export default async function NewPasswordPage() {
  const t = await getTranslations('auth.reset');
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading title={t('newTitle')} description={t('newDescription')} />
      <Suspense>
        <RequireRecoverySession />
      </Suspense>
    </div>
  );
}

/** Reached after the recovery link created a session; otherwise start over. */
async function RequireRecoverySession() {
  if (!(await getSessionClaims())) redirect('/reset');
  return <NewPasswordForm />;
}
