import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  LEGAL_PAGES,
  LegalPage,
  MarketingShell,
  isLegalPage,
  marketingMetadata,
} from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((page) => ({ page }));
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/legal/[page]'>): Promise<Metadata> {
  const { locale, page } = await params;
  if (!hasLocale(LOCALES, locale) || !isLegalPage(page)) return {};
  const t = await getTranslations({ locale, namespace: 'marketing.legal' });
  return {
    ...marketingMetadata({
      appUrl: env.NEXT_PUBLIC_APP_URL,
      appName: env.NEXT_PUBLIC_APP_NAME,
      locale,
      path: `/legal/${page}`,
      title: t(`pages.${page}.title`),
      description: t('pending'),
    }),
    // Drafts pending legal review: kept out of search results until validated.
    robots: { index: false, follow: true },
  };
}

/** Legal placeholders `/legal/{notice|terms|privacy}` (P1-16), pending legal review. */
export default async function Legal({ params }: PageProps<'/[locale]/legal/[page]'>) {
  const { locale, page } = await params;
  if (!hasLocale(LOCALES, locale) || !isLegalPage(page)) notFound();
  return (
    <MarketingShell locale={locale} path={`/legal/${page}`}>
      <LegalPage locale={locale} page={page} />
    </MarketingShell>
  );
}
