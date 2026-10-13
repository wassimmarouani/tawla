-- Realtime topic authorization rules (ADR-0008). WebSocket behaviour is covered end to end by
-- src/lib/realtime/realtime-authorization.int.test.ts; this file checks the decision function.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create function pg_temp.act_as(role_name text, memberships jsonb default '[]')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'role', role_name, 'memberships', memberships)::text, true);
  perform set_config('role', role_name, true);
end;
$$;

insert into public.organizations (id, name) values ('13000000-0000-4000-8000-000000000001', 'RT');
insert into public.restaurants (id, organization_id, slug, name, public_id, status) values
  ('23000000-0000-4000-8000-00000000000a', '13000000-0000-4000-8000-000000000001', 'rt-a', 'A', 'pub-a-0000000000000000', 'active'),
  ('23000000-0000-4000-8000-00000000000b', '13000000-0000-4000-8000-000000000001', 'rt-b', 'B', 'pub-b-0000000000000000', 'suspended');

-- anonymous customer
select pg_temp.act_as('anon');
select ok(public.can_receive_topic('m:pub-a-0000000000000000'), 'anon receives the menu topic of a live restaurant');
select ok(not public.can_receive_topic('m:pub-b-0000000000000000'), 'suspended restaurants publish nothing');
select ok(not public.can_receive_topic('m:unknown'), 'unknown capability ids are refused');
select ok(not public.can_receive_topic('r:23000000-0000-4000-8000-00000000000a:requests'), 'anon never receives staff topics');
reset role;

-- waiter of A
select pg_temp.act_as('authenticated', '[{"restaurant_id": "23000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select ok(public.can_receive_topic('r:23000000-0000-4000-8000-00000000000a:requests'), 'a waiter receives service requests of their restaurant');
select ok(not public.can_receive_topic('r:23000000-0000-4000-8000-00000000000a:orders'), 'a waiter does not receive the counter orders topic');
select ok(not public.can_receive_topic('r:23000000-0000-4000-8000-00000000000b:requests'), 'no access to another restaurant');
select ok(not public.can_receive_topic('r:not-a-uuid:requests'), 'malformed restaurant ids are refused without error');
select ok(not public.can_receive_topic('x:anything'), 'unknown topic kinds are refused');
reset role;

-- counter of A
select pg_temp.act_as('authenticated', '[{"restaurant_id": "23000000-0000-4000-8000-00000000000a", "role": "counter"}]');
select ok(public.can_receive_topic('r:23000000-0000-4000-8000-00000000000a:orders'), 'the counter receives the orders topic');
reset role;

select ok(
  not has_function_privilege('authenticated', 'public.broadcast(text, text, jsonb)', 'execute'),
  'clients cannot call the server-side publisher');

select * from finish();
rollback;
