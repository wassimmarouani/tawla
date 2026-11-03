-- AI usage log (P1-13): tenant isolation, managers only, no client writes (ADR-0025 §6).
-- Tables covered: public.ai_usage
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000aa1', 'ai-manager-a@example.org'),
  ('00000000-0000-4000-8000-000000000aa2', 'ai-waiter-a@example.org');
insert into public.organizations (id, name) values
  ('1a000000-0000-4000-8000-00000000000a', 'Org A'),
  ('1a000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('2a000000-0000-4000-8000-00000000000a', '1a000000-0000-4000-8000-00000000000a', 'ai-rls-a', 'A'),
  ('2a000000-0000-4000-8000-00000000000b', '1a000000-0000-4000-8000-00000000000b', 'ai-rls-b', 'B');
insert into public.ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes) values
  ('2a000000-0000-4000-8000-00000000000a', 'menu_import', 'gemini-2.5-flash', 1000, 200, 5),
  ('2a000000-0000-4000-8000-00000000000b', 'translation', 'gemini-2.5-flash', 500, 300, 3);

select throws_ok(
  $$ insert into public.ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes)
     values ('2a000000-0000-4000-8000-00000000000a', 'chat', 'x', 1, 1, 1) $$,
  '23514', null, 'only known AI features are logged');

set local role anon;
select throws_ok($$ select count(*) from public.ai_usage $$, '42501', null, 'anon cannot read usage');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000aa1',
  '[{"restaurant_id": "2a000000-0000-4000-8000-00000000000a", "role": "manager"}]');
select is((select count(*) from public.ai_usage), 1::bigint, 'manager A reads A usage only');
select throws_ok(
  $$ insert into public.ai_usage (restaurant_id, feature, model, input_tokens, output_tokens, cost_millimes)
     values ('2a000000-0000-4000-8000-00000000000a', 'translation', 'x', 0, 0, 0) $$,
  '42501', null, 'clients cannot write usage');
select throws_ok($$ update public.ai_usage set cost_millimes = 0 $$, '42501', null,
  'clients cannot rewrite costs');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000aa2',
  '[{"restaurant_id": "2a000000-0000-4000-8000-00000000000a", "role": "waiter"}]');
select is((select count(*) from public.ai_usage), 0::bigint, 'a waiter does not read usage');
reset role;

select * from finish();
rollback;
