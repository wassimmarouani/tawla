-- get_public_menu (P1-01, ADR-0003, ADR-0017, ADR-0026): the customer read path never returns
-- hidden, deleted, other-tenant or non-whitelisted data, and resolves text per locale.
-- Tables covered: public.categories, public.products, public.options, public.option_groups,
-- public.product_option_groups
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into public.organizations (id, name) values
  ('15000000-0000-4000-8000-00000000000a', 'Org A'),
  ('15000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name, locales, default_locale) values
  ('25000000-0000-4000-8000-00000000000a', '15000000-0000-4000-8000-00000000000a', 'menu-pub-a', 'Café A', '{fr,ar,en}', 'fr'),
  ('25000000-0000-4000-8000-00000000000b', '15000000-0000-4000-8000-00000000000b', 'menu-pub-b', 'Café B', '{fr,ar}', 'ar');

insert into public.categories (id, restaurant_id, name, sort_order, is_visible, deleted_at) values
  ('35000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', '{"fr": "Cafés", "ar": "قهوة"}', 10, true, null),
  ('35000000-0000-4000-8000-0000000000a2', '25000000-0000-4000-8000-00000000000a', '{"fr": "Cachée"}', 20, false, null),
  ('35000000-0000-4000-8000-0000000000a3', '25000000-0000-4000-8000-00000000000a', '{"fr": "Supprimée"}', 30, true, now()),
  ('35000000-0000-4000-8000-0000000000a4', '25000000-0000-4000-8000-00000000000a', '{"fr": "Vide"}', 40, true, null),
  ('35000000-0000-4000-8000-0000000000b1', '25000000-0000-4000-8000-00000000000b', '{"ar": "قهوة"}', 10, true, null);

insert into public.products (id, restaurant_id, category_id, slug, name, price, station_id, is_available, is_visible, deleted_at, sort_order) values
  ('45000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a1', 'capucin', '{"fr": "Capucin", "en": "Capucin EN"}', 2200, '95000000-0000-4000-8000-000000000001', true, true, null, 10),
  ('45000000-0000-4000-8000-0000000000a2', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a1', 'epuise', '{"fr": "Épuisé"}', 1000, null, false, true, null, 20),
  ('45000000-0000-4000-8000-0000000000a3', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a1', 'cache', '{"fr": "Caché"}', 1000, null, true, false, null, 30),
  ('45000000-0000-4000-8000-0000000000a4', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a1', 'supprime', '{"fr": "Supprimé"}', 1000, null, true, true, now(), 40),
  ('45000000-0000-4000-8000-0000000000a5', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a2', 'dans-cachee', '{"fr": "Dans cachée"}', 1000, null, true, true, null, 10),
  ('45000000-0000-4000-8000-0000000000a6', '25000000-0000-4000-8000-00000000000a', '35000000-0000-4000-8000-0000000000a4', 'tout-cache', '{"fr": "Seul et caché"}', 1000, null, true, false, null, 10),
  ('45000000-0000-4000-8000-0000000000b1', '25000000-0000-4000-8000-00000000000b', '35000000-0000-4000-8000-0000000000b1', 'capucin', '{"ar": "كابوسان"}', 2000, null, true, true, null, 10);

insert into public.option_groups (id, restaurant_id, name, min_select, max_select, deleted_at) values
  ('55000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', '{"fr": "Sucre"}', 1, 1, null),
  ('55000000-0000-4000-8000-0000000000a2', '25000000-0000-4000-8000-00000000000a', '{"fr": "Retiré"}', 0, 1, now());
insert into public.options (id, restaurant_id, option_group_id, name, price_delta, sort_order, deleted_at) values
  ('65000000-0000-4000-8000-0000000000a1', '25000000-0000-4000-8000-00000000000a', '55000000-0000-4000-8000-0000000000a1', '{"fr": "Sans sucre"}', 0, 10, null),
  ('65000000-0000-4000-8000-0000000000a2', '25000000-0000-4000-8000-00000000000a', '55000000-0000-4000-8000-0000000000a1', '{"fr": "Ancien"}', 0, 20, now());
insert into public.product_option_groups (restaurant_id, product_id, option_group_id, sort_order, max_select, price_overrides) values
  ('25000000-0000-4000-8000-00000000000a', '45000000-0000-4000-8000-0000000000a1', '55000000-0000-4000-8000-0000000000a1', 1, 1, '{"65000000-0000-4000-8000-0000000000a1": 0}'),
  ('25000000-0000-4000-8000-00000000000a', '45000000-0000-4000-8000-0000000000a1', '55000000-0000-4000-8000-0000000000a2', 2, null, '{}');

create temp table menu_fr as select public.get_public_menu('menu-pub-a', 'fr') as body;
create temp table menu_en as select public.get_public_menu('menu-pub-a', 'en') as body;

-- ---------------------------------------------------------------- shape and visibility
select is((select body -> 'restaurant' ->> 'name' from menu_fr), 'Café A', 'returns the restaurant');
select is((select body -> 'restaurant' ->> 'locale' from menu_fr), 'fr', 'reports the resolved locale');
select is((select jsonb_array_length(body -> 'categories') from menu_fr), 1, 'hidden, deleted and empty categories are left out');
select is(
  (select jsonb_agg(p ->> 'slug' order by p ->> 'slug') from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p),
  '["capucin", "epuise"]'::jsonb,
  'hidden and deleted products are left out; unavailable ones stay (shown as sold out)');
select is(
  (select p -> 'is_available' from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p where p ->> 'slug' = 'epuise'),
  'false'::jsonb, 'availability is exposed');
select is(
  (select jsonb_array_length(p -> 'option_groups') from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p where p ->> 'slug' = 'capucin'),
  1, 'deleted option groups are left out');
select is(
  (select jsonb_array_length(p -> 'option_groups' -> 0 -> 'options') from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p where p ->> 'slug' = 'capucin'),
  1, 'deleted options are left out');
select is(
  (select p -> 'option_groups' -> 0 -> 'override_max_select' from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p where p ->> 'slug' = 'capucin'),
  '1'::jsonb, 'per-product overrides are returned for the pure pricing service');

-- ---------------------------------------------------------------- whitelisted columns only
select is(
  (select jsonb_agg(k order by k) from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p, jsonb_object_keys(p) k where p ->> 'slug' = 'capucin'),
  '["allergens", "badges", "description", "dietary", "id", "is_available", "media", "name", "option_groups", "price", "search", "slug", "version"]'::jsonb,
  'products expose whitelisted keys only (no station, sort order, restaurant or timestamps)');
select is(
  (select jsonb_agg(k order by k) from menu_fr, jsonb_object_keys(body -> 'restaurant') k),
  '["currency", "default_locale", "locale", "locales", "manual_status", "manual_status_until", "name", "opening_schedule", "public_id", "slug", "status", "theme", "timezone", "type"]'::jsonb,
  'the restaurant exposes whitelisted keys only (no id, organization or settings)');
select is(
  (select p ->> 'search' from menu_fr, jsonb_array_elements(body -> 'categories' -> 0 -> 'products') p where p ->> 'slug' = 'capucin'),
  'Capucin Capucin EN Cafés قهوة', 'search terms carry every language of the product and its category');
select ok((select body::text not like '%25000000-0000-4000-8000-00000000000a%' from menu_fr), 'the internal restaurant id never appears');
select ok((select body::text not like '%95000000-0000-4000-8000-000000000001%' from menu_fr), 'station ids never appear');

-- ---------------------------------------------------------------- tenants and locales
select ok((select body::text not like '%كابوسان%' from menu_fr), 'another tenant''s products never appear');
select is(
  (select body -> 'categories' -> 0 -> 'products' -> 0 -> 'name' from menu_en),
  '{"text": "Capucin EN", "lang": "en"}'::jsonb, 'text is resolved for the requested locale');
select is(
  (select body -> 'categories' -> 0 -> 'name' from menu_en),
  '{"text": "Cafés", "lang": "fr"}'::jsonb, 'missing translations fall back to the default locale, with its lang');
select is(
  public.get_public_menu('menu-pub-b', 'en') -> 'restaurant' ->> 'locale', 'ar',
  'a locale the restaurant does not offer falls back to its default');
select is(
  public.get_public_menu('menu-pub-a', 'de') -> 'restaurant' ->> 'locale', 'fr',
  'an unknown locale falls back to the default');

-- ---------------------------------------------------------------- restaurant status
select is(public.get_public_menu('no-such-cafe', 'fr'), null, 'unknown slugs return null');
update public.restaurants set status = 'read_only' where id = '25000000-0000-4000-8000-00000000000a';
select isnt(public.get_public_menu('menu-pub-a', 'fr'), null, 'read-only restaurants keep their menu online');
update public.restaurants set status = 'suspended' where id = '25000000-0000-4000-8000-00000000000a';
select is(public.get_public_menu('menu-pub-a', 'fr'), null, 'suspended restaurants return null');
update public.restaurants set status = 'active', deleted_at = now() where id = '25000000-0000-4000-8000-00000000000a';
select is(public.get_public_menu('menu-pub-a', 'fr'), null, 'deleted restaurants return null');

-- ---------------------------------------------------------------- callers
set local role anon;
select isnt(public.get_public_menu('menu-pub-b', 'ar'), null, 'anonymous customers can read a public menu');
select throws_ok($$ select public.media_json('25000000-0000-4000-8000-00000000000b', null) $$, '42501', null, 'helpers are not callable directly');
select throws_ok($$ select count(*) from public.categories $$, '42501', null, 'anonymous customers cannot read menu tables');
reset role;

select * from finish();
rollback;
