import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { MenuSkeleton, ProductSheetSlot, PublicMenuView, getPublicMenu } from '@/features/menu';
import {
  TableNotFound,
  TableServiceBar,
  getPublicTable,
  serviceRequestsEnabled,
} from '@/features/table-service';
import { LOCALES } from '@/i18n/locales';

/** Table menu `/t/{token}` (ADR-0011, ADR-0012): never indexed, the QR is private to the table. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TableMenuPage({
  params,
  searchParams,
}: PageProps<'/[locale]/t/[token]'>) {
  const t = await getTranslations('client');
  return (
    <Suspense fallback={<MenuSkeleton label={t('loading')} />}>
      <TableMenu params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Dynamic on purpose: the token is checked on every request, so a regenerated QR fails at
 * once. The menu itself comes from the shared cache (getPublicMenu).
 */
async function TableMenu({ params, searchParams }: PageProps<'/[locale]/t/[token]'>) {
  await connection();
  const { locale, token } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  const table = await getPublicTable(token);
  const menu = table ? await getPublicMenu(table.restaurant_slug, locale) : null;
  if (!table || !menu) return <TableNotFound />;
  // Menu QR plan (ADR-0031): the menu only, no waiter calls or bill requests.
  const withService = await serviceRequestsEnabled({ slug: table.restaurant_slug });
  return (
    <>
      <PublicMenuView
        menu={menu}
        locale={locale}
        table={table}
        tableToken={token}
        serviceBar={withService ? <TableServiceBar token={token} locale={locale} /> : undefined}
      />
      <ProductSheetSlot
        params={Promise.resolve({ locale, slug: table.restaurant_slug })}
        searchParams={searchParams}
      />
    </>
  );
}
