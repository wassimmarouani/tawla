# 03 — Staff app (PWA)

> Domain spec. Source: original spec §5, amended by ADR-0006, 0007, 0008, 0010, 0015, 0016, 0022. ADRs win on conflict.

The staff app is a PWA under `/staff`, installed on the counter tablet and waiters' phones. Every order or request appears within **2 s (p95)** with the table number, a sound and a vibration.

## Phase split (ADR-0015)
- **Phase 1 (Basic):** paired device, email login, "Start service" screen, live service requests (claim/done), availability toggle, Web Push, connection indicator.
- **Phase 2 (Pro):** PIN login with name picker, zones, counter kanban, waiter order list, floor plan, bills, manual orders, escalation, offline queue.
- **Phase 3 (Premium):** station display.

## Devices and login (ADR-0010)
- **Pairing:** an owner or manager pairs a device from the back-office (QR or 8-character code, valid 10 min). The device gets a long-lived HttpOnly device cookie. Mode `fixed` (counter tablet, TV) or `mobile` (phone).
- **Owner / manager:** email + password (2FA optional).
- **Counter / waiter / station:** tap your name, then enter your 4-digit PIN. Lockout: 5 failures → 5 min; 20 per device per hour → device locked until a manager unlocks it.
- **Sessions:** `fixed` = until end of business day; `mobile` = 12 h. Managers see active sessions and revoke them remotely.
- A connection indicator (green / orange / red) is always visible.

## "Start service" screen (ADR-0007)
Mandatory at each shift start. One tap:
1. unlocks audio;
2. requests the Wake Lock (fixed devices);
3. checks and requests notification permission, subscribes to push;
4. runs a self-test (Realtime connected, test push received).

Waiters pick their zones for the shift (Phase 2).

## Counter screen (Phase 2)
- **Kanban:** New · Accepted / Preparing · Ready · Served (last hour).
- **Card:** table number XXL, order number, time, timer since reception, items with options and notes, total.
- **Timer colours:** normal ≤ 5 min, orange ≤ 10, red beyond (configurable). Colour is never the only signal: icon + label too.
- **One-gesture actions:** Accept · Reject (reason: out of stock, unknown table, closed, other) · Next step. Swipe or button. Optimistic UI with rollback on `ORDER_STATE_CONFLICT` ("already handled by Sami").
- **Floor plan:** grid of tables with state (free, occupied, pending order, bill requested), shown by colour + icon.
- **Bills:** total per table session, close after payment (method recorded).
- **Manual order** for a table (customer without a phone): same UI as the customer menu, `source = staff`.

## Waiter app (Phase 2)
- Orders and requests of **their zones only**, sorted by urgency. If a zone has no waiter today, every waiter sees its events (ADR-0007).
- Waiter call / bill request notifications show the table number and the payment method.
- **"I'm on it"** (claim) is atomic: the request disappears for the other waiters.
- **"Served"** when the order is delivered. In waiters-only routing, a waiter can go accepted → served directly (ADR-0006).
- Takes orders for a customer with the customer-menu UI.

## Zones (Phase 2)
The manager splits the room into zones (Terrace, Room, Upstairs) and assigns tables. Waiters choose zones at shift start (`staff_zone_assignments` per business day).

## Notification routing (setting)

| Mode | Who receives orders | Advice |
|---|---|---|
| Counter only | Counter devices | Small cafés, one prep point |
| Waiters only | Waiters of the table's zone (fallback: all waiters) | Waiter handles everything |
| Counter + waiters (default) | Both in parallel | Most venues |

Service requests on Basic go to all active staff (no zones).

**Escalation (ADR-0007, 0009):** an order still pending after 2 min (configurable), or with no ack within 15 s, triggers:
- a second sound;
- a push to managers on duty;
- a `notification_incidents` row.

## Station display (Premium, Phase 3)
- Each product is linked to a station (restaurant-defined: Bar, Kitchen, Pastry…).
- Mixed orders are split: the bar sees drinks, the kitchen sees dishes.
- The station marks each item Ready. The order becomes Ready when all items are.
- Large format readable at 2 m, works on a TV browser.

## Notifications (ADR-0022)
- **App open:** a distinct sound per event type (new order, waiter call, bill) + vibration.
- **Background or locked:** Web Push. iPhone requires installing the PWA to the home screen (iOS ≥ 16.4); onboarding guides this step.
- **Wake Lock** on fixed devices (iOS home-screen apps from 18.4).
- Every rendered event is **acked** to the server (delivery tracking).

## Transport (ADR-0016)
Staff mutations go through Route Handlers `/api/staff/*` with idempotency keys. They're safe to retry and to queue offline (offline queue: Phase 2).

## Design intent
"Glanceable": readable from 1 m (2 m for stations), huge table numbers (display tokens 56–96 px), bold status colours, touch targets ≥ 48 px, usable one-handed, zero decoration.
