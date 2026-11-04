import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { MarketingShell, PricingPage, marketingMetadata } from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pricing'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing.pricing' });
  return marketingMetadata({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    appName: env.NEXT_PUBLIC_APP_NAME,
    locale,
    path: '/pricing',
    title: t('title'),
    description: t('description'),
  });
}

/** Pricing `/pricing`, `/ar/pricing`, `/en/pricing` (P1-16). */
export default async function Pricing({ params }: PageProps<'/[locale]/pricing'>) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  return (
    <MarketingShell locale={locale} path="/pricing">
      <PricingPage locale={locale} />
    </MarketingShell>
  );
}
