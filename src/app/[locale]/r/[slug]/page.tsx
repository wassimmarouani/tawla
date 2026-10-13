import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingRegion } from '@/components/states/loading-region';
import { Skeleton } from '@/components/ui/skeleton';
import {
  JsonLd,
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

/** Final-size placeholders: header, category bar, two cards (no layout shift). */
function MenuSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="block min-h-dvh bg-background">
      <Skeleton className="h-60 w-full rounded-none sm:h-72 lg:h-80" />
      <div className="relative mx-gutter -mt-11 max-w-3xl rounded-lg bg-card px-5 pt-11 pb-4 shadow-md md:mx-auto">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto mt-4 h-5 w-32" />
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl gap-2 px-gutter">
        <Skeleton className="h-target w-24 rounded-full" />
        <Skeleton className="h-target w-32 rounded-full" />
        <Skeleton className="h-target w-28 rounded-full" />
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 px-gutter sm:grid-cols-3">
        <Skeleton className="aspect-square rounded-md" />
        <Skeleton className="aspect-square rounded-md" />
      </div>
    </LoadingRegion>
  );
}
