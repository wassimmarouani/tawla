# ADR-0008 — Realtime: private Broadcast channels fed by the database, lazy client connections

- Status: Accepted — verified by spike P0-08 (2026-10-13)
- Date: 2026-10-11
- Audit refs: D2, D3, D4, spec §11.4–11.5

## Context

- **Public** Realtime channels let any client _send_ messages. A public `restaurant:{id}:menu` channel would let anyone broadcast a fake "product unavailable" to every customer of a café.
- Supabase recommends Broadcast for scale and security. Postgres Changes is meant for "quick testing" and a "low amount of connected users".
- Customers are anonymous. Supabase anonymous sign-in is limited to 30 per hour per IP by default, and a whole café shares one Wi-Fi IP.
- Supabase Pro includes 500 concurrent Realtime connections with the spend cap on, 10,000 with it off, then $10 per 1,000 peak connections.
- Realtime Authorization uses RLS on `realtime.messages`. Each policy covers one action: SELECT is receive, INSERT is send. Docs only show `to authenticated`, but the Realtime server sets the role from the JWT `role` claim without restricting it, so `to anon` policies should apply. **This is inferred from source code and must be verified.**

## Decision

1. **Private channels only.** "Allow public access" is turned **off** in Realtime settings.
2. **No `postgres_changes`.** Events are published by `after insert/update` triggers calling `realtime.send(payload, event, topic, private => true)`. Payloads are minimal: ids, status, version, table number. Clients refetch details over HTTP when needed.
3. **Topics:**

| Topic                                  | Who can receive (SELECT policy)                                                             | Events                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `r:{restaurantId}:orders`              | counter / manager / owner of that restaurant                                                | `order.created`, `order.updated`                                     |
| `r:{restaurantId}:zone:{zoneId}`       | waiters assigned to the zone today, plus all waiters when the zone is unassigned (ADR-0007) | `order.created`, `order.ready`, `request.created`, `request.claimed` |
| `r:{restaurantId}:station:{stationId}` | station role on that station (Phase 3)                                                      | `items.to_prepare`, `item.updated`                                   |
| `r:{restaurantId}:requests`            | all active staff of the restaurant (Phase 1, Basic)                                         | `request.created`, `request.claimed`, `request.done`                 |
| `s:{tableSessionPublicId}`             | **anon**, where the topic holds a 128-bit random public id (capability)                     | `order.status_changed`, `request.handled`, `session.closed`          |
| `m:{restaurantPublicId}`               | **anon**                                                                                    | `product.availability_changed`, `menu.updated`                       |

4. **No INSERT policy on `realtime.messages`** for anon or authenticated. Clients can never send. Only DB triggers publish (via `realtime.send`, security definer).
5. **Customer connection strategy (D4):** the customer menu doesn't open a WebSocket on load.
   - Availability comes with the page and is refreshed on `visibilitychange`/focus and before adding to the cart.
   - The `m:` channel opens after the first interaction (opening a product sheet) and closes after 2 min of inactivity.
   - The `s:` channel opens after an order or service request and stays open while the tracking UI is visible.
6. **Reliability (§11.5):**
   - every payload has `version`, and stale versions are ignored;
   - on (re)connect, clients refetch the full state over HTTP before applying events;
   - when the WebSocket has been down for more than 10 s, clients poll every 10 s.
7. **Spike P0-08** proves on local Supabase:
   - anon joins `m:`/`s:` private channels and receives messages;
   - anon cannot send;
   - a waiter can't read another zone's topic;
   - tenant B can't join tenant A's topics.

   **Fallback** if anon can't use private channels: anonymous sign-in for customers who actually order, with the per-IP limit raised in the Auth rate-limit settings.

## Consequences

- Clients can't spoof events. Tenant and zone isolation on Realtime is enforced by RLS and covered by tests.
- Connection costs stay bounded. The spend cap stays on until the pilots give real numbers.

## Sources

- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://github.com/supabase/realtime/blob/main/lib/realtime/tenants/authorization.ex

## Spike result — P0-08 (2026-10-13)

The design is **confirmed on local Supabase** with real WebSocket clients (`@supabase/supabase-js` 2.117.2). No fallback is needed.

- **Anonymous receive works on private channels:** an anon client joins `m:{restaurant public_id}` and receives database broadcasts. An unknown capability id is refused at join time.
- **Clients cannot spoof:** a client-sent broadcast on a private channel is never delivered. There is no INSERT policy on `realtime.messages`. A database broadcast sent right after it is delivered, which proves the listener was live.
- **Staff isolation holds:**
  - a waiter receives `r:{own restaurant}:requests`;
  - a waiter can't join another restaurant's topic or `r:{own}:orders`;
  - the counter can join `r:{own}:orders`;
  - anonymous clients never join `r:` topics.
- **One decision function:** `public.can_receive_topic(topic)` holds all the rules (security definer, reads `auth.jwt()`). It's covered by pgTAP (`supabase/tests/realtime_authorization.test.sql`) and by the end-to-end suite (`src/lib/realtime/realtime-authorization.int.test.ts`), which runs in CI.
- **Publisher:** `public.broadcast(topic, event, payload)` wraps `realtime.send(..., private => true)` and is not executable by clients.
- **Payload note:** `realtime.send` adds an `id` to the payload. Consumers must tolerate it and use `version` for ordering (§6).
- **To do in P1-09:** `s:{table session public_id}` topics, added with the `table_sessions` table.
