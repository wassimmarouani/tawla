-- P1-11 — Paired staff devices, pairing codes, staff sessions, push subscriptions and staff
-- invitations (ADR-0010, ADR-0022, spec 03, spec 04 "Staff and devices").
-- Clients only read under RLS. Every write goes through src/server/admin after explicit
-- permission checks (pairing is done by an anonymous device; tokens and codes are hashes).
-- RLS coverage in supabase/tests/staff_devices_tenancy.test.sql.

create type public.device_mode as enum ('fixed', 'mobile');

-- /invite/accept is an app route (staff invitations): never a restaurant slug.
insert into public.reserved_slugs (slug) values ('invite') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Devices (ADR-0010 §3): the device cookie holds a 256-bit token, stored here as SHA-256.
-- ---------------------------------------------------------------------------

create table public.staff_devices (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  mode public.device_mode not null default 'mobile',
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  unique (restaurant_id, id)
);

create index staff_devices_restaurant_idx on public.staff_devices (restaurant_id, created_at desc);

-- 8-character codes shown in the back-office (and in a QR), valid 10 minutes, single use.
create table public.device_pairing_codes (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 1 and 40),
  mode public.device_mode not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  device_id uuid,
  unique (restaurant_id, id),
  foreign key (restaurant_id, device_id) references public.staff_devices (restaurant_id, id)
    on delete set null (device_id),
  check (expires_at > created_at)
);

-- A code is looked up by its hash among unused ones; collisions between live codes are refused.
create unique index device_pairing_codes_live_key on public.device_pairing_codes (code_hash)
  where used_at is null;
create index device_pairing_codes_expiry_idx on public.device_pairing_codes (expires_at);

-- ---------------------------------------------------------------------------
-- Staff sessions (ADR-0010 §4, §6): one row per login on a paired device.
-- ---------------------------------------------------------------------------

create table public.staff_sessions (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  membership_id uuid not null,
  device_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- auth.sessions id from the JWT `session_id` claim: deleted on remote logout.
  auth_session_id uuid,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_by uuid references auth.users (id) on delete set null,
  unique (restaurant_id, id),
  foreign key (restaurant_id, membership_id) references public.memberships (restaurant_id, id)
    on delete cascade,
  foreign key (restaurant_id, device_id) references public.staff_devices (restaurant_id, id)
    on delete cascade,
  check (expires_at > started_at)
);

create index staff_sessions_active_idx on public.staff_sessions (restaurant_id, ended_at, expires_at);
create index staff_sessions_device_idx on public.staff_sessions (device_id) where ended_at is null;
create index staff_sessions_user_idx on public.staff_sessions (user_id);

-- ---------------------------------------------------------------------------
-- Web Push subscriptions (ADR-0022 §3): deleted when the push service answers 404/410.
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  membership_id uuid not null,
  device_id uuid,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 16 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, membership_id) references public.memberships (restaurant_id, id)
    on delete cascade,
  foreign key (restaurant_id, device_id) references public.staff_devices (restaurant_id, id)
    on delete cascade
);

create index push_subscriptions_membership_idx on public.push_subscriptions (restaurant_id, membership_id);

-- ---------------------------------------------------------------------------
-- Staff invitations by email (spec 04): accepted once, within 7 days.
-- ---------------------------------------------------------------------------

create table public.staff_invitations (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  role public.membership_role not null check (role <> 'owner'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  unique (restaurant_id, id)
);

create unique index staff_invitations_pending_key on public.staff_invitations (restaurant_id, email)
  where accepted_at is null and revoked_at is null;
create index staff_invitations_email_idx on public.staff_invitations (email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Housekeeping (ADR-0009): expired pairing codes and long-ended sessions.
-- ---------------------------------------------------------------------------

create or replace function public.purge_staff_access()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
  more integer;
begin
  delete from public.device_pairing_codes where expires_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  delete from public.staff_sessions
  where coalesce(ended_at, expires_at) < now() - interval '90 days';
  get diagnostics more = row_count;
  return removed + more;
end;
$$;

revoke execute on function public.purge_staff_access() from public, anon, authenticated;

select cron.schedule('purge-staff-access', '40 3 * * *', 'select public.purge_staff_access()');

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security: owners and managers read their restaurant's rows,
-- a member reads their own sessions and subscriptions. No client writes.
-- ---------------------------------------------------------------------------

revoke all on public.staff_devices, public.device_pairing_codes, public.staff_sessions,
  public.push_subscriptions, public.staff_invitations from anon;
revoke insert, update, delete on public.staff_devices, public.device_pairing_codes,
  public.staff_sessions, public.push_subscriptions, public.staff_invitations from authenticated;
-- Hashes never leave the server.
revoke select on public.staff_devices, public.device_pairing_codes from authenticated;
grant select (id, restaurant_id, label, mode, created_by, created_at, last_seen_at, revoked_at,
  revoked_by) on public.staff_devices to authenticated;
grant select (id, restaurant_id, label, mode, created_by, created_at, expires_at, used_at,
  device_id) on public.device_pairing_codes to authenticated;

alter table public.staff_devices enable row level security;
alter table public.device_pairing_codes enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.staff_invitations enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'staff_devices', 'device_pairing_codes', 'staff_sessions', 'push_subscriptions',
    'staff_invitations'
  ] loop
    execute format(
      'create policy "%1$s: managers read" on public.%1$I for select to authenticated
         using ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', table_name);
    execute format(
      'create policy "%1$s: platform read" on public.%1$I for select to authenticated
         using ((select public.is_platform_admin()))', table_name);
  end loop;
end;
$$;

create policy "staff_sessions: own read" on public.staff_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_subscriptions: own read" on public.push_subscriptions for select
  to authenticated using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_id and m.restaurant_id = push_subscriptions.restaurant_id
        and m.user_id = (select auth.uid())
    )
  );
