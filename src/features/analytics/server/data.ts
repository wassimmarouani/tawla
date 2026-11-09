import 'server-only';
import { sql } from 'drizzle-orm';
import type { SessionClaims } from '@/lib/auth/claims';
import { withRls } from '@/lib/db/rls';

/** A single day in the venue timezone (Africa/Tunis), with its menu-view and service counts. */
export interface DailyPoint {
  /** ISO date, e.g. "2026-11-08". */
  day: string;
  menuViews: number;
  serviceRequests: number;
}

export interface AnalyticsOverview {
  /** Trailing 30 days, oldest first. Each day present even if 0. */
  daily: DailyPoint[];
  totals: {
    menuViews: { month: number; week: number };
    serviceRequests: { month: number; week: number };
    uniqueTables: { month: number };
  };
}

/** Last 30 days of menu scans and service requests, bucketed by day in Africa/Tunis. */
export async function analyticsOverview(
  claims: SessionClaims,
  restaurantId: string,
): Promise<AnalyticsOverview> {
  return withRls(claims, async (tx) => {
    const monthStart = sql`(now() - interval '30 days')`;
    const weekStart = sql`(now() - interval '7 days')`;

    const [daily, totals] = await Promise.all([
      tx.execute<{ day: string; menu_views: number; service_requests: number }>(sql`
        with days as (
          select generate_series(
            (date_trunc('day', now() at time zone 'Africa/Tunis') - interval '29 days')::date,
            (date_trunc('day', now() at time zone 'Africa/Tunis'))::date,
            interval '1 day'
          )::date as day
        ),
        views as (
          select (viewed_at at time zone 'Africa/Tunis')::date as day, count(*)::int as c
          from public.menu_views
          where restaurant_id = ${restaurantId} and viewed_at >= ${monthStart}
          group by 1
        ),
        reqs as (
          select (created_at at time zone 'Africa/Tunis')::date as day, count(*)::int as c
          from public.service_requests
          where restaurant_id = ${restaurantId} and created_at >= ${monthStart}
          group by 1
        )
        select to_char(d.day, 'YYYY-MM-DD') as day,
          coalesce(v.c, 0)::int as menu_views,
          coalesce(r.c, 0)::int as service_requests
        from days d
        left join views v on v.day = d.day
        left join reqs r on r.day = d.day
        order by d.day
      `),
      tx.execute<{
        views_month: number;
        views_week: number;
        requests_month: number;
        requests_week: number;
        tables_month: number;
      }>(sql`
        select
          (select count(*)::int from public.menu_views
            where restaurant_id = ${restaurantId} and viewed_at >= ${monthStart}) as views_month,
          (select count(*)::int from public.menu_views
            where restaurant_id = ${restaurantId} and viewed_at >= ${weekStart}) as views_week,
          (select count(*)::int from public.service_requests
            where restaurant_id = ${restaurantId} and created_at >= ${monthStart}) as requests_month,
          (select count(*)::int from public.service_requests
            where restaurant_id = ${restaurantId} and created_at >= ${weekStart}) as requests_week,
          (select count(distinct table_id)::int from public.menu_views
            where restaurant_id = ${restaurantId} and table_id is not null
            and viewed_at >= ${monthStart}) as tables_month
      `),
    ]);
    const first = totals[0];
    return {
      daily: daily.map((row) => ({
        day: row.day,
        menuViews: row.menu_views,
        serviceRequests: row.service_requests,
      })),
      totals: {
        menuViews: { month: first?.views_month ?? 0, week: first?.views_week ?? 0 },
        serviceRequests: {
          month: first?.requests_month ?? 0,
          week: first?.requests_week ?? 0,
        },
        uniqueTables: { month: first?.tables_month ?? 0 },
      },
    };
  });
}
