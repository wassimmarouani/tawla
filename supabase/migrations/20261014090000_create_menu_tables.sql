-- P1-01 — Menu schema (ADR-0004, 0014, 0018, 0026): media, categories, products, option groups,
-- options, product links with overrides, price history, translation glossary, public menu read.
-- Every table: restaurant_id not null (except platform glossary rows), composite FKs, RLS,
-- pgTAP coverage in supabase/tests/menu_*.test.sql.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Multilingual text (ADR-0026): {"fr": "...", "ar": "...", "en": "..."}, known keys only,
-- string values up to max_length; `required` demands at least one non-blank value.
create or replace function public.is_i18n_text(value jsonb, max_length integer, required boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1 from jsonb_each(value) as entry
      where entry.key not in ('fr', 'ar', 'en')
         or jsonb_typeof(entry.value) <> 'string'
         or char_length(entry.value #>> '{}') > max_length
    )
    and (not required or exists (
      select 1 from jsonb_each_text(value) as entry where btrim(entry.value) <> ''
    ));
$$;

-- Picks a translation: requested locale → restaurant default → first non-blank (fr, ar, en).
-- Returns {"text", "lang"} so the UI can set `lang` on fallback text, or null when empty.
create or replace function public.i18n_pick(value jsonb, locale text, fallback text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('text', value ->> candidate.lang, 'lang', candidate.lang)
  from (values (1, locale), (2, fallback), (3, 'fr'), (4, 'ar'), (5, 'en')) as candidate (rank, lang)
  where btrim(coalesce(value ->> candidate.lang, '')) <> ''
  order by candidate.rank
  limit 1;
$$;

-- Increments `version` on every update of rows broadcast in real time (ADR-0013).
create or replace function public.bump_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create type public.media_kind as enum ('product', 'cover', 'logo', 'category');

-- ---------------------------------------------------------------------------
-- Media (ADR-0018). Rows are written by the processing pipeline (P1-03).
-- ---------------------------------------------------------------------------

create table public.media (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind public.media_kind not null,
  -- Content-hashed storage prefix in the public `media` bucket, e.g. r/<restaurant>/<hash>.
  base_path text not null check (base_path ~ '^[a-z0-9/_-]{8,200}$'),
  width integer not null check (width between 1 and 6000),
  height integer not null check (height between 1 and 6000),
  thumbhash text check (char_length(thumbhash) <= 64),
  dominant_color text check (dominant_color ~ '^#[0-9a-f]{6}$'),
  renditions jsonb not null default '{}'::jsonb check (jsonb_typeof(renditions) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id)
);

create trigger media_set_updated_at before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categories and products
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name jsonb not null check (public.is_i18n_text(name, 80, true)),
  media_id uuid,
  -- lucide icon name (kebab-case), rendered when the category has no image.
  icon text check (icon ~ '^[a-z0-9-]{1,40}$'),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  -- Time window (ADR-0014 Schedule), validated by Zod on write; null = always.
  availability jsonb check (availability is null or jsonb_typeof(availability) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, media_id) references public.media (restaurant_id, id)
    on delete set null (media_id)
);

create index categories_restaurant_sort_idx on public.categories (restaurant_id, sort_order);
create index categories_media_id_idx on public.categories (restaurant_id, media_id);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null,
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  name jsonb not null check (public.is_i18n_text(name, 120, true)),
  description jsonb not null default '{}'::jsonb check (public.is_i18n_text(description, 500, false)),
  -- Integer millimes (CLAUDE.md rule 1); 10 000 DT ceiling catches typos.
  price integer not null check (price between 0 and 10000000),
  media_id uuid,
  -- Bar / kitchen routing (Phase 3 stations table, ADR-0014 §6). No UI before then.
  station_id uuid,
  badges text[] not null default '{}'
    check (badges <@ array['new', 'popular', 'house', 'seasonal']::text[]),
  -- EU 14 allergens.
  allergens text[] not null default '{}'
    check (allergens <@ array[
      'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts', 'celery',
      'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'
    ]::text[]),
  dietary text[] not null default '{}'
    check (dietary <@ array['vegetarian', 'vegan', 'gluten_free', 'spicy']::text[]),
  is_available boolean not null default true,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, category_id) references public.categories (restaurant_id, id)
    on delete cascade,
  foreign key (restaurant_id, media_id) references public.media (restaurant_id, id)
    on delete set null (media_id)
);

create unique index products_slug_key on public.products (restaurant_id, slug)
  where deleted_at is null;
create index products_category_sort_idx on public.products (restaurant_id, category_id, sort_order);
create index products_media_id_idx on public.products (restaurant_id, media_id);

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger products_bump_version before update on public.products
  for each row execute function public.bump_version();

-- ---------------------------------------------------------------------------
-- Options (ADR-0014 §1–3)
-- ---------------------------------------------------------------------------

create table public.option_groups (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name jsonb not null check (public.is_i18n_text(name, 80, true)),
  -- "Required" is derived (min_select > 0); single choice is max_select = 1.
  min_select integer not null default 0 check (min_select between 0 and 20),
  max_select integer not null default 1 check (max_select between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id),
  check (max_select >= min_select)
);

create trigger option_groups_set_updated_at before update on public.option_groups
  for each row execute function public.set_updated_at();

create table public.options (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  option_group_id uuid not null,
  name jsonb not null check (public.is_i18n_text(name, 80, true)),
  price_delta integer not null default 0 check (price_delta between 0 and 10000000),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (restaurant_id, id),
  foreign key (restaurant_id, option_group_id) references public.option_groups (restaurant_id, id)
    on delete cascade
);

create index options_group_sort_idx on public.options (restaurant_id, option_group_id, sort_order);

create trigger options_set_updated_at before update on public.options
  for each row execute function public.set_updated_at();
create trigger options_bump_version before update on public.options
  for each row execute function public.bump_version();

-- A product uses a group, optionally overriding min/max and option prices.
create table public.product_option_groups (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  product_id uuid not null,
  option_group_id uuid not null,
  sort_order integer not null default 0,
  min_select integer check (min_select between 0 and 20),
  max_select integer check (max_select between 1 and 20),
  -- { "<option id>": millimes } replacing the option's price_delta for this product.
  price_overrides jsonb not null default '{}'::jsonb check (jsonb_typeof(price_overrides) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, option_group_id),
  check (min_select is null or max_select is null or max_select >= min_select),
  foreign key (restaurant_id, product_id) references public.products (restaurant_id, id)
    on delete cascade,
  foreign key (restaurant_id, option_group_id) references public.option_groups (restaurant_id, id)
    on delete cascade
);

create index product_option_groups_group_idx on public.product_option_groups (restaurant_id, option_group_id);
create index product_option_groups_product_idx on public.product_option_groups (restaurant_id, product_id, sort_order);

create trigger product_option_groups_set_updated_at before update on public.product_option_groups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Price history (ADR-0014 §5): written by trigger with an audit entry, never by clients.
-- ---------------------------------------------------------------------------

create table public.price_history (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  product_id uuid not null,
  old_price integer not null check (old_price >= 0),
  new_price integer not null check (new_price >= 0),
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, product_id) references public.products (restaurant_id, id)
    on delete cascade
);

create index price_history_product_idx on public.price_history (restaurant_id, product_id, created_at desc);

create or replace function public.record_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.price_history (restaurant_id, product_id, old_price, new_price, changed_by)
  values (new.restaurant_id, new.id, old.price, new.price, auth.uid());
  insert into public.audit_logs (restaurant_id, actor_id, action, entity, entity_id, diff)
  values (
    new.restaurant_id, auth.uid(), 'product.price_change', 'product', new.id::text,
    jsonb_build_object('old_price', old.price, 'new_price', new.price)
  );
  return new;
end;
$$;

revoke execute on function public.record_price_change() from public, anon, authenticated;

create trigger products_record_price_change after update of price on public.products
  for each row when (old.price is distinct from new.price)
  execute function public.record_price_change();

-- ---------------------------------------------------------------------------
-- Translation glossary (ADR-0025): platform defaults (restaurant_id null) + per restaurant.
-- ---------------------------------------------------------------------------

create table public.translation_glossary (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 80),
  translations jsonb not null check (public.is_i18n_text(translations, 120, true)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index translation_glossary_term_key on public.translation_glossary (
  coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(term)
);

create trigger translation_glossary_set_updated_at before update on public.translation_glossary
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff availability toggle (spec 01: every staff role). Floor roles may change availability
-- and nothing else, so this narrow function replaces a column grant they must not have.
-- ---------------------------------------------------------------------------

create or replace function public.set_product_availability(p_product_id uuid, p_available boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
begin
  update public.products
  set is_available = p_available
  where id = p_product_id
    and deleted_at is null
    and public.is_member(restaurant_id)
  returning version into next_version;
  if next_version is null then
    raise exception 'product not found' using errcode = 'no_data_found';
  end if;
  return next_version;
end;
$$;

create or replace function public.set_option_availability(p_option_id uuid, p_available boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
begin
  update public.options
  set is_available = p_available
  where id = p_option_id
    and deleted_at is null
    and public.is_member(restaurant_id)
  returning version into next_version;
  if next_version is null then
    raise exception 'option not found' using errcode = 'no_data_found';
  end if;
  return next_version;
end;
$$;

revoke execute on function public.set_product_availability(uuid, boolean) from public, anon;
revoke execute on function public.set_option_availability(uuid, boolean) from public, anon;
grant execute on function public.set_product_availability(uuid, boolean) to authenticated;
grant execute on function public.set_option_availability(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Public menu (ADR-0003, ADR-0017): the only read path for customers. Whitelisted columns,
-- visible and non-deleted rows of an active or read-only restaurant, text resolved for the
-- requested locale with the ADR-0026 fallback chain.
-- ---------------------------------------------------------------------------

create or replace function public.media_json(p_restaurant_id uuid, p_media_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'base_path', m.base_path, 'width', m.width, 'height', m.height,
    'thumbhash', m.thumbhash, 'dominant_color', m.dominant_color, 'renditions', m.renditions
  )
  from public.media m
  where m.restaurant_id = p_restaurant_id and m.id = p_media_id and m.deleted_at is null;
$$;

create or replace function public.get_public_menu(p_slug text, p_locale text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.restaurants;
  locale text;
  menu jsonb;
begin
  select * into r
  from public.restaurants
  where slug = p_slug and deleted_at is null and status in ('active', 'read_only');
  if not found then
    return null;
  end if;

  locale := case when p_locale = any (r.locales) then p_locale else r.default_locale end;

  select coalesce(jsonb_agg(category.payload order by category.sort_order, category.id), '[]'::jsonb)
  into menu
  from (
    select c.sort_order, c.id, jsonb_build_object(
      'id', c.id,
      'name', public.i18n_pick(c.name, locale, r.default_locale),
      'icon', c.icon,
      'media', public.media_json(r.id, c.media_id),
      'availability', c.availability,
      'products', products.list
    ) as payload
    from public.categories c
    cross join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'name', public.i18n_pick(p.name, locale, r.default_locale),
        'description', public.i18n_pick(p.description, locale, r.default_locale),
        'price', p.price,
        'media', public.media_json(r.id, p.media_id),
        'badges', to_jsonb(p.badges),
        'allergens', to_jsonb(p.allergens),
        'dietary', to_jsonb(p.dietary),
        'is_available', p.is_available,
        'version', p.version,
        -- Every language of the product and category names: search matches "capucin" in the
        -- Arabic UI and "قهوة" in the French one (ADR-0026 §5).
        'search', concat_ws(' ',
          p.name ->> 'fr', p.name ->> 'ar', p.name ->> 'en',
          c.name ->> 'fr', c.name ->> 'ar', c.name ->> 'en'),
        'option_groups', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', g.id,
            'name', public.i18n_pick(g.name, locale, r.default_locale),
            'min_select', g.min_select,
            'max_select', g.max_select,
            'override_min_select', link.min_select,
            'override_max_select', link.max_select,
            'price_overrides', link.price_overrides,
            'options', (
              select coalesce(jsonb_agg(jsonb_build_object(
                'id', o.id,
                'name', public.i18n_pick(o.name, locale, r.default_locale),
                'price_delta', o.price_delta,
                'is_available', o.is_available,
                'version', o.version
              ) order by o.sort_order, o.id), '[]'::jsonb)
              from public.options o
              where o.restaurant_id = r.id and o.option_group_id = g.id and o.deleted_at is null
            )
          ) order by link.sort_order, g.id), '[]'::jsonb)
          from public.product_option_groups link
          join public.option_groups g
            on g.restaurant_id = link.restaurant_id and g.id = link.option_group_id
          where link.restaurant_id = r.id and link.product_id = p.id and g.deleted_at is null
        )
      ) order by p.sort_order, p.id) as list
      from public.products p
      where p.restaurant_id = r.id and p.category_id = c.id
        and p.is_visible and p.deleted_at is null
    ) as products
    where c.restaurant_id = r.id and c.is_visible and c.deleted_at is null
      and products.list is not null
  ) as category;

  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'public_id', r.public_id,
      'slug', r.slug,
      'name', r.name,
      'type', r.type,
      'status', r.status,
      'locale', locale,
      'default_locale', r.default_locale,
      'locales', to_jsonb(r.locales),
      'timezone', r.timezone,
      'currency', r.currency,
      'opening_schedule', r.opening_schedule,
      'manual_status', r.manual_status,
      'manual_status_until', r.manual_status_until,
      'theme', r.theme
    ),
    'categories', menu
  );
end;
$$;

revoke execute on function public.media_json(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_public_menu(text, text) from public;
grant execute on function public.get_public_menu(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on
  public.media, public.categories, public.products, public.option_groups, public.options,
  public.product_option_groups, public.price_history, public.translation_glossary
from anon;

-- Clients never write history, versions or ids of their own choosing.
revoke insert, update, delete on public.price_history from authenticated;
revoke update on public.products from authenticated;
grant update (
  category_id, slug, name, description, price, media_id, badges, allergens, dietary,
  is_available, is_visible, sort_order, deleted_at
) on public.products to authenticated;
revoke update on public.options from authenticated;
grant update (name, price_delta, is_available, sort_order, deleted_at)
  on public.options to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: members read, owners and managers write (spec 01), platform admins read.
-- ---------------------------------------------------------------------------

alter table public.media enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.price_history enable row level security;
alter table public.translation_glossary enable row level security;

do $$
declare
  menu_table text;
begin
  foreach menu_table in array array[
    'media', 'categories', 'products', 'option_groups', 'options', 'product_option_groups'
  ] loop
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using ((select public.is_member(restaurant_id)))', menu_table);
    execute format(
      'create policy "%1$s: platform read" on public.%1$I for select to authenticated
         using ((select public.is_platform_admin()))', menu_table);
    execute format(
      'create policy "%1$s: managers insert" on public.%1$I for insert to authenticated
         with check ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', menu_table);
    execute format(
      'create policy "%1$s: managers update" on public.%1$I for update to authenticated
         using ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))
         with check ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', menu_table);
    execute format(
      'create policy "%1$s: managers delete" on public.%1$I for delete to authenticated
         using ((select public.has_restaurant_role(restaurant_id,
           array[''owner'', ''manager'']::public.membership_role[])))', menu_table);
  end loop;
end;
$$;

create policy "price_history: managers read" on public.price_history
  for select to authenticated using (
    (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "price_history: platform read" on public.price_history
  for select to authenticated using ((select public.is_platform_admin()));

create policy "translation_glossary: read platform and own" on public.translation_glossary
  for select to authenticated using (
    restaurant_id is null or (select public.is_member(restaurant_id))
  );
create policy "translation_glossary: managers write own" on public.translation_glossary
  for all to authenticated
  using (
    restaurant_id is not null
    and (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  )
  with check (
    restaurant_id is not null
    and (select public.has_restaurant_role(restaurant_id, array['owner', 'manager']::public.membership_role[]))
  );
create policy "translation_glossary: super admin writes platform terms" on public.translation_glossary
  for all to authenticated
  using (restaurant_id is null and (select public.is_super_admin()))
  with check (restaurant_id is null and (select public.is_super_admin()));
