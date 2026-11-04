# 05 — Super Admin console

> Domain spec. Source: original spec §7, amended by ADR-0005, 0015, 0028. ADRs win on conflict. Built mainly in Phase 3. Phase 1 needs only a minimal plan/flag assignment page or seed script for pilots.

Route `/admin`. Platform staff only (Super Admin, Support), TOTP 2FA mandatory (`aal2` enforced by RLS).

## Venues

- List with search and filters: plan, status (trial, active, past due, suspended), city, sign-up date.
- Venue page: info, subscription, active flags and overrides, users and devices, activity volume, payment history, AI cost.
- Create a venue on behalf of a customer (field sales) and send the owner invitation.
- **Suspend / reactivate:** a suspended venue shows a read-only menu for 7 days, then a neutral page.
- **Impersonation (Support/Super Admin):** reason required, max 60 min, visible banner, every action audited with `impersonated_by`.

## Plans and billing (Phase 3)

- Plan catalogue: monthly and yearly price, included flags, limits (tables, staff, products), AI monthly cap.
- 14-day Pro trial without a card (from Phase 2).
- Manual payments at launch (cash, bank transfer, D17), then a Tunisian gateway (Konnect or Flouci, to be evaluated).
- Automatic numbered PDF invoices with Tunisian legal mentions (tax ID, VAT). Gapless yearly sequence. Legal requirements validated by an accountant (ADR-0028).
- Automatic reminders before due date (J-7, J-1) and after non-payment (J+3, J+7) via cron (ADR-0009).

## Platform steering

- KPIs: MRR, active venues, trial → paid conversion, churn, orders per day, **notification p95 latency and incidents** (ADR-0007), **AI cost per venue** (ADR-0025).
- Global audit log, searchable and filterable.
- Announcements: message shown in every manager's back-office (feature, maintenance).
- Templates: QR tents, menu themes, category templates per business type (café, pizzeria, pastry).
- Flag overrides per venue with expiry.

## Implementation status (P1-15, 2026-11-04)

- **Live:** `/admin` for platform roles with TOTP (`aal2`): venue list and search, venue page (plan, flag overrides with expiry and reason, AI usage by month, recent audit), global audit log. Writes are Super Admin only and audited; Support reads.
- **Override `ai_unlimited`:** lifts a venue's monthly AI limits while active (pilots, support gestures).
- **Later:** suspension and reactivation, impersonation, creating a venue on behalf of a customer, KPIs, announcements, billing (Phase 2–3).
