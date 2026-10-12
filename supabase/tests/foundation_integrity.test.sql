-- Integrity rules of the foundation schema: RLS coverage, ids, slugs, profiles, JWT hook.
-- Tables covered: public.restaurants, public.profiles, public.memberships, public.reserved_slugs
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- ---------------------------------------------------------------- RLS everywhere
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every table in public has row level security enabled');

-- ---------------------------------------------------------------- uuid_v7 / tokens
create temp table ids as select public.uuid_v7() as id from generate_series(1, 20000);
select is((select count(distinct id) from ids), 20000::bigint, 'uuid_v7 values are unique');
select is_empty($$ select id from ids where substring(id::text, 15, 1) <> '7' $$, 'uuid_v7 sets version 7');
select is_empty($$ select id from ids where substring(id::text, 20, 1) not in ('8', '9', 'a', 'b') $$,
  'uuid_v7 sets the RFC variant');

create temp table ordered (n int, id uuid);
insert into ordered values (1, public.uuid_v7());
select pg_sleep(0.003);
insert into ordered values (2, public.uuid_v7());
select ok((select id from ordered where n = 1) < (select id from ordered where n = 2),
  'uuid_v7 values are time-ordered across milliseconds');

select ok(public.random_token() ~ '^[A-Za-z0-9_-]{22}$', 'random_token is 22 base64url characters (128 bits)');

-- ---------------------------------------------------------------- slugs
insert into public.organizations (id, name) values ('10000000-0000-4000-8000-0000000000c1', 'Org');

select throws_ok(
  $$ insert into public.restaurants (organization_id, slug, name)
     values ('10000000-0000-4000-8000-0000000000c1', 'admin', 'X') $$,
  '23514', null, 'reserved slugs are rejected');
select throws_ok(
  $$ insert into public.restaurants (organization_id, slug, name)
     values ('10000000-0000-4000-8000-0000000000c1', 'Café', 'X') $$,
  '23514', null, 'slugs must match the slug pattern');
select lives_ok(
  $$ insert into public.restaurants (organization_id, slug, name)
     values ('10000000-0000-4000-8000-0000000000c1', 'cafe-el-bahja', 'Café El Bahja') $$,
  'a valid slug is accepted');
select throws_ok(
  $$ insert into public.restaurants (organization_id, slug, name)
     values ('10000000-0000-4000-8000-0000000000c1', 'cafe-el-bahja', 'Twin') $$,
  '23505', null, 'live slugs are unique');
update public.restaurants set deleted_at = now() where slug = 'cafe-el-bahja';
select lives_ok(
  $$ insert into public.restaurants (organization_id, slug, name)
     values ('10000000-0000-4000-8000-0000000000c1', 'cafe-el-bahja', 'New owner') $$,
  'a soft-deleted restaurant frees its slug');
select throws_ok(
  $$ insert into public.restaurants (organization_id, slug, name, locales, default_locale)
     values ('10000000-0000-4000-8000-0000000000c1', 'only-fr', 'X', array['fr'], 'ar') $$,
  '23514', null, 'the default locale must be enabled');

-- ---------------------------------------------------------------- profiles
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000c1', 'new@example.org', '{"full_name": "Sami Ben Ali", "locale": "ar"}');
select results_eq(
  $$ select full_name, locale, platform_role::text from public.profiles
     where id = '00000000-0000-4000-8000-0000000000c1' $$,
  $$ values ('Sami Ben Ali'::text, 'ar'::text, 'none'::text) $$,
  'a profile is created for every new auth user');

-- ---------------------------------------------------------------- access token hook
insert into public.memberships (restaurant_id, user_id, role)
select id, '00000000-0000-4000-8000-0000000000c1', 'manager' from public.restaurants
where slug = 'cafe-el-bahja' and deleted_at is null;

select is(
  jsonb_array_length(public.custom_access_token_hook(jsonb_build_object(
    'user_id', '00000000-0000-4000-8000-0000000000c1', 'claims', '{"role": "authenticated"}'::jsonb
  )) -> 'claims' -> 'memberships'),
  1, 'the hook adds active memberships of live restaurants');
select is(
  public.custom_access_token_hook(jsonb_build_object(
    'user_id', '00000000-0000-4000-8000-0000000000c1', 'claims', '{"role": "authenticated"}'::jsonb
  )) -> 'claims' ->> 'platform_role',
  'none', 'the hook adds the platform role');

update public.memberships set is_active = false where user_id = '00000000-0000-4000-8000-0000000000c1';
select is(
  jsonb_array_length(public.custom_access_token_hook(jsonb_build_object(
    'user_id', '00000000-0000-4000-8000-0000000000c1', 'claims', '{}'::jsonb
  )) -> 'claims' -> 'memberships'),
  0, 'inactive memberships are not in the token');

select ok(
  not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'clients cannot call the access token hook');

select * from finish();
rollback;
