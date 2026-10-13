import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LoadingRegion } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMenu } from '@/features/auth';
import { RestaurantSwitcher, getTenantContext } from '@/features/tenancy';
import { clientMessages } from '@/i18n/client-messages';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { DashboardForbidden } from './_components/dashboard-forbidden';
import { DashboardNoRestaurant } from './_components/dashboard-no-restaurant';

/** Back-office shell (P0-11): tenant context, header, restaurant switcher, account menu. */
export default async function DashboardLayout({ children }: LayoutProps<'/[locale]/dashboard'>) {
  const messages = await clientMessages(['auth', 'common', 'dashboard', 'onboarding']);
  const t = await getTranslations('dashboard');
  return (
    <NextIntlClientProvider messages={messages}>
      <Suspense fallback={<DashboardSkeleton label={t('loading')} />}>
        <DashboardFrame>{children}</DashboardFrame>
      </Suspense>
    </NextIntlClientProvider>
  );
}

async function DashboardFrame({ children }: { children: ReactNode }) {
  const result = await getTenantContext();
  if (result.kind === 'no-restaurant') return <DashboardNoRestaurant />;
  if (result.kind === 'forbidden') return <DashboardForbidden />;

  const { context } = result;
  const claims = await getSessionClaims();
  const t = await getTranslations('dashboard');
  const plan =
    context.planCode === 'basic' || context.planCode === 'pro' || context.planCode === 'premium'
      ? t(`plans.${context.planCode}`)
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-safe backdrop-blur-md">
        <nav
          aria-label={t('nav.label')}
          className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-gutter sm:gap-4"
        >
          <Link
            href="/dashboard"
            className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo name={env.NEXT_PUBLIC_APP_NAME} showName={false} />
          </Link>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
          <div className="min-w-0 flex-1">
            <RestaurantSwitcher current={context.restaurant} restaurants={context.restaurants} />
          </div>
          {plan ? (
            <Badge variant="soft" className="hidden shrink-0 sm:inline-flex">
              {t('nav.plan', { plan })}
            </Badge>
          ) : null}
          <UserMenu email={claims?.email ?? ''} name={claims?.user_metadata?.full_name} />
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-gutter pb-safe pt-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="flex min-h-dvh flex-col">
      <div className="border-b border-border pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-gutter">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ms-auto size-9 rounded-full" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-gutter pt-10">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    </LoadingRegion>
  );
}
