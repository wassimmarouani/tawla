import { ChevronLeft, Lock, Printer } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { MenuImage } from '@/components/media/menu-image';
import { EmptyState } from '@/components/states/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { can } from '@/features/auth';
import { getPublicMenu } from '@/features/menu';
import { getTenantContext } from '@/features/tenancy';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { loadTables } from '../queries/tables';
import { PrintControls } from './print-controls';
import { TablesEditor } from './tables-editor';
import { Tent, type TentText } from './tent';

async function tablesPageData() {
  const [claims, tenant, rawLocale] = await Promise.all([
    getSessionClaims(),
    getTenantContext(),
    getLocale(),
  ]);
  if (!claims || tenant.kind !== 'ok') return null;
  const { role, restaurant, flags } = tenant.context;
  return {
    claims,
    restaurant,
    flags,
    canEdit: can(role, 'tables.manage') && restaurant.status === 'active',
    locale: isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE,
  };
}

/** `/dashboard/tables` (P1-08): tables, zones and QR codes. */
export async function TablesScreen() {
  const data = await tablesPageData();
  if (!data) return null;
  const t = await getTranslations('tables');
  const tSection = await getTranslations('dashboard.sections.tables');
  const { tables, zones } = await loadTables(data.claims, data.restaurant.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={tSection('title')} description={t('page.description')} />
      {data.canEdit ? (
        <TablesEditor
          tables={tables}
          zones={zones}
          zonesEnabled={data.flags.staff_zones}
          locale={data.locale}
          locales={data.restaurant.locales}
        />
      ) : (
        <EmptyState icon={<Lock />} title={t('errors.readOnly')} className="bg-card py-16" />
      )}
      <section className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">{t('page.generalTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('page.generalHint')}{' '}
            <span dir="ltr" className="font-medium break-all text-foreground">
              {env.APP_DOMAIN}/{data.restaurant.slug}
            </span>
          </p>
        </div>
        <Link
          href="/dashboard/tables/print?general=1&ids=none"
          className={buttonVariants({ variant: 'outline', className: 'shrink-0' })}
        >
          <Printer aria-hidden="true" />
          {t('table.print')}
        </Link>
      </section>
    </div>
  );
}

const TEMPLATES = ['a6', 'a4'] as const;
type Template = (typeof TEMPLATES)[number];

interface PrintScreenProps {
  template: string | undefined;
  /** Comma-separated table ids, `none`, or undefined for every table. */
  ids: string | undefined;
  general: boolean;
}

/** `/dashboard/tables/print` (ADR-0019): print-optimised tents, saved as PDF by the browser. */
export async function TablesPrintScreen({ template, ids, general }: PrintScreenProps) {
  const data = await tablesPageData();
  if (!data) return null;
  const t = await getTranslations('tables');
  const sheet: Template = template === 'a4' ? 'a4' : 'a6';
  const { tables } = await loadTables(data.claims, data.restaurant.id);
  const wanted = ids === undefined ? null : new Set(ids.split(','));
  const selected = tables.filter((table) => table.isActive && (!wanted || wanted.has(table.id)));
  const menu = await getPublicMenu(data.restaurant.slug, data.locale);
  const logo = menu?.restaurant.logo ?? null;

  // Tents carry the three languages whatever the interface language.
  const [tFr, tAr, tEn] = await Promise.all([
    getTranslations({ locale: 'fr', namespace: 'tables.tent' }),
    getTranslations({ locale: 'ar', namespace: 'tables.tent' }),
    getTranslations({ locale: 'en', namespace: 'tables.tent' }),
  ]);
  const pick = (key: 'table' | 'menu' | 'scanMenu' | 'scanOrder'): TentText => ({
    fr: tFr(key),
    ar: tAr(key),
    en: tEn(key),
  });
  const scan = pick(data.flags.ordering ? 'scanOrder' : 'scanMenu');
  const logoElement = logo ? (
    <MenuImage media={logo} alt="" sizes="48px" className="size-full" />
  ) : (
    <span aria-hidden="true">{Array.from(data.restaurant.name)[0]}</span>
  );
  const count = selected.length + (general ? 1 : 0);
  const hrefFor = (next: Template) => {
    const params = new URLSearchParams({ template: next });
    if (ids !== undefined) params.set('ids', ids);
    if (general) params.set('general', '1');
    return `/dashboard/tables/print?${params.toString()}` as const;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 print:hidden">
        <PageHeader
          eyebrow={
            <Link
              href="/dashboard/tables"
              className="inline-flex min-h-target items-center gap-1 rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
              {t('print.back')}
            </Link>
          }
          title={t('print.title')}
          description={t('print.count', { count })}
          actions={<PrintControls label={t('print.print')} />}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">{t('print.template')}</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((value) => (
              <Link
                key={value}
                href={hrefFor(value)}
                aria-current={value === sheet ? 'true' : undefined}
                className={buttonVariants({
                  variant: value === sheet ? 'secondary' : 'outline',
                  className: cn(value === sheet && 'ring-2 ring-ring'),
                })}
              >
                {t(`print.${value}`)}
              </Link>
            ))}
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">{t('print.hint')}</p>
        </div>
      </div>

      {count === 0 ? (
        <EmptyState icon={<Printer />} title={t('print.empty')} className="bg-card py-16" />
      ) : (
        <div className="tent-sheet" data-template={sheet}>
          {/* Paper of the chosen template in millimetres (Chromium has no A6 keyword); static text. */}
          <style>{`@page { size: ${sheet === 'a4' ? '210mm 297mm' : '105mm 148mm'}; margin: 0; }`}</style>
          {general ? (
            <Tent
              venue={data.restaurant.name}
              logo={logoElement}
              caption={pick('menu')}
              number={null}
              label={null}
              url={`${env.NEXT_PUBLIC_APP_URL}/${data.restaurant.slug}`}
              scan={pick('scanMenu')}
              qrLabel={t('print.qrAlt', { name: data.restaurant.name })}
            />
          ) : null}
          {selected.map((table) => (
            <Tent
              key={table.id}
              venue={data.restaurant.name}
              logo={logoElement}
              caption={pick('table')}
              number={table.number}
              label={table.label}
              url={`${env.NEXT_PUBLIC_APP_URL}/t/${table.token}`}
              scan={scan}
              qrLabel={t('print.qrAlt', { name: t('table.name', { number: table.number }) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
