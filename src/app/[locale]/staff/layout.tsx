import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Toaster } from '@/components/ui/sonner';
import { clientMessages } from '@/i18n/client-messages';
import { env } from '@/lib/env';
import { ServiceWorkerRegistration } from '@/features/staff';

export const metadata: Metadata = {
  manifest: '/staff.webmanifest',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default' },
  robots: { index: false, follow: false },
};

/** Staff app shell (spec 03): pairing, sign-in and the service screens on paired devices. */
export default async function StaffLayout({ children }: LayoutProps<'/[locale]/staff'>) {
  const t = await getTranslations('auth.shell');
  const tDashboard = await getTranslations('dashboard');
  const messages = await clientMessages(['auth', 'common', 'staff', 'team']);
  const app = env.NEXT_PUBLIC_APP_NAME;
  return (
    <NextIntlClientProvider messages={messages}>
      <ServiceWorkerRegistration />
      <div className="flex min-h-dvh flex-col bg-background px-gutter pt-safe pb-safe">
        <header className="flex h-16 items-center justify-between gap-4">
          <Logo name={app} />
          <LanguageSwitcher label={t('language')} />
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col py-8">{children}</main>
      </div>
      <Toaster position="bottom-center" containerAriaLabel={tDashboard('notifications')} />
    </NextIntlClientProvider>
  );
}
