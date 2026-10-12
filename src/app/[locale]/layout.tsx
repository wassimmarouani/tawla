import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { LOCALES, directionOf } from '@/i18n/locales';
import { env } from '@/lib/env';
import { fontVariables } from '@/styles/fonts';
import '../globals.css';

// Unknown locales are rejected below with notFound(); `dynamicParams` is incompatible with
// Cache Components.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing.meta' });
  return {
    title: env.NEXT_PUBLIC_APP_NAME,
    description: t('description'),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
