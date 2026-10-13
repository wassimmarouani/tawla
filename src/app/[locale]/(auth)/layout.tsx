import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { AuthBrandPanel } from '@/components/layout/auth-brand-panel';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { clientMessages } from '@/i18n/client-messages';
import { env } from '@/lib/env';

/** Login, sign-up and password reset: form column + brand panel on large screens. */
export default async function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = await getTranslations('auth.shell');
  const messages = await clientMessages(['auth', 'common', 'onboarding']);
  const app = env.NEXT_PUBLIC_APP_NAME;

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="flex min-w-0 flex-col px-gutter pt-safe pb-safe">
          <header className="flex h-16 items-center justify-between gap-4 sm:px-4">
            <Link
              href="/"
              aria-label={t('home', { app })}
              className="-ms-1 rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo name={app} />
            </Link>
            <LanguageSwitcher label={t('language')} />
          </header>
          <main className="flex flex-1 items-center justify-center py-10 sm:py-16">
            <div className="w-full max-w-sm">{children}</div>
          </main>
        </div>
        <AuthBrandPanel />
      </div>
    </NextIntlClientProvider>
  );
}
