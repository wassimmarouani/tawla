import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  JsonLd,
  MenuSkeleton,
  ProductSheetSlot,
  PublicMenuView,
  getPublicMenu,
  menuJsonLd,
  type PublicMenu,
} from '@/features/menu';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';
import { largestRendition, mediaUrl } from '@/lib/media/urls';

const canonicalUrl = (slug: string) => `${env.NEXT_PUBLIC_APP_URL}/${slug}`;

/** Absolute URL of the largest WebP cover rendition, for social cards and structured data. */
function coverUrl(menu: PublicMenu): string | null {
  const cover = menu.restaurant.cover;
  if (!cover) return null;
  return mediaUrl(
    env.NEXT_PUBLIC_SUPABASE_URL,
    cover.base_path,
    largestRendition(cover).width,
    'webp',
  );
}

/** Public menu `/{slug}` (spec 02): the proxy rewrites it to `/{locale}/r/{slug}`. */

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/r/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const menu = await getPublicMenu(slug, locale);
  if (!menu) return {};
  const t = await getTranslations({ locale, namespace: 'client.meta' });
  const title = t('title', { name: menu.restaurant.name });
  const description = t('description', { name: menu.restaurant.name });
  const image = coverUrl(menu);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl(slug) },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonicalUrl(slug),
      siteName: env.NEXT_PUBLIC_APP_NAME,
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_GB' : 'fr_TN',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: PageProps<'/[locale]/r/[slug]'>) {
  const t = await getTranslations('client');
  return (
    <>
      <Suspense fallback={<MenuSkeleton label={t('loading')} />}>
        <MenuForRequest params={params} />
      </Suspense>
      {/* `?p=<product>`: a dynamic hole, so the menu above stays cached. */}
      <Suspense>
        <ProductSheetSlot params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MenuForRequest({ params }: { params: PageProps<'/[locale]/r/[slug]'>['params'] }) {
  const { locale, slug } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  const menu = await getPublicMenu(slug, locale);
  if (!menu) notFound();
  return (
    <>
      <JsonLd data={menuJsonLd({ menu, url: canonicalUrl(slug), image: coverUrl(menu) })} />
      <PublicMenuView menu={menu} locale={locale} />
    </>
  );
}
