import { BarChart3, Bell, QrCode, Users } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { withBackofficeAccess } from '@/features/backoffice';
import { analyticsOverview, type DailyPoint } from '../server/data';

/** `/dashboard/analytics` (A1): simple 30-day stats for the menu, drawn as inline SVG bars. */
export async function AnalyticsScreen() {
  const result = await withBackofficeAccess('dashboard.view', 'analytics', ({ scope }) =>
    analyticsOverview(scope.claims, scope.restaurantId),
  );
  const t = await getTranslations('analytics');
  if (!result.ok) {
    return <EmptyState icon={<BarChart3 />} title={t('forbidden')} className="bg-card py-16" />;
  }
  const { daily, totals } = result.data;
  const format = await getFormatter();
  const cards = [
    {
      key: 'menuViewsMonth',
      icon: QrCode,
      value: format.number(totals.menuViews.month),
      hint: t('weekHint', { count: format.number(totals.menuViews.week) }),
    },
    {
      key: 'serviceRequestsMonth',
      icon: Bell,
      value: format.number(totals.serviceRequests.month),
      hint: t('weekHint', { count: format.number(totals.serviceRequests.week) }),
    },
    {
      key: 'uniqueTablesMonth',
      icon: Users,
      value: format.number(totals.uniqueTables.month),
      hint: t('uniqueHint'),
    },
  ] as const;

  const hasData = daily.some((point) => point.menuViews > 0 || point.serviceRequests > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} description={t('description')} />

      <dl className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="flex flex-col gap-1 rounded-md border border-border bg-card p-5"
            >
              <dt className="flex items-center gap-2 text-xs font-semibold tracking-label text-muted-foreground uppercase">
                <Icon aria-hidden="true" className="size-4" />
                {card.key === 'menuViewsMonth'
                  ? t('cards.menuViewsMonth')
                  : card.key === 'serviceRequestsMonth'
                    ? t('cards.serviceRequestsMonth')
                    : t('cards.uniqueTablesMonth')}
              </dt>
              <dd className="flex flex-col gap-1">
                <span className="text-3xl font-semibold text-foreground tabular-nums">
                  {card.value}
                </span>
                <span className="text-xs text-muted-foreground">{card.hint}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      {hasData ? (
        <section
          aria-labelledby="daily"
          className="flex flex-col gap-4 rounded-md border border-border bg-card p-5"
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id="daily" className="text-lg font-semibold text-foreground">
                {t('daily.title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('daily.description')}</p>
            </div>
            <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-brand" aria-hidden="true" />
                {t('daily.legend.menu')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-xs bg-success" aria-hidden="true" />
                {t('daily.legend.service')}
              </li>
            </ul>
          </header>
          <DailyBars daily={daily} />
        </section>
      ) : (
        <EmptyState
          icon={<BarChart3 />}
          title={t('empty.title')}
          description={t('empty.description')}
          className="bg-card py-16"
        />
      )}
    </div>
  );
}

/** Pure-SVG bar chart: two series, one bar per day. Readable at 320 px and prints well. */
function DailyBars({ daily }: { daily: readonly DailyPoint[] }) {
  const max = Math.max(1, ...daily.map((point) => point.menuViews + point.serviceRequests));
  const height = 160;
  const barWidth = 100 / daily.length;
  return (
    <svg
      viewBox={`0 0 100 ${String(height + 20)}`}
      preserveAspectRatio="none"
      className="h-48 w-full"
      role="img"
      aria-label="30 day history"
    >
      {daily.map((point, index) => {
        const totalHeight = ((point.menuViews + point.serviceRequests) / max) * height;
        const serviceHeight = (point.serviceRequests / max) * height;
        const x = index * barWidth + barWidth * 0.1;
        const width = barWidth * 0.8;
        return (
          <g key={point.day}>
            <rect
              x={x}
              y={height - totalHeight}
              width={width}
              height={Math.max(0, totalHeight - serviceHeight)}
              className="fill-brand"
            />
            <rect
              x={x}
              y={height - serviceHeight}
              width={width}
              height={serviceHeight}
              className="fill-success"
            />
          </g>
        );
      })}
      {/* Baseline */}
      <line x1="0" y1={height} x2="100" y2={height} className="stroke-border" strokeWidth="0.3" />
    </svg>
  );
}
