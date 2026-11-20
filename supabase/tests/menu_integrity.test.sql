-- Menu schema integrity (P1-01, ADR-0004, ADR-0014, ADR-0026): multilingual text, money,
-- composite FKs, versions, price history and its audit entry.
-- Tables covered: public.categories, public.products, public.option_groups, public.options,
-- public.product_option_groups, public.price_history, public.media
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create function pg_temp.act_as(uid uuid, memberships jsonb)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'memberships', memberships)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000003a1', 'menu-integrity-manager@example.org');

insert into public.organizations (id, name) values
  ('13000000-0000-4000-8000-00000000000a', 'Menu Org A'),
  ('13000000-0000-4000-8000-00000000000b', 'Menu Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('23000000-0000-4000-8000-00000000000a', '13000000-0000-4000-8000-00000000000a', 'menu-int-a', 'Menu A'),
  ('23000000-0000-4000-8000-00000000000b', '13000000-0000-4000-8000-00000000000b', 'menu-int-b', 'Menu B');
insert into public.memberships (restaurant_id, user_id, role) values
  ('23000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000003a1', 'manager');

insert into public.categories (id, restaurant_id, name) values
  ('33000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-00000000000a', '{"fr": "Cafés"}'),
  ('33000000-0000-4000-8000-0000000000b1', '23000000-0000-4000-8000-00000000000b', '{"fr": "Cafés"}');
insert into public.products (id, restaurant_id, category_id, slug, name, price) values
  ('43000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-00000000000a',
   '33000000-0000-4000-8000-0000000000a1', 'capucin', '{"fr": "Capucin"}', 2200);
insert into public.option_groups (id, restaurant_id, name, min_select, max_select) values
  ('53000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-00000000000a', '{"fr": "Sucre"}', 1, 1),
  ('53000000-0000-4000-8000-0000000000b1', '23000000-0000-4000-8000-00000000000b', '{"fr": "Sucre"}', 1, 1);

-- ---------------------------------------------------------------- multilingual text
select ok(public.is_i18n_text('{"fr": "Café", "ar": "قهوة", "en": "Coffee"}', 80, true), 'fr/ar/en text is valid');
select ok(not public.is_i18n_text('{"de": "Kaffee"}', 80, true), 'unknown locale keys are rejected');
select ok(not public.is_i18n_text('{"fr": "  "}', 80, true), 'required text needs a non-blank value');
select ok(public.is_i18n_text('{}', 500, false), 'optional text may be empty');
select ok(not public.is_i18n_text('{"fr": 3}', 80, true), 'values must be strings');
select throws_ok(
  $$ insert into public.categories (restaurant_id, name) values ('23000000-0000-4000-8000-00000000000a', '{"fr": ""}') $$,
  '23514', null, 'a category without a name is rejected');

select is(
  public.i18n_pick('{"fr": "Café", "ar": "قهوة"}', 'ar', 'fr'),
  '{"text": "قهوة", "lang": "ar"}'::jsonb, 'i18n_pick returns the requested locale');
select is(
  public.i18n_pick('{"fr": "Café", "ar": ""}', 'ar', 'fr'),
  '{"text": "Café", "lang": "fr"}'::jsonb, 'i18n_pick falls back to the restaurant default');
select is(
  public.i18n_pick('{"en": "Coffee"}', 'ar', 'fr'),
  '{"text": "Coffee", "lang": "en"}'::jsonb, 'i18n_pick falls back to the first available text');
select is(public.i18n_pick('{}', 'fr', 'fr'), null, 'i18n_pick returns null for empty text');

-- ---------------------------------------------------------------- money, enums, FKs
select throws_ok(
  $$ update public.products set price = -1 where id = '43000000-0000-4000-8000-0000000000a1' $$,
  '23514', null, 'negative prices are rejected');
select throws_ok(
  $$ update public.products set badges = '{bestseller}' where id = '43000000-0000-4000-8000-0000000000a1' $$,
  '23514', null, 'unknown badges are rejected');
select lives_ok(
  $$ update public.products set badges = '{recommended}' where id = '43000000-0000-4000-8000-0000000000a1' $$,
  'the recommended badge is accepted');
select throws_ok(
  $$ update public.products set allergens = '{bananas}' where id = '43000000-0000-4000-8000-0000000000a1' $$,
  '23514', null, 'unknown allergens are rejected');
select throws_ok(
  $$ insert into public.products (restaurant_id, category_id, slug, name, price)
     values ('23000000-0000-4000-8000-00000000000a', '33000000-0000-4000-8000-0000000000b1', 'leak', '{"fr": "x"}', 100) $$,
  '23503', null, 'a product cannot point to another restaurant''s category');
select throws_ok(
  $$ insert into public.product_option_groups (restaurant_id, product_id, option_group_id)
     values ('23000000-0000-4000-8000-00000000000a', '43000000-0000-4000-8000-0000000000a1', '53000000-0000-4000-8000-0000000000b1') $$,
  '23503', null, 'a product cannot use another restaurant''s option group');
select throws_ok(
  $$ insert into public.option_groups (restaurant_id, name, min_select, max_select)
     values ('23000000-0000-4000-8000-00000000000a', '{"fr": "x"}', 3, 2) $$,
  '23514', null, 'max_select below min_select is rejected');
select throws_ok(
  $$ insert into public.products (restaurant_id, category_id, slug, name, price)
     values ('23000000-0000-4000-8000-00000000000a', '33000000-0000-4000-8000-0000000000a1', 'capucin', '{"fr": "Bis"}', 100) $$,
  '23505', null, 'slugs are unique per restaurant');
select lives_ok(
  $$ insert into public.products (restaurant_id, category_id, slug, name, price)
     values ('23000000-0000-4000-8000-00000000000b', '33000000-0000-4000-8000-0000000000b1', 'capucin', '{"fr": "Capucin B"}', 100) $$,
  'another restaurant may reuse the slug');
select throws_ok(
  $$ insert into public.media (restaurant_id, kind, base_path, width, height)
     values ('23000000-0000-4000-8000-00000000000a', 'product', '../etc/passwd', 10, 10) $$,
  '23514', null, 'media paths are restricted to a safe alphabet');

-- ---------------------------------------------------------------- versions and price history
update public.products set is_available = false where id = '43000000-0000-4000-8000-0000000000a1';
select is(
  (select version from public.products where id = '43000000-0000-4000-8000-0000000000a1'), 2,
  'every update bumps the realtime version');

select pg_temp.act_as('00000000-0000-4000-8000-0000000003a1',
  '[{"restaurant_id": "23000000-0000-4000-8000-00000000000a", "role": "manager"}]');
update public.products set price = 2500 where id = '43000000-0000-4000-8000-0000000000a1';
update public.products set name = '{"fr": "Capucin maison"}' where id = '43000000-0000-4000-8000-0000000000a1';
reset role;

select results_eq(
  $$ select old_price, new_price, changed_by from public.price_history
     where product_id = '43000000-0000-4000-8000-0000000000a1' $$,
  $$ values (2200, 2500, '00000000-0000-4000-8000-0000000003a1'::uuid) $$,
  'a price change (and only a price change) writes price_history with the author');
select is(
  (select diff from public.audit_logs
   where entity_id = '43000000-0000-4000-8000-0000000000a1' and action = 'product.price_change'),
  '{"old_price": 2200, "new_price": 2500}'::jsonb,
  'a price change is audited');
select is(
  (select actor_id from public.audit_logs
   where entity_id = '43000000-0000-4000-8000-0000000000a1' and action = 'product.price_change'),
  '00000000-0000-4000-8000-0000000003a1'::uuid,
  'the audit entry names the manager');

select * from finish();
rollback;
