-- Sessions, service requests and friends: isolation, roles, jobs (P1-09, ADR-0003, ADR-0011).
-- Tables covered: public.table_sessions, public.client_sessions, public.service_requests,
-- public.idempotency_keys, public.menu_views, public.menu_view_daily, public.feedbacks,
-- public.notification_receipts, public.notification_incidents
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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

-- ---------------------------------------------------------------- fixtures (A and B)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000009a1', 'sessions-waiter-a@example.org'),
  ('00000000-0000-4000-8000-0000000009a2', 'sessions-manager-a@example.org'),
  ('00000000-0000-4000-8000-0000000009b1', 'sessions-manager-b@example.org');
insert into public.organizations (id, name) values
  ('19000000-0000-4000-8000-00000000000a', 'Org A'),
  ('19000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('29000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', 'sessions-rls-a', 'A'),
  ('29000000-0000-4000-8000-00000000000b', '19000000-0000-4000-8000-00000000000b', 'sessions-rls-b', 'B');
insert into public.tables (id, restaurant_id, number) values
  ('49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 1),
  ('49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 1);
insert into public.table_sessions (id, restaurant_id, table_id, public_id, last_activity_at) values
  ('59000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', '49000000-0000-4000-8000-0000000000a1', 'sessionPublicIdAaaaaaa', now() - interval '3 hours'),
  ('59000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', '49000000-0000-4000-8000-0000000000b1', 'sessionPublicIdBbbbbbb', now());
insert into public.client_sessions (id, restaurant_id, table_session_id, device_id) values
  ('69000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-0000000000a1', 'deviceAdeviceAdeviceA');
insert into public.service_requests (restaurant_id, table_session_id, client_session_id, kind) values
  ('29000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-0000000000a1', '69000000-0000-4000-8000-0000000000a1', 'waiter'),
  ('29000000-0000-4000-8000-00000000000b', '59000000-0000-4000-8000-0000000000b1', null, 'bill');
insert into public.idempotency_keys (restaurant_id, scope, key, response) values
  ('29000000-0000-4000-8000-00000000000a', 'service_request', 'key-aaaa-1', '{}');
insert into public.menu_views (restaurant_id, table_id) values
  ('29000000-0000-4000-8000-00000000000a', '49000000-0000-4000-8000-0000000000a1'),
  ('29000000-0000-4000-8000-00000000000b', null);
insert into public.feedbacks (restaurant_id, rating) values
  ('29000000-0000-4000-8000-00000000000a', 5), ('29000000-0000-4000-8000-00000000000b', 2);
insert into public.notification_receipts (restaurant_id, event_id, event_kind, user_id, device_id) values
  ('29000000-0000-4000-8000-00000000000a', gen_random_uuid(), 'request', '00000000-0000-4000-8000-0000000009a1', 'deviceAdeviceAdeviceA');
insert into public.notification_incidents (restaurant_id, event_id, event_kind, kind) values
  ('29000000-0000-4000-8000-00000000000a', gen_random_uuid(), 'request', 'unclaimed');

-- ---------------------------------------------------------------- integrity
select throws_ok(
  $$ insert into public.table_sessions (restaurant_id, table_id)
     values ('29000000-0000-4000-8000-00000000000b', '49000000-0000-4000-8000-0000000000b1') $$,
  '23505', null, 'one open session per table');
select throws_ok(
  $$ insert into public.service_requests (restaurant_id, table_session_id, kind)
     values ('29000000-0000-4000-8000-00000000000b', '59000000-0000-4000-8000-0000000000a1', 'waiter') $$,
  '23503', null, 'a request cannot point at another restaurant''s session');
select throws_ok(
  $$ insert into public.service_requests (restaurant_id, table_session_id, kind, payment_method)
     values ('29000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-0000000000a1', 'waiter', 'cash') $$,
  '23514', null, 'only bill requests carry a payment method');

-- ---------------------------------------------------------------- anonymous
set local role anon;
select throws_ok($$ select count(*) from public.table_sessions $$, '42501', null, 'anon cannot read sessions');
select throws_ok($$ select count(*) from public.service_requests $$, '42501', null, 'anon cannot read requests');
select ok(public.can_receive_topic('s:sessionPublicIdAaaaaaa'), 'anon receives its table session topic');
select ok(not public.can_receive_topic('s:unknown-session-id-000'), 'unknown session topics are refused');
reset role;

-- ---------------------------------------------------------------- waiter A
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1',
  '[{"restaurant_id": "29000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select is((select count(*) from public.table_sessions), 1::bigint, 'waiter A reads A sessions only');
select is((select count(*) from public.service_requests), 1::bigint, 'waiter A reads A requests only');
select is((select count(*) from public.notification_receipts), 1::bigint, 'waiter A reads A receipts');
select is((select count(*) from public.feedbacks), 0::bigint, 'waiter A cannot read feedback');
select is((select count(*) from public.menu_views), 0::bigint, 'waiter A cannot read view stats');
select throws_ok($$ select count(*) from public.client_sessions $$, '42501', null, 'staff cannot read client sessions');
select throws_ok($$ select count(*) from public.idempotency_keys $$, '42501', null, 'staff cannot read idempotency keys');
select throws_ok(
  $$ insert into public.service_requests (restaurant_id, table_session_id, kind)
     values ('29000000-0000-4000-8000-00000000000a', '59000000-0000-4000-8000-0000000000a1', 'waiter') $$,
  '42501', null, 'staff cannot create requests directly');
reset role;

-- ---------------------------------------------------------------- manager A
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a2',
  '[{"restaurant_id": "29000000-0000-4000-8000-00000000000a", "role": "manager"}]');
select is((select count(*) from public.feedbacks), 1::bigint, 'manager A reads A feedback only');
select is((select count(*) from public.menu_views), 1::bigint, 'manager A reads A views only');
select is((select count(*) from public.notification_incidents), 1::bigint, 'manager A reads A incidents');
select is((select count(*) from public.menu_view_daily), 0::bigint, 'manager A reads no B daily views');
reset role;

-- ---------------------------------------------------------------- jobs
select is(public.close_idle_table_sessions(), 1, 'the idle A session closes, the active B one stays');
select is((select status::text from public.table_sessions where id = '59000000-0000-4000-8000-0000000000a1'),
  'closed', 'idle session closed');
select lives_ok($$ select public.aggregate_menu_views() $$, 'menu views aggregate');

select * from finish();
rollback;
