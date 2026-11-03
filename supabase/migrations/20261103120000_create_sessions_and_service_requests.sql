-- P1-09 — Table and client sessions, service requests, idempotency, menu views, feedback,
-- notification receipts and incidents (ADR-0007, 0008, 0009, 0011, 0016).
-- Customers never touch these tables: public route handlers write through src/server/admin
-- after their own checks. Staff read under RLS; staff writes arrive with P1-12.
-- RLS coverage in supabase/tests/sessions_tenancy.test.sql.

create type public.table_session_status as enum ('open', 'bill_requested', 'closed');
create type public.service_request_kind as enum ('waiter', 'bill');
create type public.service_request_status as enum ('open', 'claimed', 'done', 'cancelled');
create type public.payment_method as enum ('cash', 'card');

-- ---------------------------------------------------------------------------
-- Sessions (ADR-0011): one open table session per table, one client session per phone.
-- ---------------------------------------------------------------------------

create table public.table_sessions (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid not null,
  -- Capability id of the s:{public_id} realtime topic (ADR-0008).
  public_id text not null unique default public.random_token(),
  status public.table_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  payment_method public.payment_method,
  version integer not null default 1,
  unique (restaurant_id, id),
  foreign key (restaurant_id, table_id) references public.tables (restaurant_id, id)
    on delete cascade,
  check ((status = 'closed') = (closed_at is not null))
);

create unique index table_sessions_one_open_key on public.table_sessions (table_id)
  where status <> 'closed';
create index table_sessions_activity_idx on public.table_sessions (status, last_activity_at);
create index table_sessions_restaurant_idx on public.table_sessions (restaurant_id, opened_at desc);

create trigger table_sessions_bump_version before update on public.table_sessions
  for each row execute function public.bump_version();

create table public.client_sessions (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_session_id uuid not null,
  -- Random per-phone id from a long-lived cookie (device blocking, ADR-0011 §8).
  device_id text not null check (device_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  blocked_until timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, table_session_id) references public.table_sessions (restaurant_id, id)
    on delete cascade
);

create index client_sessions_table_session_idx on public.client_sessions (restaurant_id, table_session_id);

-- ---------------------------------------------------------------------------
-- Service requests: "Call waiter", "Request bill" (spec 03, Basic).
-- ---------------------------------------------------------------------------

create table public.service_requests (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_session_id uuid not null,
  client_session_id uuid,
  kind public.service_request_kind not null,
  payment_method public.payment_method,
  status public.service_request_status not null default 'open',
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (restaurant_id, id),
  foreign key (restaurant_id, table_session_id) references public.table_sessions (restaurant_id, id)
    on delete cascade,
  foreign key (restaurant_id, client_session_id) references public.client_sessions (restaurant_id, id)
    on delete set null (client_session_id),
  check (kind = 'bill' or payment_method is null)
);

create index service_requests_open_idx on public.service_requests (restaurant_id, status, created_at);
create index service_requests_session_idx on public.service_requests (restaurant_id, table_session_id, kind, created_at desc);
create index service_requests_client_session_idx on public.service_requests (restaurant_id, client_session_id);

create trigger service_requests_set_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger service_requests_bump_version before update on public.service_requests
  for each row execute function public.bump_version();

-- ---------------------------------------------------------------------------
-- Idempotency (ADR-0016): a replayed key returns the stored response. Pruned after 24 h.
-- ---------------------------------------------------------------------------

create table public.idempotency_keys (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  scope text not null check (scope ~ '^[a-z_.]{3,40}$'),
  key text not null check (key ~ '^[A-Za-z0-9_-]{8,100}$'),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, scope, key)
);

create index idempotency_keys_created_idx on public.idempotency_keys (created_at);

-- ---------------------------------------------------------------------------
-- Menu views (stats) and feedback.
-- ---------------------------------------------------------------------------

create table public.menu_views (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid,
  viewed_at timestamptz not null default now(),
  foreign key (restaurant_id, table_id) references public.tables (restaurant_id, id)
    on delete set null (table_id)
);

create index menu_views_restaurant_idx on public.menu_views (restaurant_id, viewed_at);

create table public.menu_view_daily (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  day date not null,
  views integer not null check (views >= 0),
  table_views integer not null check (table_views between 0 and views),
  primary key (restaurant_id, day)
);

create table public.feedbacks (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_session_id uuid,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) between 1 and 500),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, table_session_id) references public.table_sessions (restaurant_id, id)
    on delete set null (table_session_id)
);

create index feedbacks_restaurant_idx on public.feedbacks (restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notification reliability (ADR-0007): receipt acks and incidents.
-- ---------------------------------------------------------------------------

create table public.notification_receipts (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  event_id uuid not null,
  event_kind text not null check (event_kind in ('request', 'order')),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null check (device_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  received_at timestamptz not null default now(),
  unique (event_id, user_id, device_id)
);

create index notification_receipts_restaurant_idx on public.notification_receipts (restaurant_id, received_at);

create table public.notification_incidents (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  event_id uuid not null,
  event_kind text not null check (event_kind in ('request', 'order')),
  kind text not null check (kind in ('unclaimed', 'no_ack')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (event_id, kind)
);

create index notification_incidents_restaurant_idx on public.notification_incidents (restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Realtime (ADR-0008): s:{table session public id} topics, and database-only publishing.
-- ---------------------------------------------------------------------------

create or replace function public.can_receive_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kind text := split_part(topic, ':', 1);
  restaurant uuid;
  channel text;
begin
  -- m:{restaurant public_id} — menu availability, readable by anyone holding the capability id.
  if kind = 'm' then
    return exists (
      select 1 from public.restaurants r
      where r.public_id = split_part(topic, ':', 2)
        and r.deleted_at is null
        and r.status <> 'suspended'
    );
  end if;

  -- s:{table session public_id} — the phones at that table hold the capability id.
  if kind = 's' then
    return exists (
      select 1 from public.table_sessions s where s.public_id = split_part(topic, ':', 2)
    );
  end if;

  -- r:{restaurant id}:{channel} — staff topics, never anonymous.
  if kind = 'r' and auth.role() = 'authenticated' then
    restaurant := public.try_uuid(split_part(topic, ':', 2));
    channel := split_part(topic, ':', 3);
    if restaurant is null then
      return false;
    end if;
    if channel = 'requests' then
      return public.is_member(restaurant);
    end if;
    if channel = 'orders' then
      return public.has_restaurant_role(
        restaurant, array['owner', 'manager', 'counter']::public.membership_role[]
      );
    end if;
  end if;

  return false;
end;
$$;

-- Staff alerts and the table's own topic, with minimal payloads (clients refetch details).
create or replace function public.broadcast_service_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_public_id text;
  table_number integer;
  payload jsonb;
begin
  select s.public_id, t.number into session_public_id, table_number
  from public.table_sessions s
  join public.tables t on t.restaurant_id = s.restaurant_id and t.id = s.table_id
  where s.restaurant_id = new.restaurant_id and s.id = new.table_session_id;

  payload := jsonb_build_object(
    'id', new.id, 'kind', new.kind, 'status', new.status, 'table_number', table_number,
    'payment_method', new.payment_method, 'version', new.version, 'created_at', new.created_at
  );

  if tg_op = 'INSERT' then
    perform public.broadcast('r:' || new.restaurant_id || ':requests', 'request.created', payload);
  elsif new.status is distinct from old.status then
    perform public.broadcast(
      'r:' || new.restaurant_id || ':requests',
      case new.status when 'claimed' then 'request.claimed' else 'request.done' end,
      payload
    );
    if new.status in ('claimed', 'done') then
      perform public.broadcast(
        's:' || session_public_id, 'request.handled',
        jsonb_build_object('id', new.id, 'kind', new.kind, 'status', new.status, 'version', new.version)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger service_requests_broadcast after insert or update of status on public.service_requests
  for each row execute function public.broadcast_service_request();

create or replace function public.broadcast_session_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.broadcast(
    's:' || new.public_id, 'session.closed', jsonb_build_object('version', new.version)
  );
  return new;
end;
$$;

create trigger table_sessions_broadcast_closed after update of status on public.table_sessions
  for each row when (new.status = 'closed' and old.status <> 'closed')
  execute function public.broadcast_session_closed();

create or replace function public.broadcast_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  menu_id text;
begin
  select r.public_id into menu_id from public.restaurants r where r.id = new.restaurant_id;
  perform public.broadcast(
    'm:' || menu_id,
    case tg_table_name when 'products' then 'product.availability_changed'
      else 'option.availability_changed' end,
    jsonb_build_object('id', new.id, 'is_available', new.is_available, 'version', new.version)
  );
  return new;
end;
$$;

create trigger products_broadcast_availability after update of is_available on public.products
  for each row when (old.is_available is distinct from new.is_available)
  execute function public.broadcast_availability();
create trigger options_broadcast_availability after update of is_available on public.options
  for each row when (old.is_available is distinct from new.is_available)
  execute function public.broadcast_availability();

revoke execute on function public.broadcast_service_request() from public, anon, authenticated;
revoke execute on function public.broadcast_session_closed() from public, anon, authenticated;
revoke execute on function public.broadcast_availability() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (ADR-0009): pure SQL, idempotent, also callable from tests.
-- ---------------------------------------------------------------------------

-- Closes table sessions idle for longer than the restaurant's timeout (default 90 min,
-- restaurants.settings.session_timeout_minutes, 30–240). Returns the number closed.
create or replace function public.close_idle_table_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed integer;
begin
  update public.table_sessions s
  set status = 'closed', closed_at = now()
  from public.restaurants r
  where r.id = s.restaurant_id
    and s.status <> 'closed'
    and s.last_activity_at < now() - make_interval(mins => least(240, greatest(30,
      coalesce((r.settings ->> 'session_timeout_minutes')::integer, 90))));
  get diagnostics closed = row_count;
  return closed;
end;
$$;

-- Daily view counts for today and yesterday (re-runnable), then raw views older than 7 days go.
create or replace function public.aggregate_menu_views()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.menu_view_daily (restaurant_id, day, views, table_views)
  select restaurant_id, (viewed_at at time zone 'Africa/Tunis')::date, count(*),
    count(*) filter (where table_id is not null)
  from public.menu_views
  where viewed_at >= (now() at time zone 'Africa/Tunis')::date - 1
  group by 1, 2
  on conflict (restaurant_id, day)
    do update set views = excluded.views, table_views = excluded.table_views;
  delete from public.menu_views where viewed_at < now() - interval '7 days';
$$;

create or replace function public.purge_idempotency_keys()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.idempotency_keys where created_at < now() - interval '24 hours';
$$;

revoke execute on function public.close_idle_table_sessions() from public, anon, authenticated;
revoke execute on function public.aggregate_menu_views() from public, anon, authenticated;
revoke execute on function public.purge_idempotency_keys() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('close-idle-table-sessions', '* * * * *',
  'select public.close_idle_table_sessions()');
select cron.schedule('aggregate-menu-views', '7 * * * *', 'select public.aggregate_menu_views()');
select cron.schedule('purge-idempotency-keys', '23 * * * *', 'select public.purge_idempotency_keys()');

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on
  public.table_sessions, public.client_sessions, public.service_requests,
  public.idempotency_keys, public.menu_views, public.menu_view_daily, public.feedbacks,
  public.notification_receipts, public.notification_incidents
from anon;
revoke insert, update, delete on
  public.table_sessions, public.client_sessions, public.service_requests,
  public.idempotency_keys, public.menu_views, public.menu_view_daily, public.feedbacks,
  public.notification_receipts, public.notification_incidents
from authenticated;
revoke select on public.idempotency_keys, public.client_sessions from authenticated;

alter table public.table_sessions enable row level security;
alter table public.client_sessions enable row level security;
alter table public.service_requests enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.menu_views enable row level security;
alter table public.menu_view_daily enable row level security;
alter table public.feedbacks enable row level security;
alter table public.notification_receipts enable row level security;
alter table public.notification_incidents enable row level security;

-- Staff on the floor see their restaurant's live tables and requests.
create policy "table_sessions: members read" on public.table_sessions
  for select to authenticated using ((select public.is_member(restaurant_id)));
create policy "service_requests: members read" on public.service_requests
  for select to authenticated using ((select public.is_member(restaurant_id)));
create policy "notification_receipts: members read" on public.notification_receipts
  for select to authenticated using ((select public.is_member(restaurant_id)));

-- Owners and managers see statistics, feedback and incidents.
create policy "menu_views: managers read" on public.menu_views
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "menu_view_daily: managers read" on public.menu_view_daily
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "feedbacks: managers read" on public.feedbacks
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "notification_incidents: managers read" on public.notification_incidents
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );

-- Platform staff read everything for support.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'table_sessions', 'service_requests', 'menu_views', 'menu_view_daily', 'feedbacks',
    'notification_receipts', 'notification_incidents'
  ] loop
    execute format(
      'create policy "%1$s: platform read" on public.%1$I for select to authenticated
         using ((select public.is_platform_admin()))', table_name);
  end loop;
end;
$$;
