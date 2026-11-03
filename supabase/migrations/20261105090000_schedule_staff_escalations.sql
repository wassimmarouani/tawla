-- P1-12 — Escalation of unanswered service requests and receipt pruning (ADR-0007, ADR-0009).
-- Escalation needs app code (Web Push), so pg_cron calls POST /api/cron/escalations through
-- pg_net every 15 seconds. The base URL comes from the `app.settings.cron_base_url` database
-- setting and the bearer secret from Vault (`cron_secret`); without either, the call is skipped
-- (local runs and CI call the route directly in tests).

create extension if not exists pg_net with schema extensions;

create or replace function public.call_app_job(job text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text := nullif(current_setting('app.settings.cron_base_url', true), '');
  secret text;
begin
  if job !~ '^[a-z][a-z-]{1,40}$' then
    raise exception 'invalid job name' using errcode = 'invalid_parameter_value';
  end if;
  if base_url is null then
    return null;
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if secret is null then
    return null;
  end if;
  return net.http_post(
    url := base_url || '/api/cron/' || job,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke execute on function public.call_app_job(text) from public, anon, authenticated;

-- Acks older than 30 days are only needed as aggregates (ADR-0007 consequences).
create or replace function public.purge_notification_receipts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.notification_receipts where received_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.purge_notification_receipts() from public, anon, authenticated;

select cron.schedule('staff-escalations', '15 seconds', 'select public.call_app_job(''escalations'')');
select cron.schedule('purge-notification-receipts', '50 3 * * *',
  'select public.purge_notification_receipts()');
