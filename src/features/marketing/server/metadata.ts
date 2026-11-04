import type { Metadata } from 'next';
import { LOCALES, type Locale } from '@/i18n/locales';
import { marketingHref } from '../services/paths';

interface MarketingMetadataInput {
  appUrl: string;
  appName: string;
  locale: Locale;
  path: string;
  title?: string;
  description: string;
}

/** Canonical, hreflang alternates and social card of a marketing page (P1-16). */
export function marketingMetadata(input: MarketingMetadataInput): Metadata {
  const { appUrl, appName, locale, path, title, description } = input;
  const url = (value: Locale) => `${appUrl}${marketingHref(value, path)}`;
  const languages = Object.fromEntries(LOCALES.map((value) => [value, url(value)]));
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url(locale), languages: { ...languages, 'x-default': url('fr') } },
    openGraph: {
      type: 'website',
      siteName: appName,
      url: url(locale),
      locale,
      title: title ?? appName,
      description,
      images: [{ url: `${appUrl}/og.png`, width: 1200, height: 630, alt: appName }],
    },
    twitter: { card: 'summary_large_image' },
  };
}
