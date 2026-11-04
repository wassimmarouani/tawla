-- P1-13 — AI usage log (ADR-0025 §6, ADR-0030 §5): one row per successful provider call, used
-- for monthly quotas and cost per establishment. Written by src/server/admin only.
-- RLS coverage in supabase/tests/ai_usage_tenancy.test.sql.

create table public.ai_usage (
  id uuid primary key default public.uuid_v7(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  feature text not null check (feature in ('menu_import', 'translation')),
  model text not null check (char_length(model) between 1 and 80),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  cost_millimes integer not null check (cost_millimes >= 0),
  -- Photos imported or items translated (quota units).
  units integer not null default 1 check (units >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_usage_restaurant_month_idx on public.ai_usage (restaurant_id, created_at desc);

revoke all on public.ai_usage from anon;
revoke insert, update, delete on public.ai_usage from authenticated;

alter table public.ai_usage enable row level security;

create policy "ai_usage: managers read" on public.ai_usage for select to authenticated
  using ((select public.has_restaurant_role(restaurant_id,
    array['owner', 'manager']::public.membership_role[])));
create policy "ai_usage: platform read" on public.ai_usage for select to authenticated
  using ((select public.is_platform_admin()));
