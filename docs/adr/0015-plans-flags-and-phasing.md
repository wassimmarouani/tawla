# ADR-0015 — Plan contents, feature-flag resolution, and Phase 1 scope

- Status: Accepted
- Date: 2026-10-11
- Audit refs: B1–B7, Q1, Q4a, spec §2, §17

## Context

Basic sells "call waiter / bill / one-click out-of-stock", which needs a staff receiver. Yet real time, zones and the staff app were all scheduled for Phase 2. Several plan cells contradict each other: "View my bill" and feedback on Basic, the trial on a plan that doesn't exist yet, AI translation built in Phase 1 but not sold in Basic.

## Decision

1. **Effective feature check:** `isEnabled(key, restaurant) = override ?? planDefault`, then `AND` with the restaurant's own setting where one exists (e.g. ordering can be turned off). Overrides expire through `feature_overrides.expires_at`. Implemented in `src/lib/flags/` as a pure function plus a per-request cached loader. **Always checked server-side** (route handlers, actions, RLS for data-bearing features).
2. **Feature keys (v1):**
   - `menu`, `branding`, `multilingual`, `service_requests`, `availability_toggle`;
   - `ai_import`, `ai_translate` (with monthly quota, ADR-0025);
   - `ordering`, `order_tracking`, `staff_zones`, `staff_pin`;
   - `kitchen_display`, `stats_sales`, `stats_advanced`, `ai_descriptions`, `ai_insights`;
   - `promotions`, `printing`, `multi_site`;
   - `powered_by_badge` (on for Basic).
3. **Basic includes:**
   - menu, branding, AR/FR/EN;
   - service requests (call waiter, bill request with payment method);
   - availability toggle, menu-view counter, satisfaction feedback;
   - **AI import and AI translation within a monthly quota** (Q4a);
   - 1 staff account (excluding owner).

   Basic does **not** include "View my bill" (no orders exist). Feedback is offered once the bill request is marked handled.
4. **Minimal staff screen moves to Phase 1** (Q1):
   - device pairing;
   - email login (manager or the single Basic staff account);
   - "Start service" screen (audio unlock, Wake Lock, push subscription, self-test);
   - live list of service requests with claim/done;
   - availability toggle;
   - Web Push (Android, and iOS when installed to the home screen).

   PIN, zones and the kanban board stay in Phase 2.
5. **Data collected from Phase 1** even where the UI comes later: `menu_views` (aggregated nightly), `feedbacks`, service request timings.
6. **Pilots and trial:** pilots get a plan assigned by Super Admin (Phase 1 uses a minimal admin page or a seed script, ADR-0024). The self-serve 14-day Pro trial starts with Phase 2, when Pro exists.
7. **Excel/CSV import** moves to Phase 2.
8. **Plan catalogue** (`plans.features[]`, `plans.limits`, `plans.ai_monthly_cap_millimes`) is seeded by migration and editable by Super Admin later (Phase 3).

## Consequences

- The Phase 1 deliverable is a sellable Basic: menu + service requests with real-time staff notification + AI-assisted onboarding.
- Phase 1 grows by the minimal staff screen, roughly 1 week. Accepted by the product owner.
