# ADR-0009 — Scheduled jobs with Supabase Cron (pg_cron) and pg_net

- Status: Accepted
- Date: 2026-10-11
- Audit refs: D1

## Context

Vercel functions are serverless, so nothing in the app tier runs timers. Features that need scheduled work:

- order escalation (2 min);
- missing-ack detection (15 s);
- auto-closing inactive table sessions;
- nightly `menu_views` aggregation;
- billing reminders (J-7, J-1, J+3, J+7);
- purging expired push subscriptions and old receipts;
- data deletion 90 days after cancellation.

Supabase Cron accepts schedules of 1–59 seconds. pg_net sends asynchronous HTTP requests after commit.

## Decision

1. **Pure SQL jobs** run directly in pg_cron:
   - auto-close sessions;
   - aggregate `menu_views` into `menu_view_daily`;
   - purge old receipts and events;
   - mark subscriptions past due.
2. **Jobs that need app code** (Web Push, email) call a secured route with `net.http_post`:
   - `POST /api/cron/{job}` with `Authorization: Bearer <CRON_SECRET>`;
   - the secret is stored in Supabase Vault and compared in constant time.

   Route handlers live in `src/app/api/cron/` and call `src/server/admin/`.

3. **Escalation and missing-ack checks** run every **15 seconds** and are idempotent: `notification_incidents` has a unique key on `(event_id, kind)`.
4. Each job is a pure TS decision service (unit-tested) plus an integration test that triggers the route.
5. **Local development:** the `cron.schedule` calls live in migrations. The callback base URL comes from a DB setting (`app.settings.cron_base_url`), set to `http://host.docker.internal:3000` locally.

## Consequences

- One scheduler, versioned in migrations, observable through `cron.job_run_details`.
- 15 s granularity is enough: escalation thresholds are minutes, and the ack window is 15 s.

## Sources

- https://supabase.com/docs/guides/cron/quickstart
- https://supabase.com/docs/guides/database/extensions/pg_net
