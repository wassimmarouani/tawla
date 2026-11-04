import type { MetadataRoute } from 'next';
import { MARKETING_PAGES, marketingHref } from '@/features/marketing';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';

/** Marketing pages in every locale, with hreflang alternates (legal drafts excluded). */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (locale: (typeof LOCALES)[number], path: string) =>
    `${env.NEXT_PUBLIC_APP_URL}${marketingHref(locale, path)}`;
  return MARKETING_PAGES.filter((path) => !path.startsWith('/legal/')).flatMap((path) =>
    LOCALES.map((locale) => ({
      url: url(locale, path),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((value) => [value, url(value, path)])),
      },
    })),
  );
}
