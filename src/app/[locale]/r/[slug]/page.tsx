import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingRegion } from '@/components/states/loading-region';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicMenuView, getPublicMenu } from '@/features/menu';
import { LOCALES } from '@/i18n/locales';

/** Public menu `/{slug}` (spec 02): the proxy rewrites it to `/{locale}/r/{slug}`. */

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/r/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const menu = await getPublicMenu(slug, locale);
  if (!menu) return {};
  const t = await getTranslations({ locale, namespace: 'client.meta' });
  return {
    title: { absolute: t('title', { name: menu.restaurant.name }) },
    description: t('description', { name: menu.restaurant.name }),
  };
}

export default async function PublicMenuPage({ params }: PageProps<'/[locale]/r/[slug]'>) {
  const t = await getTranslations('client');
  return (
    <Suspense fallback={<MenuSkeleton label={t('loading')} />}>
      <MenuForRequest params={params} />
    </Suspense>
  );
}

async function MenuForRequest({ params }: { params: PageProps<'/[locale]/r/[slug]'>['params'] }) {
  const { locale, slug } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  const menu = await getPublicMenu(slug, locale);
  if (!menu) notFound();
  return <PublicMenuView menu={menu} locale={locale} />;
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
