-- Staff devices, pairing codes, staff sessions, push subscriptions, invitations (P1-11):
-- tenant isolation, roles, hashes never readable, no client writes (ADR-0010, ADR-0022).
-- Tables covered: public.staff_devices, public.device_pairing_codes, public.staff_sessions,
-- public.push_subscriptions, public.staff_invitations
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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
  ('00000000-0000-4000-8000-0000000009a1', 'devices-manager-a@example.org'),
  ('00000000-0000-4000-8000-0000000009a2', 'devices-waiter-a@example.org'),
  ('00000000-0000-4000-8000-0000000009b1', 'devices-manager-b@example.org');
insert into public.organizations (id, name) values
  ('19000000-0000-4000-8000-00000000000a', 'Org A'),
  ('19000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('29000000-0000-4000-8000-00000000000a', '19000000-0000-4000-8000-00000000000a', 'devices-rls-a', 'A'),
  ('29000000-0000-4000-8000-00000000000b', '19000000-0000-4000-8000-00000000000b', 'devices-rls-b', 'B');
insert into public.memberships (id, restaurant_id, user_id, role) values
  ('39000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000009a1', 'manager'),
  ('39000000-0000-4000-8000-0000000000a2', '29000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000009a2', 'waiter'),
  ('39000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000009b1', 'manager');
insert into public.staff_devices (id, restaurant_id, label, mode, token_hash) values
  ('49000000-0000-4000-8000-0000000000a1', '29000000-0000-4000-8000-00000000000a', 'Comptoir', 'fixed', repeat('a', 64)),
  ('49000000-0000-4000-8000-0000000000b1', '29000000-0000-4000-8000-00000000000b', 'Bar', 'mobile', repeat('b', 64));
insert into public.device_pairing_codes (restaurant_id, code_hash, label, mode, expires_at) values
  ('29000000-0000-4000-8000-00000000000a', repeat('c', 64), 'Téléphone', 'mobile', now() + interval '10 minutes'),
  ('29000000-0000-4000-8000-00000000000b', repeat('d', 64), 'Téléphone', 'mobile', now() + interval '10 minutes');
insert into public.staff_sessions (restaurant_id, membership_id, device_id, user_id, expires_at) values
  ('29000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-0000000000a2', '49000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000009a2', now() + interval '12 hours'),
  ('29000000-0000-4000-8000-00000000000b', '39000000-0000-4000-8000-0000000000b1', '49000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000009b1', now() + interval '12 hours');
insert into public.push_subscriptions (restaurant_id, membership_id, device_id, endpoint, p256dh, auth) values
  ('29000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-0000000000a2', '49000000-0000-4000-8000-0000000000a1', 'https://push.example.org/a', repeat('p', 20), repeat('k', 10)),
  ('29000000-0000-4000-8000-00000000000b', '39000000-0000-4000-8000-0000000000b1', '49000000-0000-4000-8000-0000000000b1', 'https://push.example.org/b', repeat('p', 20), repeat('k', 10));
insert into public.staff_invitations (restaurant_id, email, role) values
  ('29000000-0000-4000-8000-00000000000a', 'new-waiter@example.org', 'waiter'),
  ('29000000-0000-4000-8000-00000000000b', 'new-waiter@example.org', 'waiter');

-- ---------------------------------------------------------------- integrity
select throws_ok(
  $$ insert into public.staff_sessions (restaurant_id, membership_id, device_id, user_id, expires_at)
     values ('29000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-0000000000b1',
       '49000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000009b1', now() + interval '1 hour') $$,
  '23503', null, 'a session cannot use another restaurant''s membership');
select throws_ok(
  $$ insert into public.push_subscriptions (restaurant_id, membership_id, device_id, endpoint, p256dh, auth)
     values ('29000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-0000000000a1',
       '49000000-0000-4000-8000-0000000000b1', 'https://push.example.org/x', repeat('p', 20), repeat('k', 10)) $$,
  '23503', null, 'a subscription cannot use another restaurant''s device');
select throws_ok(
  $$ insert into public.staff_invitations (restaurant_id, email, role)
     values ('29000000-0000-4000-8000-00000000000a', 'new-waiter@example.org', 'counter') $$,
  '23505', null, 'one pending invitation per address and restaurant');
select throws_ok(
  $$ insert into public.staff_invitations (restaurant_id, email, role)
     values ('29000000-0000-4000-8000-00000000000a', 'owner@example.org', 'owner') $$,
  '23514', null, 'nobody is invited as owner');
select throws_ok(
  $$ insert into public.push_subscriptions (restaurant_id, membership_id, endpoint, p256dh, auth)
     values ('29000000-0000-4000-8000-00000000000a', '39000000-0000-4000-8000-0000000000a1',
       'http://push.example.org/plain', repeat('p', 20), repeat('k', 10)) $$,
  '23514', null, 'push endpoints are https only');

-- ---------------------------------------------------------------- anon
set local role anon;
select throws_ok($$ select count(*) from public.staff_devices $$, '42501', null, 'anon cannot read devices');
select throws_ok($$ select count(*) from public.staff_invitations $$, '42501', null, 'anon cannot read invitations');
reset role;

-- ---------------------------------------------------------------- manager A
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1',
  '[{"restaurant_id": "29000000-0000-4000-8000-00000000000a", "role": "manager"}]');
select is((select count(*) from public.staff_devices), 1::bigint, 'manager A reads A devices only');
select is((select count(*) from public.device_pairing_codes), 1::bigint, 'manager A reads A codes only');
select is((select count(*) from public.staff_sessions), 1::bigint, 'manager A reads A sessions only');
select is((select count(*) from public.push_subscriptions), 1::bigint, 'manager A reads A subscriptions only');
select is((select count(*) from public.staff_invitations), 1::bigint, 'manager A reads A invitations only');
select throws_ok($$ select token_hash from public.staff_devices $$, '42501', null,
  'device token hashes are never readable');
select throws_ok($$ select code_hash from public.device_pairing_codes $$, '42501', null,
  'pairing code hashes are never readable');
select throws_ok(
  $$ update public.staff_devices set revoked_at = now() $$, '42501', null,
  'clients cannot revoke devices directly (server only)');
select throws_ok(
  $$ insert into public.staff_invitations (restaurant_id, email, role)
     values ('29000000-0000-4000-8000-00000000000a', 'x@example.org', 'waiter') $$,
  '42501', null, 'clients cannot create invitations directly');
reset role;

-- ---------------------------------------------------------------- waiter A
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a2',
  '[{"restaurant_id": "29000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select is((select count(*) from public.staff_devices), 0::bigint, 'a waiter does not list devices');
select is((select count(*) from public.staff_sessions), 1::bigint, 'a waiter reads their own session');
select is((select count(*) from public.push_subscriptions), 1::bigint, 'a waiter reads their own subscription');
select is((select count(*) from public.staff_invitations), 0::bigint, 'a waiter does not read invitations');
reset role;

select * from finish();
rollback;
