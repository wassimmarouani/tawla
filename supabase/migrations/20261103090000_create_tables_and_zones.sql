-- P1-08 — Tables, zones and QR tokens (ADR-0011, ADR-0012, ADR-0019, spec 04).
-- A table's QR encodes /t/{token}: 128 random bits, globally unique, never the table number.
-- Clients cannot choose or change tokens: a trigger assigns them on insert, the column is not
-- updatable, regeneration goes through public.regenerate_table_token() (audited). RLS coverage in supabase/tests/tables_tenancy.test.sql.

create table public.zones (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name jsonb not null check (public.is_i18n_text(name, 60, true)),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id)
);

create index zones_restaurant_sort_idx on public.zones (restaurant_id, sort_order);

create trigger zones_set_updated_at before update on public.zones
  for each row execute function public.set_updated_at();

create table public.tables (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  zone_id uuid,
  number integer not null check (number between 1 and 999),
  -- Optional name shown with the number ("Terrasse 3", "Bar").
  label text check (char_length(label) between 1 and 40),
  token text not null unique default public.random_token()
    check (token ~ '^[A-Za-z0-9_-]{22}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, zone_id) references public.zones (restaurant_id, id)
    on delete set null (zone_id)
);

-- A number is unique among a restaurant's live tables; deleted numbers can be reused.
create unique index tables_number_key on public.tables (restaurant_id, number)
  where deleted_at is null;
create index tables_zone_idx on public.tables (restaurant_id, zone_id);

create trigger tables_set_updated_at before update on public.tables
  for each row execute function public.set_updated_at();

-- Tokens always come from the server: whatever a client sends is replaced on insert.
create or replace function public.assign_table_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.token := public.random_token();
  return new;
end;
$$;

create trigger tables_assign_token before insert on public.tables
  for each row execute function public.assign_table_token();

-- ---------------------------------------------------------------------------
-- Token regeneration (spec 04): the old QR stops working at once; audited.
-- ---------------------------------------------------------------------------

create or replace function public.regenerate_table_token(p_table_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_restaurant uuid;
  next_token text;
begin
  update public.tables
  set token = public.random_token()
  where id = p_table_id
    and deleted_at is null
    and public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[])
  returning restaurant_id, token into target_restaurant, next_token;
  if next_token is null then
    raise exception 'table not found' using errcode = 'no_data_found';
  end if;
  insert into public.audit_logs (restaurant_id, actor_id, action, entity, entity_id)
  values (target_restaurant, auth.uid(), 'table.regenerate_token', 'table', p_table_id::text);
  return next_token;
end;
$$;

revoke execute on function public.regenerate_table_token(uuid) from public, anon;
grant execute on function public.regenerate_table_token(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Public read (ADR-0012): a QR token resolves to its restaurant and table, nothing else.
-- ---------------------------------------------------------------------------

create or replace function public.get_table(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'restaurant_slug', r.slug,
    'number', t.number,
    'label', t.label
  )
  from public.tables t
  join public.restaurants r on r.id = t.restaurant_id
  where t.token = p_token
    and t.deleted_at is null
    and t.is_active
    and r.deleted_at is null
    and r.status in ('active', 'read_only');
$$;

revoke execute on function public.get_table(text) from public;
grant execute on function public.get_table(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: tokens are never written by clients.
-- ---------------------------------------------------------------------------

revoke all on public.zones, public.tables from anon;
revoke update on public.tables from authenticated;
grant update (zone_id, number, label, is_active, deleted_at) on public.tables to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: members read, owners and managers write, platform admins read.
-- ---------------------------------------------------------------------------

alter table public.zones enable row level security;
alter table public.tables enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['zones', 'tables'] loop
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using ((select public.is_member(restaurant_id)))', table_name);
    execute format(
      'create policy "%1$s: platform read" on public.%1$I for select to authenticated
         using ((select public.is_platform_admin()))', table_name);
    execute format(
      'create policy "%1$s: managers insert" on public.%1$I for insert to authenticated
         with check ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', table_name);
    execute format(
      'create policy "%1$s: managers update" on public.%1$I for update to authenticated
         using ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))
         with check ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', table_name);
    execute format(
      'create policy "%1$s: managers delete" on public.%1$I for delete to authenticated
         using ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', table_name);
  end loop;
end;
$$;
