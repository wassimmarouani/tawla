# ADR-0004 — Tenancy model and schema conventions

- Status: Accepted
- Date: 2026-10-11
- Audit refs: C1, C2, C10, C11

## Context

- The spec says every business table has `restaurant_id`, yet `options`, `product_option_groups`, `order_items`, `order_events`, `staff_zone_assignments`, `price_history` and `push_subscriptions` don't.
- A custom `users` table conflicts with Supabase's `auth.users`.
- Chains (Premium) with a shared menu will need a level above the restaurant. Adding it later is a painful migration.
- Soft delete (`deleted_at`) conflicts with plain unique constraints.

## Decision

1. **`restaurant_id uuid not null` on every tenant-scoped table**, including child tables. Consistency is enforced with **composite foreign keys**: the parent has `unique (restaurant_id, id)`, the child has `foreign key (restaurant_id, parent_id) references parent (restaurant_id, id)`. A child can never point to another tenant's parent. RLS policies need no joins.
2. **`organizations`** table now (`id, name, created_at…`). `restaurants.organization_id not null`. In v1 each self-serve sign-up creates one organization with one restaurant. Billing stays **per restaurant** (`subscriptions.restaurant_id`). Organization-level roles arrive with chains (Phase 4). Until then the owner role lives on `memberships` per restaurant.
3. **`profiles`** (`id uuid primary key references auth.users on delete cascade`, `full_name`, `phone`, `locale`, `platform_role`), instead of a `users` table. `platform_role` is an enum: `none | super_admin | support`.
4. **Conventions:**
   - plural snake_case table names;
   - `id uuid primary key default uuid_v7()` (ADR-0023);
   - `created_at timestamptz not null default now()`, plus `updated_at` maintained by a shared trigger;
   - `deleted_at timestamptz` on business data;
   - money columns are `integer` millimes with `check (x >= 0)` where it applies; aggregates use `bigint`;
   - multilingual text is `jsonb` with a check constraint that it holds an object with only `fr|ar|en` string keys;
   - statuses are Postgres enums.
5. **Uniqueness with soft delete:** partial unique indexes `… where deleted_at is null` (slug, table number per restaurant, category ordering keys).
6. **Platform tables** (`plans`, `organizations`, `audit_logs` for platform actions) are not tenant-scoped. RLS restricts them to members or platform roles. `audit_logs.restaurant_id` is nullable for platform-level actions.
7. **Every table has RLS enabled, including platform tables.** A migration test fails the build if any table in `public` has `relrowsecurity = false`.

## Consequences

- A few more bytes per row, much simpler and faster policies, and isolation guaranteed by the schema itself.
- Chains become an additive change.
