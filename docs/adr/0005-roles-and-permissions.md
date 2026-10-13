# ADR-0005 — Eight roles, Support model, plan limits on staff

- Status: Accepted
- Date: 2026-10-11
- Audit refs: A1, A5, B6

## Context

The spec announces "7 roles" but describes 8. The Support role has no permissions defined ("lecture + actions limitées"). The meaning of "1 staff account" on Basic is unclear.

## Decision

1. **8 roles:**
   - platform: `super_admin`, `support` (`profiles.platform_role`);
   - tenant: `owner`, `manager`, `counter`, `waiter`, `station` (enum `membership_role` on `memberships`);
   - the anonymous `client` (not a DB role; a client session, ADR-0011).
2. The permission matrix in `docs/spec/01-roles-permissions.md` is the reference. It is implemented once in `src/lib/auth/permissions.ts` (re-exported by `@/features/auth`) as a pure function `can(role, action, context)`. It is unit-tested against the full matrix and mirrored by RLS.
3. **Support:**
   - read-only on all tenants by default;
   - writes only inside an **impersonation session** started explicitly from the Super Admin console: reason required, maximum 60 minutes, visible banner, every action logged in `audit_logs` with `impersonated_by`;
   - never sees PIN hashes or secrets;
   - Super Admin and Support must use TOTP 2FA, enforced by restrictive RLS policies on `(select auth.jwt()->>'aal') = 'aal2'`.
4. **Plan limits count non-owner memberships only.** Basic allows 1 extra staff account; Pro up to 10; Premium unlimited. Limits live in `plans.limits` and are enforced server-side when a membership is created or reactivated.
5. A user can hold different roles in different restaurants. Within one restaurant they have a single active membership.

## Amendment — 2026-10-13 (P1-04)

`can()` moved to `src/lib/auth/permissions.ts`: it is pure, cross-cutting infrastructure, and pure services in other features (back-office navigation) must import it without pulling the auth feature's Server Actions into their module graph. `@/features/auth` still re-exports it, and its 100 % matrix test moved with it.

## Consequences

- One permission function, tested exhaustively, used by the UI (hide), the server (refuse) and mirrored by the database (RLS).
