import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from '@/features/auth';
import { safeNextPath } from '@/lib/auth/next-path';
import { getSessionClaims } from '@/lib/auth/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('login') };
}

export default async function LoginPage({ searchParams }: PageProps<'/[locale]/login'>) {
  const t = await getTranslations('auth.login');
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading title={t('title')} description={t('description')} />
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormForRequest searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginFormForRequest({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/login'>['searchParams'];
}) {
  const { next } = await searchParams;
  const destination = typeof next === 'string' ? next : undefined;
  // Already signed in: go straight to the destination.
  if (await getSessionClaims()) redirect(safeNextPath(destination));
  return <LoginForm next={destination} />;
}

function FormSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <Skeleton className="h-target w-full" />
      <Skeleton className="h-target w-full" />
      <Skeleton className="h-target-staff w-full" />
    </div>
  );
}
