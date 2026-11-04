import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Landing, MarketingShell, marketingMetadata } from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing' });
  return marketingMetadata({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    appName: env.NEXT_PUBLIC_APP_NAME,
    locale,
    path: '/',
    description: t('meta.description'),
  });
}

/** Marketing home (P1-16). */
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  return (
    <MarketingShell locale={locale} path="/">
      <Landing locale={locale} />
    </MarketingShell>
  );
}
