import { ChevronLeft, ExternalLink, ShieldCheck, Store } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pickTranslation } from '@/features/menu';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { getSessionClaims } from '@/lib/auth/session';
import { formatMoney } from '@/lib/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  demoVenueState,
  globalAudit,
  listPlans,
  listVenues,
  platformKpis,
  venueDetail,
  type AuditRow,
  type PlatformKpis,
} from '../server/data';
import { MfaForm } from './mfa-form';
import { StartImpersonationButton } from './impersonation-start';
import { InstallDemoButton, OverridesEditor, PlanForm } from './venue-forms';

async function locale() {
  const value = await getLocale();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** `/admin/mfa`: enrol or verify TOTP; a session already at `aal2` goes on to the console. */
export async function MfaScreen() {
  const claims = await getSessionClaims();
  if (!claims) redirect('/login?next=/admin');
  if (claims.aal === 'aal2') redirect('/admin');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp[0];
  const t = await getTranslations('admin.mfa');
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <ShieldCheck aria-hidden="true" className="size-10 text-brand-text" />
        <h1 className="text-2xl font-title tracking-heading text-foreground">{t('title')}</h1>
      </div>
      <MfaForm factorId={verified?.id ?? null} />
    </div>
  );
}

/** `/admin`: every venue, searchable (spec 05). */
export async function VenuesScreen({ query }: { query: string }) {
  const claims = await getSessionClaims();
  const [venues, plans] = await Promise.all([listVenues(claims, query), listPlans(claims)]);
  const t = await getTranslations('admin');
  const format = await getFormatter();
  const current = await locale();
  const planName = (code: string | null) => {
    const plan = plans.find((item) => item.code === code);
    const name = plan ? pickTranslation(plan.name as Record<string, string>, current, 'fr') : null;
    return name?.text ?? t('list.noPlan');
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('venues')} />
      {claims?.platform_role === 'super_admin' ? <DemoVenueCard /> : null}
      <KpiCards claims={claims} />

      <form role="search" className="flex flex-wrap gap-2" action="/admin">
        <Input
          name="q"
          defaultValue={query}
          aria-label={t('list.search')}
          placeholder={t('list.search')}
          className="max-w-sm"
          dir="auto"
        />
        <button type="submit" className={buttonVariants({ variant: 'outline' })}>
          {t('list.searchButton')}
        </button>
      </form>
      {venues.length === 0 ? (
        <p className="text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-xl text-sm">
            <thead className="text-start text-muted-foreground">
              <tr>
                <th className="p-3 text-start font-medium">{t('list.name')}</th>
                <th className="p-3 text-start font-medium">{t('list.plan')}</th>
                <th className="p-3 text-start font-medium">{t('list.status')}</th>
                <th className="p-3 text-end font-medium">{t('list.members')}</th>
                <th className="p-3 text-end font-medium">{t('list.ai')}</th>
                <th className="p-3 text-start font-medium">{t('list.created')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td className="p-3">
                    <Link
                      href={`/admin/restaurants/${venue.id}`}
                      className="inline-flex min-h-target items-center font-semibold text-brand-text underline-offset-4 hover:underline"
                    >
                      {venue.name}
                    </Link>
                    <span className="block text-muted-foreground" dir="ltr">
                      /{venue.slug}
                    </span>
                  </td>
                  <td className="p-3">{planName(venue.plan)}</td>
                  <td className="p-3">{t(`statuses.${venue.status as 'active'}`)}</td>
                  <td className="p-3 text-end tabular-nums">{venue.members}</td>
                  <td className="p-3 text-end tabular-nums">
                    {formatMoney(venue.aiCostMillimes, current)}
                  </td>
                  <td className="p-3">
                    {format.dateTime(new Date(venue.createdAt), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Shown until the sales demo venue is fully installed (marketing home demo). */
/** Platform-wide headline numbers above the venue list (Super Admin v2). */
async function KpiCards({ claims }: { claims: Awaited<ReturnType<typeof getSessionClaims>> }) {
  const kpis: PlatformKpis = await platformKpis(claims);
  const t = await getTranslations('admin.kpis');
  const format = await getFormatter();
  const current = await locale();
  const items = [
    {
      key: 'venues',
      value: format.number(kpis.venues.active),
      hint: t('venuesHint', { total: kpis.venues.total, week: kpis.venues.newThisWeek }),
    },
    {
      key: 'menuViews',
      value: format.number(kpis.activity.menuViewsThisMonth),
      hint: t('monthHint'),
    },
    {
      key: 'service',
      value: format.number(kpis.activity.serviceRequestsThisMonth),
      hint: t('monthHint'),
    },
    {
      key: 'ai',
      value: formatMoney(kpis.ai.costThisMonthMillimes, current),
      hint: t('aiHint', { imports: kpis.ai.imports, items: kpis.ai.translatedItems }),
    },
  ] as const;
  return (
    <section aria-labelledby="kpis" className="flex flex-col gap-3">
      <h2 id="kpis" className="sr-only">
        {t('title')}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col gap-1 rounded-md border border-border bg-card p-4"
          >
            <dt className="text-xs font-semibold tracking-label text-muted-foreground uppercase">
              {t(item.key as 'venues')}
            </dt>
            <dd className="text-2xl font-semibold text-foreground tabular-nums">{item.value}</dd>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function DemoVenueCard() {
  const state = await demoVenueState();
  if (state === 'ready') return null;
  const t = await getTranslations('admin.demo');
  return (
    <section
      aria-labelledby="demo-venue-title"
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-5 sm:flex-row sm:items-center"
    >
      <Store aria-hidden="true" className="size-8 shrink-0 text-brand-text" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="demo-venue-title" className="font-semibold text-foreground">
          {t('title')}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {state === 'partial' ? t('partial') : t('missing')}
        </p>
      </div>
      <InstallDemoButton partial={state === 'partial'} />
    </section>
  );
}

async function AuditTable({ rows }: { rows: AuditRow[] }) {
  const t = await getTranslations('admin.auditPage');
  const format = await getFormatter();
  if (rows.length === 0) return <p className="text-muted-foreground">{t('empty')}</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-xl text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="p-3 text-start font-medium">{t('when')}</th>
            <th className="p-3 text-start font-medium">{t('action')}</th>
            <th className="p-3 text-start font-medium">{t('actor')}</th>
            <th className="p-3 text-start font-medium">{t('venue')}</th>
            <th className="p-3 text-start font-medium">{t('entity')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="p-3 whitespace-nowrap">
                {format.dateTime(new Date(row.createdAt), {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td className="p-3 font-mono" dir="ltr">
                {row.action}
              </td>
              <td className="p-3 break-all" dir="ltr">
                {row.actor ?? '—'}
              </td>
              <td className="p-3" dir="auto">
                {row.restaurant ?? '—'}
              </td>
              <td className="p-3 font-mono break-all" dir="ltr">
                {row.entity}
                {row.entityId ? ` · ${row.entityId}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** `/admin/restaurants/[id]`: plan, overrides, AI usage and recent activity. */
export async function VenueScreen({ id }: { id: string }) {
  const claims = await getSessionClaims();
  const [venue, plans] = await Promise.all([venueDetail(claims, id), listPlans(claims)]);
  if (!venue) notFound();
  const t = await getTranslations('admin');
  const current = await locale();
  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin"
        className="inline-flex min-h-target items-center gap-1 text-sm font-medium text-brand-text"
      >
        <ChevronLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
        {t('venue.back')}
      </Link>
      <PageHeader
        title={venue.name}
        description={t(`statuses.${venue.status as 'active'}`)}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/${venue.slug}`}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('venue.open')}
              <ExternalLink aria-hidden="true" className="rtl:-scale-x-100" />
            </a>
            {claims?.platform_role === 'super_admin' ? (
              <StartImpersonationButton restaurantId={venue.id} />
            ) : null}
          </div>
        }
      />
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-xl font-title tracking-heading text-foreground">{t('venue.plan')}</h2>
        <PlanForm
          restaurantId={venue.id}
          current={venue.plan}
          plans={plans.map((plan) => ({
            code: plan.code,
            label:
              pickTranslation(plan.name as Record<string, string>, current, 'fr')?.text ??
              plan.code,
          }))}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-xl font-title tracking-heading text-foreground">
          {t('venue.overrides')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('venue.overridesHint')}</p>
        <OverridesEditor restaurantId={venue.id} overrides={venue.overrides} />
      </section>
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
        <h2 className="text-xl font-title tracking-heading text-foreground">
          {t('venue.aiTitle')}
        </h2>
        {venue.aiByMonth.length === 0 ? (
          <p className="text-muted-foreground">{t('venue.aiEmpty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2 text-start font-medium">{t('venue.month')}</th>
                <th className="p-2 text-end font-medium">{t('venue.imports')}</th>
                <th className="p-2 text-end font-medium">{t('venue.items')}</th>
                <th className="p-2 text-end font-medium">{t('venue.cost')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {venue.aiByMonth.map((row) => (
                <tr key={row.month}>
                  <td className="p-2" dir="ltr">
                    {row.month}
                  </td>
                  <td className="p-2 text-end">{row.imports}</td>
                  <td className="p-2 text-end">{row.items}</td>
                  <td className="p-2 text-end">{formatMoney(row.costMillimes, current)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-title tracking-heading text-foreground">
          {t('venue.activity')}
        </h2>
        <AuditTable rows={venue.audit} />
      </section>
    </div>
  );
}

/** `/admin/audit`: the global audit log, filterable by action prefix (read-only). */
export async function AuditScreen({ action }: { action: string }) {
  const claims = await getSessionClaims();
  const rows = await globalAudit(claims, action);
  const t = await getTranslations('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('audit')} />
      <form role="search" className="flex flex-wrap gap-2" action="/admin/audit">
        <Input
          name="action"
          defaultValue={action}
          aria-label={t('auditPage.filter')}
          placeholder={t('auditPage.filter')}
          className="max-w-sm"
          dir="ltr"
        />
        <button type="submit" className={buttonVariants({ variant: 'outline' })}>
          {t('auditPage.filterButton')}
        </button>
      </form>
      <AuditTable rows={rows} />
    </div>
  );
}
