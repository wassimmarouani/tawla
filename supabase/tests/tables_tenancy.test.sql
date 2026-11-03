-- Tables and zones: tenant isolation, roles, token integrity (P1-08, ADR-0003, ADR-0012).
-- Tables covered: public.zones, public.tables
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.act_as(uid uuid, memberships jsonb)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'memberships', memberships,
    'platform_role', 'none', 'aal', 'aal1')::text, true);
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
  ('00000000-0000-4000-8000-0000000008a1', 'tables-manager-a@example.org'),
  ('00000000-0000-4000-8000-0000000008a2', 'tables-waiter-a@example.org'),
  ('00000000-0000-4000-8000-0000000008b1', 'tables-manager-b@example.org');
insert into public.organizations (id, name) values
  ('18000000-0000-4000-8000-00000000000a', 'Org A'),
  ('18000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('28000000-0000-4000-8000-00000000000a', '18000000-0000-4000-8000-00000000000a', 'tables-rls-a', 'A'),
  ('28000000-0000-4000-8000-00000000000b', '18000000-0000-4000-8000-00000000000b', 'tables-rls-b', 'B');
insert into public.zones (id, restaurant_id, name) values
  ('38000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', '{"fr": "Terrasse"}'),
  ('38000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', '{"fr": "Salle"}');
insert into public.tables (id, restaurant_id, zone_id, number) values
  ('48000000-0000-4000-8000-0000000000a1', '28000000-0000-4000-8000-00000000000a', '38000000-0000-4000-8000-0000000000a1', 1),
  ('48000000-0000-4000-8000-0000000000b1', '28000000-0000-4000-8000-00000000000b', null, 1);
-- Known tokens for the assertions (the insert trigger always generates its own).
update public.tables set token = 'tokenAtokenAtokenAtok1' where id = '48000000-0000-4000-8000-0000000000a1';
update public.tables set token = 'tokenBtokenBtokenBtok1' where id = '48000000-0000-4000-8000-0000000000b1';

-- ---------------------------------------------------------------- integrity
select throws_ok(
  $$ insert into public.tables (restaurant_id, number) values ('28000000-0000-4000-8000-00000000000a', 1) $$,
  '23505', null, 'a live table number is unique per restaurant');
select throws_ok(
  $$ insert into public.tables (restaurant_id, zone_id, number)
     values ('28000000-0000-4000-8000-00000000000a', '38000000-0000-4000-8000-0000000000b1', 7) $$,
  '23503', null, 'a table cannot use another restaurant''s zone');
select matches(
  (select token from public.tables where restaurant_id = '28000000-0000-4000-8000-00000000000a'
     and number = 1),
  '^[A-Za-z0-9_-]{22}$', 'tokens are 22 base64url characters');

-- ---------------------------------------------------------------- anonymous
set local role anon;
select throws_ok($$ select count(*) from public.tables $$, '42501', null, 'anon cannot read tables');
select is(
  public.get_table('tokenAtokenAtokenAtok1') ->> 'restaurant_slug', 'tables-rls-a',
  'anon resolves a token to its restaurant');
select is(public.get_table('unknown-token-unknown-'), null, 'anon gets null for unknown tokens');
reset role;

-- ---------------------------------------------------------------- manager A
select pg_temp.act_as('00000000-0000-4000-8000-0000000008a1',
  '[{"restaurant_id": "28000000-0000-4000-8000-00000000000a", "role": "manager"}]');
select is((select count(*) from public.tables), 1::bigint, 'manager A reads A tables only');
select is((select count(*) from public.zones), 1::bigint, 'manager A reads A zones only');
select lives_ok(
  $$ insert into public.tables (restaurant_id, number) values ('28000000-0000-4000-8000-00000000000a', 2) $$,
  'manager A creates a table');
insert into public.tables (restaurant_id, number, token)
  values ('28000000-0000-4000-8000-00000000000a', 3, 'chosenTokenchosenToken');
select is((select count(*) from public.tables where token = 'chosenTokenchosenToken'), 0::bigint,
  'a token chosen by a client is replaced');
select throws_ok(
  $$ update public.tables set token = 'chosenTokenchosenToken' $$,
  '42501', null, 'clients cannot overwrite a token');
select is(pg_temp.affected($$ update public.tables set label = 'Bar' where restaurant_id = '28000000-0000-4000-8000-00000000000b' $$),
  0, 'manager A cannot edit B tables');
select isnt(public.regenerate_table_token('48000000-0000-4000-8000-0000000000a1'),
  'tokenAtokenAtokenAtok1', 'manager A regenerates a token');
select throws_ok($$ select public.regenerate_table_token('48000000-0000-4000-8000-0000000000b1') $$,
  'P0002', null, 'manager A cannot regenerate B tokens');
reset role;

select is(public.get_table('tokenAtokenAtokenAtok1'), null, 'the old token stops working at once');
select is(
  (select count(*) from public.audit_logs where action = 'table.regenerate_token'
     and entity_id = '48000000-0000-4000-8000-0000000000a1'),
  1::bigint, 'token regeneration is audited');

-- ---------------------------------------------------------------- waiter A
select pg_temp.act_as('00000000-0000-4000-8000-0000000008a2',
  '[{"restaurant_id": "28000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select throws_ok(
  $$ insert into public.tables (restaurant_id, number) values ('28000000-0000-4000-8000-00000000000a', 9) $$,
  '42501', null, 'waiter A cannot create tables');
select throws_ok($$ select public.regenerate_table_token('48000000-0000-4000-8000-0000000000a1') $$,
  'P0002', null, 'waiter A cannot regenerate tokens');
reset role;

select * from finish();
rollback;
