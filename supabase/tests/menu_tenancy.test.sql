-- Menu tenant isolation and role permissions (P1-01, ADR-0003, ADR-0005, spec 01).
-- Tables covered: public.media, public.categories, public.products, public.option_groups,
-- public.options, public.product_option_groups, public.price_history, public.translation_glossary
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

create function pg_temp.act_as(uid uuid, memberships jsonb, platform text default 'none', aal text default 'aal1')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'memberships', memberships,
    'platform_role', platform, 'aal', aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.affected(statement text)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------- fixtures (A and B)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000004a1', 'menu-manager-a@example.org'),
  ('00000000-0000-4000-8000-0000000004a2', 'menu-waiter-a@example.org'),
  ('00000000-0000-4000-8000-0000000004b1', 'menu-manager-b@example.org'),
  ('00000000-0000-4000-8000-0000000004ad', 'menu-admin@example.org');

insert into public.organizations (id, name) values
  ('14000000-0000-4000-8000-00000000000a', 'Org A'),
  ('14000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('24000000-0000-4000-8000-00000000000a', '14000000-0000-4000-8000-00000000000a', 'menu-rls-a', 'A'),
  ('24000000-0000-4000-8000-00000000000b', '14000000-0000-4000-8000-00000000000b', 'menu-rls-b', 'B');

insert into public.media (id, restaurant_id, kind, base_path, width, height) values
  ('94000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-00000000000a', 'product', 'r/a/0123456789abcdef', 640, 640),
  ('94000000-0000-4000-8000-0000000000b1', '24000000-0000-4000-8000-00000000000b', 'product', 'r/b/0123456789abcdef', 640, 640);
insert into public.categories (id, restaurant_id, name) values
  ('34000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-00000000000a', '{"fr": "A"}'),
  ('34000000-0000-4000-8000-0000000000b1', '24000000-0000-4000-8000-00000000000b', '{"fr": "B"}');
insert into public.products (id, restaurant_id, category_id, slug, name, price) values
  ('44000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-00000000000a', '34000000-0000-4000-8000-0000000000a1', 'p-a', '{"fr": "A"}', 1000),
  ('44000000-0000-4000-8000-0000000000b1', '24000000-0000-4000-8000-00000000000b', '34000000-0000-4000-8000-0000000000b1', 'p-b', '{"fr": "B"}', 1000);
insert into public.option_groups (id, restaurant_id, name) values
  ('54000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-00000000000a', '{"fr": "A"}'),
  ('54000000-0000-4000-8000-0000000000b1', '24000000-0000-4000-8000-00000000000b', '{"fr": "B"}');
insert into public.options (id, restaurant_id, option_group_id, name) values
  ('64000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-00000000000a', '54000000-0000-4000-8000-0000000000a1', '{"fr": "A"}'),
  ('64000000-0000-4000-8000-0000000000b1', '24000000-0000-4000-8000-00000000000b', '54000000-0000-4000-8000-0000000000b1', '{"fr": "B"}');
insert into public.product_option_groups (restaurant_id, product_id, option_group_id) values
  ('24000000-0000-4000-8000-00000000000a', '44000000-0000-4000-8000-0000000000a1', '54000000-0000-4000-8000-0000000000a1'),
  ('24000000-0000-4000-8000-00000000000b', '44000000-0000-4000-8000-0000000000b1', '54000000-0000-4000-8000-0000000000b1');
update public.products set price = 1100
where id in ('44000000-0000-4000-8000-0000000000a1', '44000000-0000-4000-8000-0000000000b1');
insert into public.translation_glossary (restaurant_id, term, translations) values
  (null, 'menu-rls-platform-term', '{"ar": "منصة"}'),
  ('24000000-0000-4000-8000-00000000000a', 'menu-rls-term-a', '{"ar": "أ"}'),
  ('24000000-0000-4000-8000-00000000000b', 'menu-rls-term-b', '{"ar": "ب"}');

-- ---------------------------------------------------------------- manager A
select pg_temp.act_as('00000000-0000-4000-8000-0000000004a1',
  '[{"restaurant_id": "24000000-0000-4000-8000-00000000000a", "role": "manager"}]');

select is((select count(*) from public.media where restaurant_id in ('24000000-0000-4000-8000-00000000000a', '24000000-0000-4000-8000-00000000000b')), 1::bigint, 'manager A sees only A media');
select is((select count(*) from public.categories where id in ('34000000-0000-4000-8000-0000000000a1', '34000000-0000-4000-8000-0000000000b1')), 1::bigint, 'manager A sees only A categories');
select is((select count(*) from public.products where id in ('44000000-0000-4000-8000-0000000000a1', '44000000-0000-4000-8000-0000000000b1')), 1::bigint, 'manager A sees only A products');
select is((select count(*) from public.option_groups where id in ('54000000-0000-4000-8000-0000000000a1', '54000000-0000-4000-8000-0000000000b1')), 1::bigint, 'manager A sees only A option groups');
select is((select count(*) from public.options where id in ('64000000-0000-4000-8000-0000000000a1', '64000000-0000-4000-8000-0000000000b1')), 1::bigint, 'manager A sees only A options');
select is((select count(*) from public.product_option_groups where restaurant_id in ('24000000-0000-4000-8000-00000000000a', '24000000-0000-4000-8000-00000000000b')), 1::bigint, 'manager A sees only A product links');
select is((select count(*) from public.price_history where restaurant_id in ('24000000-0000-4000-8000-00000000000a', '24000000-0000-4000-8000-00000000000b')), 1::bigint, 'manager A sees only A price history');
select is((select count(*) from public.translation_glossary where term like 'menu-rls-%'), 2::bigint, 'manager A sees platform and A glossary terms');

select is(pg_temp.affected($$ update public.products set price = 1200 where id = '44000000-0000-4000-8000-0000000000a1' $$), 1, 'manager A edits an A product');
select is(pg_temp.affected($$ update public.products set price = 1 where id = '44000000-0000-4000-8000-0000000000b1' $$), 0, 'manager A cannot edit a B product');
select is(pg_temp.affected($$ delete from public.options where id = '64000000-0000-4000-8000-0000000000b1' $$), 0, 'manager A cannot delete a B option');
select lives_ok(
  $$ insert into public.categories (restaurant_id, name) values ('24000000-0000-4000-8000-00000000000a', '{"fr": "New"}') $$,
  'manager A creates an A category');
select throws_ok(
  $$ insert into public.categories (restaurant_id, name) values ('24000000-0000-4000-8000-00000000000b', '{"fr": "Leak"}') $$,
  '42501', null, 'manager A cannot create a B category');
select throws_ok(
  $$ update public.products set version = 99 where id = '44000000-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'clients cannot write the realtime version');
select throws_ok(
  $$ insert into public.price_history (restaurant_id, product_id, old_price, new_price)
     values ('24000000-0000-4000-8000-00000000000a', '44000000-0000-4000-8000-0000000000a1', 1, 2) $$,
  '42501', null, 'clients cannot forge price history');
select lives_ok(
  $$ insert into public.translation_glossary (restaurant_id, term, translations) values ('24000000-0000-4000-8000-00000000000a', 'menu-rls-new', '{"en": "New"}') $$,
  'manager A adds an A glossary term');
select throws_ok(
  $$ insert into public.translation_glossary (restaurant_id, term, translations) values (null, 'menu-rls-hijack', '{"en": "x"}') $$,
  '42501', null, 'manager A cannot add platform glossary terms');
select throws_ok(
  $$ select public.set_product_availability('44000000-0000-4000-8000-0000000000b1', false) $$,
  'P0002', null, 'manager A cannot toggle a B product');
reset role;

-- ---------------------------------------------------------------- waiter A
select pg_temp.act_as('00000000-0000-4000-8000-0000000004a2',
  '[{"restaurant_id": "24000000-0000-4000-8000-00000000000a", "role": "waiter"}]');

select is((select count(*) from public.products where id = '44000000-0000-4000-8000-0000000000a1'), 1::bigint, 'waiter A reads the A menu');
select is((select count(*) from public.price_history where restaurant_id = '24000000-0000-4000-8000-00000000000a'), 0::bigint, 'waiter A cannot read price history');
select is(pg_temp.affected($$ update public.products set price = 1 where id = '44000000-0000-4000-8000-0000000000a1' $$), 0, 'waiter A cannot edit products');
select throws_ok(
  $$ insert into public.categories (restaurant_id, name) values ('24000000-0000-4000-8000-00000000000a', '{"fr": "Waiter"}') $$,
  '42501', null, 'waiter A cannot create categories');
select ok(public.set_product_availability('44000000-0000-4000-8000-0000000000a1', false) > 1, 'waiter A marks an A product unavailable and gets the new version');
select ok(public.set_option_availability('64000000-0000-4000-8000-0000000000a1', false) > 1, 'waiter A marks an A option unavailable');
select throws_ok(
  $$ select public.set_option_availability('64000000-0000-4000-8000-0000000000b1', false) $$,
  'P0002', null, 'waiter A cannot toggle a B option');
reset role;

select is((select is_available from public.products where id = '44000000-0000-4000-8000-0000000000a1'), false, 'the toggle persisted');
select is((select price from public.products where id = '44000000-0000-4000-8000-0000000000a1'), 1200, 'the toggle changed nothing else');

-- ---------------------------------------------------------------- anon, outsiders, platform
set local role anon;
select throws_ok($$ select count(*) from public.products $$, '42501', null, 'anon cannot read menu tables directly');
select throws_ok(
  $$ select public.set_product_availability('44000000-0000-4000-8000-0000000000a1', true) $$,
  '42501', null, 'anon cannot toggle availability');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-0000000004b1', '[]');
select is((select count(*) from public.products where restaurant_id = '24000000-0000-4000-8000-00000000000a'), 0::bigint, 'a user without membership sees no A menu');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-0000000004ad', '[]', 'support', 'aal2');
select is((select count(*) from public.products where id in ('44000000-0000-4000-8000-0000000000a1', '44000000-0000-4000-8000-0000000000b1')), 2::bigint, 'support with TOTP reads every menu');
select is(pg_temp.affected($$ update public.products set price = 1 where id = '44000000-0000-4000-8000-0000000000a1' $$), 0, 'support cannot edit menus outside impersonation');
reset role;

select * from finish();
rollback;
