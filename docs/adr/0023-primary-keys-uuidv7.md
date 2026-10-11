# ADR-0023 — UUIDv7 primary keys through a SQL function (Postgres 17)

- Status: Accepted
- Date: 2026-10-11
- Audit refs: T12, spec §10.1

## Context

- The spec wants time-sortable UUIDv7 keys.
- Native `uuidv7()` arrives in Postgres 18. **Supabase runs Postgres 17**: it's the platform default, and PG 18 is not available on the platform, the CLI or self-hosted as of 2026-10.
- `pg_uuidv7` is not in Supabase's curated extension list.

## Decision

1. Migration `0001` creates `public.uuid_v7()`, a pure SQL implementation of RFC 9562 UUIDv7 built on `gen_random_uuid()` and `clock_timestamp()`. All tables use `default public.uuid_v7()`.
2. Tests:
   - pgTAP checks version and variant bits, monotonic ordering inside a transaction, and uniqueness over 100k generations;
   - Vitest checks that the TS `uuidv7` npm package and the SQL function produce compatible, ordered ids (used for client-generated idempotency keys).
3. `supabase/config.toml` sets `[db] major_version = 17` to match hosted.
4. `auth.users` ids stay Supabase's own (v4). `profiles.id` mirrors them.
5. When Supabase ships PG 18, a migration switches the function body to `select uuidv7()`. Callers don't change.

## Consequences

- Time-ordered keys today, with a one-line path to native.

## Sources

- https://github.com/orgs/supabase/discussions/42681
- https://github.com/supabase/postgres/releases
- https://supabase.com/docs/guides/local-development/cli/config
- https://supabase.com/docs/guides/database/extensions
