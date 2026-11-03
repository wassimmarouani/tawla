import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LoadingRegion } from '@/components/states/loading-region';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { UserMenu, logOut } from '@/features/auth';
import { CommandPalette, NavLinks, dashboardNavigation } from '@/features/backoffice';
import { RestaurantSwitcher, getTenantContext, switchRestaurant } from '@/features/tenancy';
import { clientMessages } from '@/i18n/client-messages';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { DashboardForbidden } from './_components/dashboard-forbidden';
import { DashboardNoRestaurant } from './_components/dashboard-no-restaurant';

/**
 * Back-office shell (P1-04, spec 04): header (venue switcher, Ctrl/Cmd + K palette, plan,
 * account), sidebar from 1024 px, bottom tab bar on phones and tablets.
 */
export default async function DashboardLayout({ children }: LayoutProps<'/[locale]/dashboard'>) {
  const messages = await clientMessages([
    'auth',
    'common',
    'dashboard',
    'menuEditor',
    'onboarding',
    'tables',
    'team',
  ]);
  const t = await getTranslations('dashboard');
  return (
    <NextIntlClientProvider messages={messages}>
      <Suspense fallback={<DashboardSkeleton label={t('loading')} />}>
        <DashboardFrame>{children}</DashboardFrame>
      </Suspense>
      {/* Above the tab bar on phones and tablets (--tabbar-clearance, globals.css). */}
      <Toaster
        position="bottom-center"
        containerAriaLabel={t('notifications')}
        offset={{ bottom: 'calc(var(--tabbar-clearance) + 1rem)' }}
        mobileOffset={{ bottom: 'calc(var(--tabbar-clearance) + 1rem)' }}
      />
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
  const items = dashboardNavigation(context.role).map((item) => ({
    ...item,
    label: t(`nav.${item.key}`),
    shortLabel: t(`nav.tabs.${item.key}`),
  }));

  return (
    <div className="flex min-h-dvh flex-col print:min-h-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-safe backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-gutter sm:gap-4">
          <Link
            href="/dashboard"
            aria-label={t('nav.overview')}
            className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo name={env.NEXT_PUBLIC_APP_NAME} showName={false} />
          </Link>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
          <div className="min-w-0 flex-1">
            <RestaurantSwitcher current={context.restaurant} restaurants={context.restaurants} />
          </div>
          <CommandPalette
            items={items}
            restaurants={context.restaurants.map((restaurant) => ({
              id: restaurant.id,
              name: restaurant.name,
              current: restaurant.id === context.restaurant.id,
            }))}
            publicMenuPath={`/${context.restaurant.slug}`}
            labels={{
              title: t('palette.title'),
              description: t('palette.description'),
              placeholder: t('palette.placeholder'),
              empty: t('palette.empty'),
              navigation: t('palette.navigation'),
              actions: t('palette.actions'),
              restaurants: t('palette.restaurants'),
              viewMenu: t('palette.viewMenu'),
              logOut: t('palette.logOut'),
              search: t('nav.search'),
              searchHint: t('nav.searchHint'),
              shortcut: t('nav.shortcut'),
            }}
            onSwitchRestaurant={switchRestaurant}
            onLogOut={logOut}
          />
          {plan ? (
            <Badge variant="soft" className="hidden shrink-0 lg:inline-flex">
              {t('nav.plan', { plan })}
            </Badge>
          ) : null}
          <UserMenu email={claims?.email ?? ''} name={claims?.user_metadata?.full_name} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-60 shrink-0 border-e border-border px-4 py-8 lg:block print:hidden">
          <div className="sticky top-24">
            <NavLinks items={items} label={t('nav.sections')} variant="sidebar" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col px-gutter pt-8 pb-28 sm:pt-10 lg:px-10 lg:pb-12 print:p-0">
          {children}
        </main>
      </div>

      <NavLinks items={items} label={t('nav.sections')} variant="tabbar" />
    </div>
  );
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="flex min-h-dvh flex-col">
      <div className="border-b border-border pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-gutter">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ms-auto size-9 rounded-full" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <div className="hidden w-60 shrink-0 flex-col gap-2 border-e border-border px-4 py-8 lg:flex">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-1 flex-col gap-6 px-gutter pt-10 lg:px-10">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    </LoadingRegion>
  );
}
