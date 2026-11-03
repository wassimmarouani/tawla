# ADR-0007 — Notification routing fallbacks, "Start service" screen, receipt acks

- Status: Accepted
- Date: 2026-10-11
- Audit refs: A4, D5, D6

## Context

- In "waiters only" mode, an order for a zone with no waiter assigned reaches nobody.
- Browsers block audio until the user interacts with the page, so the first order of the day would arrive silently.
- Web Push is best-effort (FCM/APNs) and locked phones drop the WebSocket. Milestone 2's "zero missed notifications" can't be measured without delivery tracking.

## Decision

1. **Routing fallback.** Recipients are computed by a pure function `resolveRecipients(order|request, routingMode, assignments, onlineDevices)`. When the table's zone has no waiter assigned for the current business day, the order goes to **all active waiters + counter devices + managers on duty**. Unit-tested for every routing mode × zone state.
2. **"Start service" screen.** Mandatory on every staff device at the start of a shift. The tap:
   - unlocks audio (plays a silent buffer) and requests the Screen Wake Lock (fixed devices);
   - checks notification permission and subscribes to push;
   - shows a connectivity self-test (Realtime connected, push test received).

   The staff app refuses to show the live screen until this is done. A persistent indicator shows green/orange/red connection state.

3. **Receipt acks.** Each staff client sends an ack for every order or request event it renders: `POST /api/staff/acks` (batched, idempotent). The server stores `notification_receipts (event_id, membership_id, device_id, received_at)`.
4. **Escalation.** An order still `pending` after the threshold (default 2 min, configurable), or with **no ack from any recipient within 15 s**, triggers escalation:
   - second sound plus push to the manager or owner;
   - a `notification_incidents` row (used for the Milestone 2 metrics).

   Run by the cron mechanism in ADR-0009, plus a client-side timer on the counter screen when it's open.

5. **Source of truth:** the counter tablet (fixed, Wake Lock, foreground WebSocket). Push is the secondary channel for waiters' phones.
6. **Latency metric:** `notification_receipts.received_at - orders.created_at`, with p95 shown on the Super Admin dashboard (Milestone 2: < 2 s p95).

## Consequences

- "Lost order" becomes a measurable, alerting condition instead of an assumption.
- A small table write per ack. Negligible at expected volumes, prunable after 30 days.

## Amendment — 2026-11-03 (P1-12): Basic service requests

- **Recipients on Basic:** every active member's devices (no zones). Realtime goes to `r:{restaurant}:requests`; Web Push goes to every subscription of the venue after the customer's response (`after()`), tagged with the request id so a replayed request replaces its notification.
- **Acks:** the live screen acks every request it renders (`POST /api/staff/acks`, batched every 500 ms). The E2E journey asserts call → first ack < 2 s.
- **Claim / done:** conditional updates (`where status = 'open'` / `in ('open', 'claimed')`); the loser gets 409 `ORDER_STATE_CONFLICT` with `reason` and the claimer's name, and the request leaves that screen. A done bill request closes the table session on Basic (the table's phones get the feedback card).
- **Escalation:** `POST /api/cron/escalations` (bearer `CRON_SECRET`), called every 15 s by `public.call_app_job('escalations')` through pg_net when `app.settings.cron_base_url` and the Vault secret `cron_secret` are set. It creates `unclaimed` (2 min) and `no_ack` (15 s) incidents once each and pushes owners and managers. Handling a request resolves its incidents.
