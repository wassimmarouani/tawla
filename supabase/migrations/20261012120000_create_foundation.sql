-- P0-03 — Foundation schema: tenancy, identity, plans, audit (ADR-0003, 0004, 0005, 0010, 0023).
-- Every table has RLS enabled and is covered by pgTAP tests in supabase/tests (pnpm check:rls).

-- ---------------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------------

-- RFC 9562 UUIDv7 (time-ordered). Postgres 17 has no native uuidv7() (ADR-0023).
create or replace function public.uuid_v7()
returns uuid
language plpgsql
volatile
parallel safe
set search_path = ''
as $$
declare
  unix_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  bytes bytea := uuid_send(gen_random_uuid());
begin
  bytes := overlay(bytes placing substring(int8send(unix_ms) from 3) from 1 for 6);
  bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112); -- version 7
  bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128); -- RFC 4122 variant
  return encode(bytes, 'hex')::uuid;
end;
$$;

-- 128-bit random token, base64url (22 chars). Used for QR tokens and realtime capability ids.
create or replace function public.random_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.platform_role as enum ('none', 'super_admin', 'support');
create type public.membership_role as enum ('owner', 'manager', 'counter', 'waiter', 'station');
create type public.restaurant_type as enum ('cafe', 'restaurant', 'tea_room', 'pastry', 'fast_food');
create type public.restaurant_status as enum ('active', 'read_only', 'suspended');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'suspended', 'cancelled');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  platform_role public.platform_role not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every auth user gets a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(left(new.raw_user_meta_data ->> 'full_name', 120), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'fr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default public.uuid_v7(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- Mirrors src/lib/tenancy/reserved-slugs.ts (kept in sync by a Vitest check).
create table public.reserved_slugs (
  slug text primary key
);

insert into public.reserved_slugs (slug) values
  ('pricing'), ('legal'),
  ('t'), ('r'), ('login'), ('signup'), ('reset'), ('dashboard'), ('staff'), ('admin'), ('dev'),
  ('api'), ('_next'), ('_vercel'),
  ('fr'), ('ar'), ('en'),
  ('app'), ('p'), ('help'), ('support'), ('status'), ('www'), ('mail'), ('static'), ('assets'),
  ('blog'), ('docs'), ('about'), ('contact'), ('terms'), ('privacy'), ('taply'), ('menu'),
  ('ingest'), ('health'), ('robots'), ('sitemap'), ('favicon'), ('manifest'), ('sw');

create table public.restaurants (
  id uuid primary key default public.uuid_v7(),
  organization_id uuid not null references public.organizations (id),
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  -- Capability id for public realtime topics (ADR-0008): unguessable, never the primary key.
  public_id text not null unique default public.random_token(),
  name text not null check (char_length(name) between 1 and 120),
  type public.restaurant_type not null default 'cafe',
  timezone text not null default 'Africa/Tunis',
  currency text not null default 'TND' check (currency = 'TND'),
  locales text[] not null default array['fr', 'ar', 'en']
    check (cardinality(locales) between 1 and 3 and locales <@ array['fr', 'ar', 'en']),
  default_locale text not null default 'fr',
  opening_schedule jsonb not null default '{"weekly": [], "exceptions": []}'::jsonb
    check (jsonb_typeof(opening_schedule) = 'object'),
  manual_status text not null default 'auto' check (manual_status in ('auto', 'open', 'closed')),
  manual_status_until timestamptz,
  day_cutoff interval not null default interval '05:00'
    check (day_cutoff >= interval '0' and day_cutoff < interval '24 hours'),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  status public.restaurant_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint restaurants_default_locale_enabled check (default_locale = any (locales))
);

create unique index restaurants_slug_key on public.restaurants (slug) where deleted_at is null;
create index restaurants_organization_id_idx on public.restaurants (organization_id);

create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

create or replace function public.reject_reserved_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.reserved_slugs where slug = new.slug) then
    raise exception 'slug "%" is reserved', new.slug using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger restaurants_reject_reserved_slug before insert or update of slug on public.restaurants
  for each row execute function public.reject_reserved_slug();

create table public.slug_redirects (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  old_slug text not null unique,
  created_at timestamptz not null default now()
);

create index slug_redirects_restaurant_id_idx on public.slug_redirects (restaurant_id);

create table public.memberships (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null,
  display_name text check (char_length(display_name) <= 60),
  -- HMAC-SHA256(pepper, membership id || PIN), hex (ADR-0010). Never readable by clients.
  pin_hmac text check (pin_hmac ~ '^[0-9a-f]{64}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id),
  -- Target of composite foreign keys from tenant child tables (ADR-0004).
  unique (restaurant_id, id)
);

create index memberships_user_id_idx on public.memberships (user_id);

create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Plans, subscriptions, flags (ADR-0015, ADR-0025)
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default public.uuid_v7(),
  code text not null unique check (code ~ '^[a-z_]{2,32}$'),
  name jsonb not null check (jsonb_typeof(name) = 'object'),
  price_monthly integer not null check (price_monthly >= 0),
  price_yearly integer not null check (price_yearly >= 0),
  features text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  ai_monthly_cap_millimes integer not null default 0 check (ai_monthly_cap_millimes >= 0),
  ai_limits jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_limits) = 'object'),
  sort_order smallint not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Hypothesis prices (millimes) from spec 00, to validate with 10–15 managers.
insert into public.plans (code, name, price_monthly, price_yearly, features, limits, ai_monthly_cap_millimes, ai_limits, sort_order) values
  (
    'basic',
    '{"fr": "Basic", "ar": "أساسي", "en": "Basic"}',
    39000, 390000,
    array['menu', 'branding', 'multilingual', 'service_requests', 'availability_toggle', 'ai_import', 'ai_translate', 'powered_by_badge'],
    '{"staff": 1, "tables": 40, "products": 300}',
    3000,
    '{"photo_imports": 3, "translated_items": 300}',
    1
  ),
  (
    'pro',
    '{"fr": "Pro", "ar": "احترافي", "en": "Pro"}',
    99000, 990000,
    array['menu', 'branding', 'multilingual', 'service_requests', 'availability_toggle', 'ai_import', 'ai_translate', 'ordering', 'order_tracking', 'staff_zones', 'staff_pin', 'stats_sales', 'ai_descriptions'],
    '{"staff": 10, "tables": 100, "products": 1000}',
    10000,
    '{"photo_imports": 10, "translated_items": 2000}',
    2
  ),
  (
    'premium',
    '{"fr": "Premium", "ar": "مميز", "en": "Premium"}',
    199000, 1990000,
    array['menu', 'branding', 'multilingual', 'service_requests', 'availability_toggle', 'ai_import', 'ai_translate', 'ordering', 'order_tracking', 'staff_zones', 'staff_pin', 'stats_sales', 'stats_advanced', 'ai_descriptions', 'ai_insights', 'kitchen_display', 'promotions', 'printing', 'multi_site'],
    '{"staff": null, "tables": null, "products": null}',
    30000,
    '{"photo_imports": 30, "translated_items": 10000}',
    3
  );

create table public.subscriptions (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null unique references public.restaurants (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_plan_id_idx on public.subscriptions (plan_id);

create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.feature_overrides (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z_]{2,40}$'),
  enabled boolean not null,
  expires_at timestamptz,
  reason text check (char_length(reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, feature_key)
);

create index feature_overrides_created_by_idx on public.feature_overrides (created_by);

-- ---------------------------------------------------------------------------
-- Audit (append-only)
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid references public.restaurants (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  impersonated_by uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  entity text not null,
  entity_id text,
  diff jsonb,
  ip inet,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_restaurant_created_idx on public.audit_logs (restaurant_id, created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_impersonated_by_idx on public.audit_logs (impersonated_by);

-- ---------------------------------------------------------------------------
-- JWT claims (ADR-0010): custom access token hook + helpers used by RLS
-- ---------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  memberships jsonb;
  role_name text;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object('restaurant_id', m.restaurant_id, 'role', m.role) order by m.created_at),
    '[]'::jsonb
  )
  into memberships
  from public.memberships m
  join public.restaurants r on r.id = m.restaurant_id
  where m.user_id = uid
    and m.is_active
    and r.deleted_at is null;

  select p.platform_role::text into role_name from public.profiles p where p.id = uid;

  claims := jsonb_set(claims, '{memberships}', memberships);
  claims := jsonb_set(claims, '{platform_role}', to_jsonb(coalesce(role_name, 'none')));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Restaurant roles of the current request, from the JWT (no table lookup per row).
create or replace function public.has_restaurant_role(target uuid, roles public.membership_role[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'memberships', '[]'::jsonb)) as m
    where (m ->> 'restaurant_id')::uuid = target
      and (m ->> 'role')::public.membership_role = any (roles)
  );
$$;

create or replace function public.is_member(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.has_restaurant_role(target, enum_range(null::public.membership_role));
$$;

-- Platform roles only apply with a TOTP-verified session (ADR-0005).
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'platform_role', 'none') in ('super_admin', 'support')
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'platform_role', 'none') = 'super_admin'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- ---------------------------------------------------------------------------
-- Privileges: anon gets nothing here; authenticated gets only what policies allow.
-- ---------------------------------------------------------------------------

revoke all on
  public.profiles, public.organizations, public.reserved_slugs, public.restaurants,
  public.slug_redirects, public.memberships, public.plans, public.subscriptions,
  public.feature_overrides, public.audit_logs
from anon;

-- Column-level write privileges (CLAUDE.md rule 10: DB is the last line of defence).
revoke update on public.profiles from authenticated;
grant update (full_name, phone, locale) on public.profiles to authenticated;

revoke update on public.restaurants from authenticated;
grant update (
  name, type, timezone, locales, default_locale, opening_schedule, manual_status,
  manual_status_until, day_cutoff, theme, settings
) on public.restaurants to authenticated;

-- pin_hmac is never readable or writable by clients (server module only).
revoke select, insert, update on public.memberships from authenticated;
grant select (id, restaurant_id, user_id, role, display_name, is_active, created_at, updated_at)
  on public.memberships to authenticated;
grant insert (restaurant_id, user_id, role, display_name) on public.memberships to authenticated;
grant update (role, display_name, is_active) on public.memberships to authenticated;

-- Append-only audit log: no one edits history, not even the server.
revoke update, delete, truncate on public.audit_logs from authenticated, service_role;
revoke insert on public.audit_logs from authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.reserved_slugs enable row level security;
alter table public.restaurants enable row level security;
alter table public.slug_redirects enable row level security;
alter table public.memberships enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.feature_overrides enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: platform read" on public.profiles
  for select to authenticated using ((select public.is_platform_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- organizations
create policy "organizations: members read" on public.organizations
  for select to authenticated using (
    exists (
      select 1 from public.restaurants r
      where r.organization_id = organizations.id
        and (select public.is_member(r.id))
    )
  );
create policy "organizations: platform read" on public.organizations
  for select to authenticated using ((select public.is_platform_admin()));

-- reserved slugs: readable by signed-in users (slug availability hints)
create policy "reserved_slugs: read" on public.reserved_slugs
  for select to authenticated using (true);

-- restaurants
create policy "restaurants: members read" on public.restaurants
  for select to authenticated using ((select public.is_member(id)));
create policy "restaurants: platform read" on public.restaurants
  for select to authenticated using ((select public.is_platform_admin()));
create policy "restaurants: managers update" on public.restaurants
  for update to authenticated
  using ((select public.has_restaurant_role(id, array['owner', 'manager']::public.membership_role[])))
  with check ((select public.has_restaurant_role(id, array['owner', 'manager']::public.membership_role[])));

-- slug redirects
create policy "slug_redirects: members read" on public.slug_redirects
  for select to authenticated using ((select public.is_member(restaurant_id)));

-- memberships
create policy "memberships: read own" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy "memberships: managers read team" on public.memberships
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "memberships: platform read" on public.memberships
  for select to authenticated using ((select public.is_platform_admin()));
-- Managers manage staff; only owners create or edit owner memberships (ADR-0005).
create policy "memberships: managers insert" on public.memberships
  for insert to authenticated with check (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
    and (role <> 'owner' or (select public.has_restaurant_role(restaurant_id, array['owner']::public.membership_role[])))
  );
create policy "memberships: managers update" on public.memberships
  for update to authenticated
  using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
    and (role <> 'owner' or (select public.has_restaurant_role(restaurant_id, array['owner']::public.membership_role[])))
  )
  with check (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
    and (role <> 'owner' or (select public.has_restaurant_role(restaurant_id, array['owner']::public.membership_role[])))
  );

-- plans: public catalogue for signed-in users; writes by super admin only
create policy "plans: read public" on public.plans
  for select to authenticated using (is_public or (select public.is_platform_admin()));
create policy "plans: super admin write" on public.plans
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- subscriptions: owners and managers see theirs; super admin writes
create policy "subscriptions: managers read" on public.subscriptions
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "subscriptions: platform read" on public.subscriptions
  for select to authenticated using ((select public.is_platform_admin()));
create policy "subscriptions: super admin write" on public.subscriptions
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- feature overrides
create policy "feature_overrides: members read" on public.feature_overrides
  for select to authenticated using ((select public.is_member(restaurant_id)));
create policy "feature_overrides: platform read" on public.feature_overrides
  for select to authenticated using ((select public.is_platform_admin()));
create policy "feature_overrides: super admin write" on public.feature_overrides
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- audit logs: read-only for owners/managers of the restaurant and platform admins
create policy "audit_logs: managers read" on public.audit_logs
  for select to authenticated using (
    restaurant_id is not null
    and (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "audit_logs: platform read" on public.audit_logs
  for select to authenticated using ((select public.is_platform_admin()));
