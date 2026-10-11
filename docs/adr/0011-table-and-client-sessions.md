# ADR-0011 — Separate table sessions and client sessions; anti-abuse rules

- Status: Accepted
- Date: 2026-10-11
- Audit refs: C6, E1, E5, E6, spec §4.5–4.6, §12.1–12.2

## Context

- The spec conflates the table occupancy (shared by several phones, holds the bill) and the per-phone cookie session.
- An unclosed previous session (Basic, or staff forgot) would let the next customers see the previous bill.
- `GET /api/public/table/{token}` creating a session is a side effect on GET. Link-preview bots (WhatsApp, Facebook) open sessions whenever a QR URL is shared.
- A leaked QR photo lets anyone order. The spec's rate limits are ambiguous (per table or per phone) and too strict (30 s).

## Decision

1. **Two tables:**
   - `table_sessions (id, restaurant_id, table_id, public_id, status open|bill_requested|closed, opened_at, last_activity_at, closed_at, closed_by, payment_method, total_snapshot)`. **At most one non-closed session per table**, via a partial unique index.
   - `client_sessions (id, restaurant_id, table_session_id, device_id, created_at, last_seen_at, blocked_until)`. One per phone. The phone holds the signed cookie `__Host-tawla_cs` (jose JWT: `cs`, `ts`, `exp`; HttpOnly, Secure, SameSite=Lax).
2. **GET is safe:** `/t/{token}` only verifies the token and renders the menu. Token routes are `noindex`.
3. **Opening:** on the first meaningful action (add to cart, call waiter, view bill), the page calls `POST /api/public/sessions`. A Turnstile token is required only when the anomaly heuristic fires. The handler reuses the table's open session or opens one, then creates the client session.
4. **Expiry:**
   - table session auto-closes after **90 min of inactivity** (configurable 30–240 min per restaurant), or when staff closes the bill;
   - client cookie expires after 3 h, or when its table session closes;
   - closing emits `session.closed` and phones fall back to read-only.
5. **Bill visibility:** "View my bill" shows the whole table session (the group at the table). Hidden on Basic (ADR-0015).
6. **Leaked QR protection (E5):** staff validation is on by default. When a restaurant enables auto-accept, it applies only after staff accepted the first order of that table session.
7. **Rate limits** (Upstash sliding window; defaults below, overridable in `restaurants.settings`):

| Scope | Default |
|---|---|
| Orders per client session | 1 per 15 s, 20 per hour |
| Orders per table session | 40 per hour |
| Lines per order / quantity per line | 30 / 20 |
| Waiter calls per table session | 1 per 60 s |
| Bill requests per table session | 1 per 60 s |
| Public endpoints per IP | 120 per minute (a café shares one IP) |

8. **Device blocking:** staff can block a client session's device for 24 h (`client_sessions.blocked_until` + device-id cookie). Weak against cookie clearing, which is acceptable because staff validation remains the main defence.
9. Order endpoints check the client cookie and that the order belongs to the cookie's table session (no IDOR on `/api/public/orders/{id}`).

## Consequences

- Shared links and bots never open sessions. Group bills work. Stale sessions expire on their own.
