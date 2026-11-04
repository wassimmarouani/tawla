-- Tenant isolation and role permissions on the foundation tables (ADR-0003, ADR-0005).
-- Tables covered: public.organizations, public.restaurants, public.memberships,
-- public.subscriptions, public.feature_overrides, public.audit_logs, public.profiles,
-- public.slug_redirects, public.plans, public.reserved_slugs
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Impersonation helpers (temporary, rolled back with the transaction).
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

-- Rows affected by a statement, executed with the caller's current role (and its RLS).
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

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner-a@example.org'),
  ('00000000-0000-4000-8000-0000000000a2', 'manager-a@example.org'),
  ('00000000-0000-4000-8000-0000000000a3', 'waiter-a@example.org'),
  ('00000000-0000-4000-8000-0000000000b2', 'manager-b@example.org'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@example.org'),
  ('00000000-0000-4000-8000-0000000000ff', 'stranger@example.org');

update public.profiles set platform_role = 'super_admin'
where id = '00000000-0000-4000-8000-0000000000ad';

insert into public.organizations (id, name) values
  ('10000000-0000-4000-8000-00000000000a', 'Org A'),
  ('10000000-0000-4000-8000-00000000000b', 'Org B');

insert into public.restaurants (id, organization_id, slug, name) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'cafe-a', 'Café A'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'cafe-b', 'Café B');

insert into public.memberships (restaurant_id, user_id, role, pin_hmac) values
  ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'owner', null),
  ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2', 'manager', null),
  ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a3', 'waiter', repeat('a', 64)),
  ('20000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b2', 'manager', null);

insert into public.subscriptions (restaurant_id, plan_id)
select r.id, p.id from public.restaurants r cross join public.plans p
where p.code = 'basic' and r.slug in ('cafe-a', 'cafe-b');

insert into public.feature_overrides (restaurant_id, feature_key, enabled) values
  ('20000000-0000-4000-8000-00000000000a', 'ordering', true),
  ('20000000-0000-4000-8000-00000000000b', 'ordering', true);

insert into public.slug_redirects (restaurant_id, old_slug) values
  ('20000000-0000-4000-8000-00000000000a', 'old-cafe-a'),
  ('20000000-0000-4000-8000-00000000000b', 'old-cafe-b');

insert into public.audit_logs (restaurant_id, action, entity) values
  ('20000000-0000-4000-8000-00000000000a', 'restaurant.update', 'restaurant'),
  ('20000000-0000-4000-8000-00000000000b', 'restaurant.update', 'restaurant');

-- ---------------------------------------------------------------- manager of A
select pg_temp.act_as('00000000-0000-4000-8000-0000000000a2',
  '[{"restaurant_id": "20000000-0000-4000-8000-00000000000a", "role": "manager"}]');

select results_eq($$ select slug from public.restaurants $$, array['cafe-a'], 'manager A sees only restaurant A');
select is((select count(*) from public.memberships), 3::bigint, 'manager A sees the 3 memberships of A');
select results_eq($$ select name from public.organizations $$, array['Org A'], 'manager A sees only organization A');
select is((select count(*) from public.subscriptions), 1::bigint, 'manager A sees only the subscription of A');
select is((select count(*) from public.feature_overrides), 1::bigint, 'manager A sees only overrides of A');
select results_eq($$ select old_slug from public.slug_redirects $$, array['old-cafe-a'], 'manager A sees only redirects of A');
select is((select count(*) from public.audit_logs), 1::bigint, 'manager A sees only the audit log of A');
select is((select count(*) from public.plans), 4::bigint, 'signed-in users read the public plan catalogue');
select ok((select count(*) from public.reserved_slugs) > 0, 'signed-in users read reserved slugs');

select is(
  pg_temp.affected($$ update public.restaurants set name = 'Hacked' where slug = 'cafe-b' $$),
  0, 'manager A cannot update restaurant B');
select is(
  pg_temp.affected($$ update public.restaurants set name = 'Café A+' where slug = 'cafe-a' $$),
  1, 'manager A updates restaurant A');
select throws_ok($$ update public.restaurants set status = 'suspended' where slug = 'cafe-a' $$,
  '42501', null, 'manager cannot change the restaurant status column');
select throws_ok($$ select pin_hmac from public.memberships $$,
  '42501', null, 'pin_hmac is never readable by clients');
select throws_ok(
  $$ insert into public.memberships (restaurant_id, user_id, role)
     values ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000ff', 'owner') $$,
  '42501', null, 'a manager cannot create an owner membership');
select throws_ok(
  $$ insert into public.memberships (restaurant_id, user_id, role)
     values ('20000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000ff', 'waiter') $$,
  '42501', null, 'manager A cannot add staff to restaurant B');
select lives_ok(
  $$ insert into public.memberships (restaurant_id, user_id, role)
     values ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000ff', 'waiter') $$,
  'manager A adds a waiter to restaurant A');
select throws_ok(
  $$ insert into public.audit_logs (restaurant_id, action, entity)
     values ('20000000-0000-4000-8000-00000000000a', 'restaurant.update', 'restaurant') $$,
  '42501', null, 'clients cannot write the audit log');
reset role;

-- ---------------------------------------------------------------- waiter of A
select pg_temp.act_as('00000000-0000-4000-8000-0000000000a3',
  '[{"restaurant_id": "20000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select is((select count(*) from public.restaurants), 1::bigint, 'waiter sees their restaurant');
select is((select count(*) from public.memberships), 1::bigint, 'waiter sees only their own membership');
select is((select count(*) from public.subscriptions), 0::bigint, 'waiter cannot see the subscription');
select is((select count(*) from public.audit_logs), 0::bigint, 'waiter cannot see the audit log');
select is(
  pg_temp.affected($$ update public.restaurants set name = 'Nope' where slug = 'cafe-a' $$),
  0, 'waiter cannot update restaurant settings');
reset role;

-- ---------------------------------------------------------------- stranger and anon
select pg_temp.act_as('00000000-0000-4000-8000-0000000000ff', '[]');
select is((select count(*) from public.restaurants), 0::bigint, 'user without membership sees no restaurant');
select is((select count(*) from public.profiles), 1::bigint, 'users read only their own profile');
select throws_ok($$ update public.profiles set platform_role = 'super_admin' $$,
  '42501', null, 'users cannot raise their own platform role');
reset role;

set local role anon;
select throws_ok($$ select * from public.restaurants $$, '42501', null, 'anon has no access to restaurants');
select throws_ok($$ select * from public.memberships $$, '42501', null, 'anon has no access to memberships');
reset role;

-- ---------------------------------------------------------------- platform admin
select pg_temp.act_as('00000000-0000-4000-8000-0000000000ad', '[]', 'super_admin', 'aal1');
select is((select count(*) from public.restaurants), 0::bigint, 'platform role grants nothing without TOTP (aal1)');
reset role;

-- Totals as the table owner sees them: a local database may hold rows from other suites
-- (audit entries are append-only), so "every row" is compared against the real totals.
create temp table platform_totals as
  select (select count(*) from public.restaurants) as restaurants,
         (select count(*) from public.audit_logs) as audit_logs;
grant select on platform_totals to authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-0000000000ad', '[]', 'super_admin', 'aal2');
select is((select count(*) from public.restaurants), (select restaurants from platform_totals), 'super admin with TOTP sees every restaurant');
select is((select count(*) from public.audit_logs), (select audit_logs from platform_totals), 'super admin with TOTP reads the global audit log');
reset role;

-- ---------------------------------------------------------------- audit log is append-only
set local role service_role;
select throws_ok($$ update public.audit_logs set action = 'tampered.action' $$,
  '42501', null, 'even the service role cannot edit audit history');
reset role;

select * from finish();
rollback;
