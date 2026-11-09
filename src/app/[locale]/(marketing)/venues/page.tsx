import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DirectoryPage, MarketingShell, marketingMetadata } from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/venues'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing.directory' });
  return marketingMetadata({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    appName: env.NEXT_PUBLIC_APP_NAME,
    locale,
    path: '/venues',
    title: t('title'),
    description: t('intro'),
  });
}

/** `/venues` — public directory of venues (D17): opt-in by owner, groups by type. */
export default async function Venues({ params }: PageProps<'/[locale]/venues'>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  return (
    <MarketingShell locale={locale} path="/venues">
      <DirectoryPage locale={locale} />
    </MarketingShell>
  );
}
