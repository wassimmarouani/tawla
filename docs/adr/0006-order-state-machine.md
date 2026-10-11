# ADR-0006 — Routing-aware order state machine with atomic transitions

- Status: Accepted
- Date: 2026-10-11
- Audit refs: A2, A3, A6, A7

## Context

- The spec says "six statuses" but lists seven. The diagram also mixes in "Addition clôturée", which is a table-session state.
- In "waiters only" routing, waiters can't change item status, so nobody can move an order from accepted to ready: a deadlock.
- Two staff members can act on the same order at the same moment.
- Ordering after a bill request, single-item cancellation and split payments are unspecified.

## Decision

1. **`order_status` enum (7 values):** `pending, accepted, preparing, ready, served, rejected, cancelled`. Terminal states: `served`, `rejected`, `cancelled`. Bill closure belongs to `table_sessions.status` (`open | bill_requested | closed`) and is never an order status.
2. **Transition table.** Implemented once as a pure function `transition(order, action, actor, ctx)` in `src/features/orders/services/state-machine.ts` (100 % covered), and mirrored by a `before update` trigger on `orders` that rejects illegal transitions:

| From → To | Allowed actors | Condition |
|---|---|---|
| ∅ → pending | client session, counter, waiter, manager, owner | valid session, restaurant open, `ordering` flag, products available |
| pending → accepted | counter, waiter (own zones; any zone when the zone has no waiter, ADR-0007), manager, owner | — |
| pending → rejected | same as accepted | reason required |
| pending → cancelled | the client who placed it; counter, manager, owner | — |
| accepted → preparing | counter, station, manager, owner | — |
| accepted → ready | counter, manager, owner | no active prep station (no `kitchen_display` flag) |
| preparing → ready | automatic when all items are ready; counter, manager, owner | — |
| accepted/preparing → cancelled | counter, manager, owner | reason required, audited |
| ready → served | waiter, counter, manager, owner | — |
| **accepted → served** | waiter, counter, manager, owner | **only in routing mode `waiters_only`, or when no counter device has started a service today** (resolves A3) |

3. **Atomicity:** each transition is a conditional update: `update orders set status=$to, version=version+1, … where id=$id and status=$from returning *`. Zero rows returned means the stable error `ORDER_STATE_CONFLICT`, and the UI shows "already handled by X". The same pattern applies to claiming service requests (`open → claimed`).
4. Every transition writes `order_events (from_status, to_status, actor_membership_id | client_session_id, reason)` in the same transaction.
5. **Phase 2 rules (recorded now to avoid rework):**
   - an order created while the session is `bill_requested` moves the session back to `open`;
   - staff can cancel a single item before it's `ready`, with a reason; order totals are recomputed and the event is logged;
   - no split payments: closing records `payment_method` and a `total_snapshot` only (we are not a POS; spec §2.3).

## Consequences

- No deadlock in any routing mode. Concurrency conflicts are explicit and visible in the UI.
- Business rules live in TS and are tested. The trigger is a safety net against bugs and direct SQL.
