# 01 — Roles and permissions

> Domain spec. Source: original spec §3, amended by ADR-0005, 0006, 0010. ADRs win on conflict.

## Roles (8)

| Role        | Where stored                           | Scope                                                                  | Typical device         | Responsibilities                                                                         |
| ----------- | -------------------------------------- | ---------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| Super Admin | `profiles.platform_role = super_admin` | Whole platform                                                         | Desktop                | Creates venues, manages plans and flags, global metrics. TOTP mandatory                  |
| Support     | `profiles.platform_role = support`     | Whole platform, read-only; writes only inside an impersonation session | Desktop                | Helps managers. Impersonation ≤ 60 min, reason required, banner, audited. TOTP mandatory |
| Owner       | `memberships.role = owner`             | Their restaurants                                                      | Desktop, tablet, phone | Everything incl. subscription                                                            |
| Manager     | `memberships.role = manager`           | One restaurant                                                         | Tablet, phone          | Menu, tables, staff, orders, stats, settings; no billing                                 |
| Counter     | `memberships.role = counter`           | One restaurant                                                         | Fixed tablet           | All orders, statuses, bills                                                              |
| Waiter      | `memberships.role = waiter`            | One restaurant, their zones                                            | Phone                  | Orders and requests of their zones; mark served                                          |
| Station     | `memberships.role = station`           | One restaurant, their station                                          | Tablet / TV            | Items to prepare; mark ready (Premium)                                                   |
| Client      | Client session cookie (not a DB role)  | One table session                                                      | Own phone              | Browse, cart, order, call waiter                                                         |

- The role lives on the membership (user ↔ restaurant), not on the user. A user can have different roles in different restaurants, but only one active membership per restaurant.
- Staff without email use **shadow users** and log in with name + PIN on a **paired device** (ADR-0010, Phase 2). In Phase 1, staff use email login on a paired device.

## Permission matrix

| Action                                            | Owner | Manager | Counter | Waiter                               | Station | Client      |
| ------------------------------------------------- | ----- | ------- | ------- | ------------------------------------ | ------- | ----------- |
| Open the back-office (`/dashboard`)               | ✓     | ✓       | —       | —                                    | —       | —           |
| View public menu                                  | ✓     | ✓       | ✓       | ✓                                    | ✓       | ✓           |
| Create / edit categories, products, options       | ✓     | ✓       | —       | —                                    | —       | —           |
| Mark product (un)available                        | ✓     | ✓       | ✓       | ✓                                    | ✓       | —           |
| Manage tables, zones, QR codes                    | ✓     | ✓       | —       | —                                    | —       | —           |
| Manage staff accounts and devices                 | ✓     | ✓       | —       | —                                    | —       | —           |
| Place an order                                    | ✓     | ✓       | ✓       | ✓                                    | —       | ✓           |
| Accept / reject an order                          | ✓     | ✓       | ✓       | ✓ own zones (any zone if unassigned) | —       | —           |
| Advance item status (preparing, ready)            | ✓     | ✓       | ✓       | —                                    | ✓       | —           |
| Mark order served                                 | ✓     | ✓       | ✓       | ✓                                    | —       | —           |
| Accepted → served shortcut (waiters-only routing) | ✓     | ✓       | ✓       | ✓                                    | —       | —           |
| Cancel a pending order                            | ✓     | ✓       | ✓       | —                                    | —       | ✓ own order |
| Cancel an accepted / preparing order (reason)     | ✓     | ✓       | ✓       | —                                    | —       | —           |
| Claim / complete a service request                | ✓     | ✓       | ✓       | ✓                                    | —       | —           |
| Close a table's bill                              | ✓     | ✓       | ✓       | ✓                                    | —       | —           |
| View statistics                                   | ✓     | ✓       | —       | —                                    | —       | —           |
| Edit settings and branding                        | ✓     | ✓       | —       | —                                    | —       | —           |
| Manage subscription and billing                   | ✓     | —       | —       | —                                    | —       | —           |

## Enforcement (three levels, always)

1. **UI** hides actions the role can't do (`can()`).
2. **Server** refuses: every route handler and Server Action calls `can(role, action, ctx)` from `src/lib/auth/permissions.ts` (re-exported by `@/features/auth`) and the feature flag check.
3. **Database** RLS mirrors the matrix. Tests cover every cell (ADR-0003).

Sensitive actions are written to `audit_logs`: cancellations, deletions, price changes, impersonation, device pairing and revocation, PIN reset, plan or flag changes.

## Plan limits

Non-owner memberships: Basic 1, Pro 10, Premium unlimited. Enforced server-side on create and reactivate (`PLAN_LIMIT_REACHED`).
