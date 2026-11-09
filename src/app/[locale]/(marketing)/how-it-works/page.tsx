import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { HowItWorksPage, MarketingShell, marketingMetadata } from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/how-it-works'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing.howItWorks' });
  return marketingMetadata({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    appName: env.NEXT_PUBLIC_APP_NAME,
    locale,
    path: '/how-it-works',
    title: t('title'),
    description: t('intro'),
  });
}

/** "Comment ça marche" `/how-it-works` (and `/fr/how-it-works`, `/ar/how-it-works`): explainer. */
export default async function How({ params }: PageProps<'/[locale]/how-it-works'>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  return (
    <MarketingShell locale={locale} path="/how-it-works">
      <HowItWorksPage locale={locale} />
    </MarketingShell>
  );
}
