import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { EmptyState } from '@/components/states/empty-state';
import { Toaster } from '@/components/ui/sonner';
import { logOut } from '@/features/auth';
import { ConsoleNav, ConsoleNavFallback } from '@/features/platform';
import { clientMessages } from '@/i18n/client-messages';
import { requireSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Super Admin console shell (spec 05): platform roles only; `aal2` is enforced per page group. */
export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  const messages = await clientMessages(['admin', 'common']);
  const t = await getTranslations('admin');
  const link = 'inline-flex min-h-target items-center rounded-sm px-3 hover:bg-accent';
  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 pt-safe backdrop-blur-md">
          <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-gutter">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo name={env.NEXT_PUBLIC_APP_NAME} />
              <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-semibold tracking-label text-brand-on-subtle uppercase max-sm:hidden">
                {t('title')}
              </span>
            </Link>
            <nav
              aria-label={t('title')}
              className="flex flex-wrap items-center gap-1 text-sm font-medium"
            >
              <Suspense fallback={<ConsoleNavFallback />}>
                <ConsoleNav />
              </Suspense>
              <form action={logOut}>
                <button type="submit" className={link}>
                  {t('logout')}
                </button>
              </form>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-gutter py-8 pb-safe">
          <Suspense>
            <PlatformGate>{children}</PlatformGate>
          </Suspense>
        </main>
      </div>
      <Toaster position="bottom-center" containerAriaLabel={t('title')} />
    </NextIntlClientProvider>
  );
}

/** Non-platform users get a calm 403; reads and writes check the role again (rule 10). */
async function PlatformGate({ children }: { children: ReactNode }) {
  const claims = await requireSessionClaims('/admin');
  if (claims.platform_role === 'none') {
    const t = await getTranslations('admin.forbidden');
    return (
      <EmptyState
        icon={<ShieldAlert />}
        title={t('title')}
        description={t('description')}
        headingLevel={1}
        className="bg-card py-16"
      />
    );
  }
  return children;
}
