-- Local demo data (P0-12). Runs on `pnpm db:reset` / first `pnpm db:start`; never in hosted
-- environments. Fixed ids so links, tests and screenshots stay stable.
-- Accounts and URLs are mirrored in tooling/demo/demo.ts (checked by demo.test.ts) and printed by
-- `pnpm db:reset`. The password is a local development credential, not a secret.

-- ---------------------------------------------------------------------------- accounts
-- GoTrue scans token columns as strings: they must be '' rather than NULL.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', account.id, 'authenticated', 'authenticated',
  account.email, extensions.crypt('Tawla-demo-2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('full_name', account.full_name, 'locale', account.locale),
  now(), now(), '', '', '', ''
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'owner@demo.tawla.local', 'Leïla Trabelsi', 'fr'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'manager@demo.tawla.local', 'Karim Jaziri', 'fr'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'counter@demo.tawla.local', 'Comptoir El Bahja', 'ar'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'owner@pizzeria.tawla.local', 'Marco Ferchichi', 'fr')
) as account (id, email, full_name, locale);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004'
);

-- ---------------------------------------------------------------------------- tenants
insert into public.organizations (id, name) values
  ('a0000000-0000-4000-8000-000000000001', 'Café El Bahja SARL'),
  ('a0000000-0000-4000-8000-000000000002', 'Pizzeria Test');

-- Café El Bahja: Mon–Fri 07:00–23:00, Saturday overnight 08:00–02:00, Sunday 08:00–22:00.
insert into public.restaurants (
  id, organization_id, slug, public_id, name, type, default_locale, opening_schedule
) values (
  'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  'cafe-el-bahja', 'demoElBahjaPublicId-01', 'Café El Bahja', 'cafe', 'fr',
  '{
    "weekly": [
      {"day": 1, "ranges": [{"from": "07:00", "to": "23:00"}]},
      {"day": 2, "ranges": [{"from": "07:00", "to": "23:00"}]},
      {"day": 3, "ranges": [{"from": "07:00", "to": "23:00"}]},
      {"day": 4, "ranges": [{"from": "07:00", "to": "23:00"}]},
      {"day": 5, "ranges": [{"from": "07:00", "to": "23:00"}]},
      {"day": 6, "ranges": [{"from": "08:00", "to": "02:00"}]},
      {"day": 7, "ranges": [{"from": "08:00", "to": "22:00"}]}
    ],
    "exceptions": []
  }'::jsonb
), (
  'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
  'pizzeria-test', 'demoPizzeriaPublicId-02', 'Pizzeria Test', 'restaurant', 'fr',
  '{
    "weekly": [
      {"day": 2, "ranges": [{"from": "12:00", "to": "15:00"}, {"from": "19:00", "to": "23:30"}]},
      {"day": 3, "ranges": [{"from": "12:00", "to": "15:00"}, {"from": "19:00", "to": "23:30"}]},
      {"day": 4, "ranges": [{"from": "12:00", "to": "15:00"}, {"from": "19:00", "to": "23:30"}]},
      {"day": 5, "ranges": [{"from": "12:00", "to": "15:00"}, {"from": "19:00", "to": "23:30"}]},
      {"day": 6, "ranges": [{"from": "19:00", "to": "24:00"}]},
      {"day": 7, "ranges": [{"from": "19:00", "to": "23:00"}]}
    ],
    "exceptions": []
  }'::jsonb
);

insert into public.memberships (restaurant_id, user_id, role, display_name) values
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', 'Leïla'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'manager', 'Karim'),
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'counter', 'Comptoir'),
  ('b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', 'owner', 'Marco');

-- Basic for both; the demo café also shows Pro features through Super Admin overrides.
insert into public.subscriptions (restaurant_id, plan_id, status)
select restaurant.id, plan.id, 'active'
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid),
  ('b0000000-0000-4000-8000-000000000002'::uuid)
) as restaurant (id)
cross join public.plans plan
where plan.code = 'basic';

insert into public.feature_overrides (restaurant_id, feature_key, enabled, reason) values
  ('b0000000-0000-4000-8000-000000000001', 'ordering', true, 'Démo commerciale'),
  ('b0000000-0000-4000-8000-000000000001', 'order_tracking', true, 'Démo commerciale'),
  ('b0000000-0000-4000-8000-000000000001', 'stats_sales', true, 'Démo commerciale');
